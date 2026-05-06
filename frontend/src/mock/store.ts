import type { Factory, Cluster, ClusterPhase, DashboardSummary, ClusterStatus, PhaseStatus } from '../types';
import { deriveClusterStatus, isoWeekToDate, validatePhaseDates } from '../timeline/utils';
import { SEED_FACTORIES, SEED_CLUSTERS } from './seed';

const LS_KEY = 'mosite_mock_db_v5';
const LEGACY_LS_KEY = 'mosite_mock_db_v4';
const PHASE_ORDER: ClusterStatus[] = ['purchase', 'movein', 'infra', 'cluster', 'platform', 'release'];
const COMPATIBILITY_PHASE_GAP_DAYS = 14;

interface MockDB {
  factories: Factory[];
  clusters: Cluster[];
}

type LegacyClusterPhase = Omit<ClusterPhase, 'date'> & {
  date?: string;
  completionWeek?: string;
};

type LegacyCluster = Omit<Cluster, 'phases'> & {
  phases?: LegacyClusterPhase[];
};

interface LegacyMockDB {
  factories: Factory[];
  clusters: LegacyCluster[];
}

function comparePhasesBySchedule(a: ClusterPhase, b: ClusterPhase): number {
  const dateComparison = a.date.localeCompare(b.date);
  if (dateComparison !== 0) {
    return dateComparison;
  }

  return PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase);
}

function hydratePhaseStatuses(phases: ClusterPhase[], today = new Date()): ClusterPhase[] {
  const sorted = [...phases].sort(comparePhasesBySchedule);
  const todayKey = today.toISOString().slice(0, 10);
  const currentPhase = deriveClusterStatus(sorted, today);
  const finalPhase = sorted[sorted.length - 1];
  const activePhase =
    finalPhase && todayKey > finalPhase.date && finalPhase.status !== 'blocked' ? null : currentPhase;

  return sorted.map((phase) => {
    let status: PhaseStatus;
    if (phase.status === 'blocked') {
      status = 'blocked';
    } else if (phase.date > todayKey) {
      status = 'estimated';
    } else if (phase.phase === activePhase) {
      status = 'in_progress';
    } else {
      status = 'completed';
    }

    return {
      ...phase,
      status,
    };
  });
}

function shiftISODate(date: string, deltaDays: number): string {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + deltaDays);
  return shifted.toISOString().slice(0, 10);
}

function buildCompatibilitySchedule(
  phases: ClusterPhase[] | undefined,
  today = new Date(),
): ClusterPhase[] {
  if (!phases?.length) {
    return PHASE_ORDER.map((phase, index) => ({
      phase,
      date: shiftISODate(today.toISOString().slice(0, 10), index * COMPATIBILITY_PHASE_GAP_DAYS),
    }));
  }

  const orderedPhases = [...phases].sort(
    (a, b) => PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase),
  );
  const explicitByPhase = new Map(orderedPhases.map((phase) => [phase.phase, phase] as const));
  const dates = PHASE_ORDER.map((phase) => explicitByPhase.get(phase)?.date);
  const knownIndexes = dates.flatMap((date, index) => (date ? [index] : []));

  if (!knownIndexes.length) {
    return PHASE_ORDER.map((phase, index) => ({
      phase,
      date: shiftISODate(today.toISOString().slice(0, 10), index * COMPATIBILITY_PHASE_GAP_DAYS),
    }));
  }

  const firstKnownIndex = knownIndexes[0];
  for (let index = firstKnownIndex - 1; index >= 0; index--) {
    dates[index] = shiftISODate(dates[index + 1]!, -COMPATIBILITY_PHASE_GAP_DAYS);
  }

  for (let knownIndex = 0; knownIndex < knownIndexes.length - 1; knownIndex++) {
    const startIndex = knownIndexes[knownIndex];
    const endIndex = knownIndexes[knownIndex + 1];
    if (endIndex - startIndex <= 1) {
      continue;
    }

    const startDate = dates[startIndex]!;
    const startUtc = new Date(`${startDate}T00:00:00Z`);
    const endUtc = new Date(`${dates[endIndex]!}T00:00:00Z`);
    const totalDays = Math.round((endUtc.getTime() - startUtc.getTime()) / 86400000);
    const totalSteps = endIndex - startIndex;

    for (let offset = 1; offset < totalSteps; offset++) {
      dates[startIndex + offset] = shiftISODate(startDate, Math.round((totalDays * offset) / totalSteps));
    }
  }

  const lastKnownIndex = knownIndexes[knownIndexes.length - 1];
  for (let index = lastKnownIndex + 1; index < PHASE_ORDER.length; index++) {
    dates[index] = shiftISODate(dates[index - 1]!, COMPATIBILITY_PHASE_GAP_DAYS);
  }

  return PHASE_ORDER.map((phase, index) => ({
    ...explicitByPhase.get(phase),
    phase,
    date: dates[index]!,
  }));
}

