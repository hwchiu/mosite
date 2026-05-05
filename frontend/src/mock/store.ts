import type { Factory, Cluster, DashboardSummary, ClusterStatus } from '../types';
import { SEED_FACTORIES, SEED_CLUSTERS } from './seed';

const LS_KEY = 'mosite_mock_db_v3';

interface MockDB {
  factories: Factory[];
  clusters: Cluster[];
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

function loadDB(): MockDB {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as MockDB;
  } catch {
    // ignore
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
  let list = [...getDB().clusters];
  if (factory_id) list = list.filter(c => c.factory_id === factory_id);
  if (type) list = list.filter(c => c.type === type);
  return delay(list);
}

export async function db_createCluster(data: Omit<Cluster, 'id' | 'created_at' | 'factory_name'>): Promise<Cluster> {
  const db = getDB();
  const factory = db.factories.find(f => f.id === data.factory_id);
  if (!factory) throw new Error('Factory not found');
  const cluster: Cluster = { ...data, id: uuid(), factory_name: factory.name, created_at: now() };
  mutate(d => d.clusters.push(cluster));
  return delay({ ...cluster });
}

export async function db_getCluster(id: string): Promise<Cluster> {
  const cluster = getDB().clusters.find(c => c.id === id);
  if (!cluster) throw new Error('Cluster not found');
  return delay({ ...cluster });
}

export async function db_updateCluster(
  id: string,
  data: Partial<Pick<Cluster, 'name' | 'description' | 'status' | 'factory_id' | 'type'>>
): Promise<Cluster> {
  let updated: Cluster | undefined;
  mutate(d => {
    const c = d.clusters.find(x => x.id === id);
    if (!c) throw new Error('Cluster not found');
    Object.assign(c, data);
    if (data.factory_id) {
      const factory = d.factories.find(f => f.id === data.factory_id);
      if (factory) c.factory_name = factory.name;
    }
    updated = { ...c };
  });
  return delay(updated!);
}

export async function db_deleteCluster(id: string): Promise<void> {
  mutate(d => { d.clusters = d.clusters.filter(c => c.id !== id); });
  return delay(undefined);
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function db_getDashboardSummary(): Promise<DashboardSummary> {
  const db = getDB();
  const statuses: ClusterStatus[] = ['PO', 'server_movein', 'infra', 'cpld', 'sipd'];
  const status_counts = Object.fromEntries(
    statuses.map(s => [s, db.clusters.filter(c => c.status === s).length])
  ) as Record<ClusterStatus, number>;
  return delay({ status_counts, total: db.clusters.length });
}

export function db_getTimelineClusters(): Promise<Cluster[]> {
  return delay(getDB().clusters);
}