function translateStatusUpdateToSchedule(
  phases: ClusterPhase[] | undefined,
  status: ClusterStatus,
  today = new Date(),
): ClusterPhase[] | undefined {
  const basePhases = buildCompatibilitySchedule(phases, today);

  const sorted = [...basePhases].sort(comparePhasesBySchedule);
  const targetPhase = sorted.find((phase) => phase.phase === status);
  if (!targetPhase) {
    return sorted;
  }

  const todayUtc = new Date(`${today.toISOString().slice(0, 10)}T00:00:00Z`);
  const targetUtc = new Date(`${targetPhase.date}T00:00:00Z`);
  const deltaDays = Math.round((todayUtc.getTime() - targetUtc.getTime()) / 86400000);

  return sorted.map((phase) => {
    const phaseWithoutStatus = { ...phase };
    delete phaseWithoutStatus.status;

    return {
      ...phaseWithoutStatus,
      date: shiftISODate(phase.date, deltaDays),
    };
  });
}

function hydrateCluster(cluster: Cluster): Cluster {
  const phases = hydratePhaseStatuses(cluster.phases ?? []);

  return {
    ...cluster,
    phases,
    status: phases.length ? deriveClusterStatus(phases) : cluster.status ?? 'purchase',
  };
}

function uuid(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

function delay<T>(value: T, ms = 120): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms));
}

function parsePersistedDB<T>(raw: string | null): T | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function migrateLegacyPhase(phase: LegacyClusterPhase): ClusterPhase {
  const { completionWeek, date, ...rest } = phase;
  if (date) {
    return {
      ...rest,
      date,
    };
  }

  if (!completionWeek) {
    throw new Error(`Invalid legacy phase data: phase ${rest.phase} has neither date nor completionWeek`);
  }

  return {
    ...rest,
    date: isoWeekToDate(completionWeek),
  };
}

function migrateLegacyCluster(cluster: LegacyCluster): Cluster {
  return {
    ...cluster,
    phases: cluster.phases?.map(migrateLegacyPhase),
  };
}

function migrateLegacyDB(): MockDB | null {
  const legacy = parsePersistedDB<LegacyMockDB>(localStorage.getItem(LEGACY_LS_KEY));
  if (!legacy) {
    return null;
  }

  const migrated: MockDB = {
    factories: legacy.factories,
    clusters: legacy.clusters.map(migrateLegacyCluster),
  };

  saveDB(migrated);
  localStorage.removeItem(LEGACY_LS_KEY);
  return migrated;
}

function assertValidPhaseOrdering(phases: ClusterPhase[] | undefined): void {
  if (!phases?.length) {
    return;
  }

  const [error] = Object.values(validatePhaseDates(phases));
  if (error) {
    throw new Error(error);
  }
}

function loadDB(): MockDB {
  const current = parsePersistedDB<MockDB>(localStorage.getItem(LS_KEY));
  if (current) {
    return current;
  }

  const migrated = migrateLegacyDB();
  if (migrated) {
    return migrated;
  }

  return {
    factories: structuredClone(SEED_FACTORIES),
    clusters: structuredClone(SEED_CLUSTERS),
  };
}

function saveDB(db: MockDB): void {
  localStorage.setItem(LS_KEY, JSON.stringify(db));
}

let _db: MockDB | null = null;

function getDB(): MockDB {
  if (!_db) _db = loadDB();
  return _db;
}

function mutate(fn: (db: MockDB) => void): void {
  const db = getDB();
  fn(db);
  saveDB(db);
}

export function resetDB(): void {
  _db = {
    factories: structuredClone(SEED_FACTORIES),
    clusters: structuredClone(SEED_CLUSTERS),
  };
  saveDB(_db);
}

// ── Factories ────────────────────────────────────────────────────────────────

export async function db_listFactories(): Promise<Factory[]> {
  return delay([...getDB().factories]);
}

export async function db_createFactory(name: string): Promise<Factory> {
  const db = getDB();
  if (db.factories.find(f => f.name === name)) {
    throw new Error(`Factory "${name}" already exists`);
  }
  const factory: Factory = { id: uuid(), name, created_at: now() };
  mutate(d => d.factories.push(factory));
  return delay({ ...factory });
}

export async function db_deleteFactory(id: string): Promise<void> {
  const db = getDB();
  if (db.clusters.find(c => c.factory_id === id)) {
    throw new Error('Cannot delete factory: clusters are referencing it');
  }
  mutate(d => { d.factories = d.factories.filter(f => f.id !== id); });
  return delay(undefined);
}

// ── Clusters ─────────────────────────────────────────────────────────────────

export async function db_listClusters(factory_id?: string, type?: string): Promise<Cluster[]> {
  let list = getDB().clusters.map(hydrateCluster);
  if (factory_id) list = list.filter(c => c.factory_id === factory_id);
  if (type) list = list.filter(c => c.type === type);
  return delay(list);
}

export async function db_createCluster(data: Omit<Cluster, 'id' | 'created_at' | 'factory_name'>): Promise<Cluster> {
  const db = getDB();
  const factory = db.factories.find(f => f.id === data.factory_id);
  if (!factory) throw new Error('Factory not found');
  const phases = data.status && !data.phases ? translateStatusUpdateToSchedule(undefined, data.status) : data.phases;
  assertValidPhaseOrdering(phases);
  const cluster: Cluster = {
    ...data,
    phases,
    id: uuid(),
    factory_name: factory.name,
    created_at: now(),
  };
  mutate(d => d.clusters.push(cluster));
  return delay(hydrateCluster({ ...cluster }));
}

export async function db_getCluster(id: string): Promise<Cluster> {
  const cluster = getDB().clusters.find(c => c.id === id);
  if (!cluster) throw new Error('Cluster not found');
  return delay(hydrateCluster({ ...cluster }));
}

export async function db_updateCluster(
  id: string,
  data: Partial<Pick<Cluster, 'name' | 'description' | 'status' | 'factory_id' | 'type' | 'phases'>>
): Promise<Cluster> {
  let updated: Cluster | undefined;
  mutate(d => {
    const c = d.clusters.find(x => x.id === id);
    if (!c) throw new Error('Cluster not found');
    const nextCluster: Cluster = { ...c, ...data };
    if (data.status && !data.phases) {
      nextCluster.phases = translateStatusUpdateToSchedule(c.phases, data.status);
    }
    if (data.factory_id) {
      const factory = d.factories.find(f => f.id === data.factory_id);
      if (factory) nextCluster.factory_name = factory.name;
    }
    assertValidPhaseOrdering(nextCluster.phases);
    Object.assign(c, nextCluster);
    updated = hydrateCluster({ ...c });
  });
  return delay(updated!);
}

export async function db_deleteCluster(id: string): Promise<void> {
  mutate(d => { d.clusters = d.clusters.filter(c => c.id !== id); });
  return delay(undefined);
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function db_getDashboardSummary(): Promise<DashboardSummary> {
  const clusters = getDB().clusters.map(hydrateCluster);
  const statuses: ClusterStatus[] = ['purchase', 'movein', 'infra', 'cluster', 'platform', 'release'];
  const status_counts = Object.fromEntries(
    statuses.map(s => [s, clusters.filter(c => c.status === s).length])
  ) as Record<ClusterStatus, number>;
  return delay({ status_counts, total: clusters.length });
}

export function db_getTimelineClusters(): Promise<Cluster[]> {
  return delay(getDB().clusters.map(hydrateCluster));
}
