import type { Factory, Cluster, PurchaseBatch, Server, ServerDetail, AuditLog } from '../types';
import { SEED_FACTORIES, SEED_CLUSTERS, SEED_BATCHES, SEED_SERVERS } from './seed';

const LS_KEY = 'mosite_mock_db';

interface MockDB {
  factories: Factory[];
  clusters: Cluster[];
  batches: PurchaseBatch[];
  servers: ServerDetail[];
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
    batches: structuredClone(SEED_BATCHES),
    servers: structuredClone(SEED_SERVERS),
  };
}

function saveDB(db: MockDB): void {
  localStorage.setItem(LS_KEY, JSON.stringify(db));
}

function getDB(): MockDB {
  if (!_db) _db = loadDB();
  return _db;
}

let _db: MockDB | null = null;

function mutate(fn: (db: MockDB) => void): void {
  const db = getDB();
  fn(db);
  saveDB(db);
}

export function resetDB(): void {
  _db = {
    factories: structuredClone(SEED_FACTORIES),
    clusters: structuredClone(SEED_CLUSTERS),
    batches: structuredClone(SEED_BATCHES),
    servers: structuredClone(SEED_SERVERS),
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
  if (db.servers.find(s => s.factory_id === id)) {
    throw new Error('Cannot delete factory: servers are referencing it');
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

export async function db_updateCluster(id: string, data: Partial<Pick<Cluster, 'name' | 'description'>>): Promise<Cluster> {
  let updated: Cluster | undefined;
  mutate(d => {
    const c = d.clusters.find(x => x.id === id);
    if (!c) throw new Error('Cluster not found');
    Object.assign(c, data);
    updated = { ...c };
  });
  return delay(updated!);
}

export async function db_deleteCluster(id: string): Promise<void> {
  const db = getDB();
  if (db.servers.find(s => s.cluster_id === id)) {
    throw new Error('Cannot delete cluster: servers are assigned to it');
  }
  mutate(d => { d.clusters = d.clusters.filter(c => c.id !== id); });
  return delay(undefined);
}

// ── Batches ──────────────────────────────────────────────────────────────────

export async function db_listBatches(factory_id?: string): Promise<PurchaseBatch[]> {
  let list = [...getDB().batches];
  if (factory_id) list = list.filter(b => b.factory_id === factory_id);
  return delay(list.map(b => ({
    ...b,
    server_count: getDB().servers.filter(s => s.batch_id === b.id).length,
  })));
}

export async function db_createBatch(data: Omit<PurchaseBatch, 'id' | 'created_at' | 'factory_name' | 'server_count'>): Promise<PurchaseBatch> {
  const db = getDB();
  const factory = data.factory_id ? db.factories.find(f => f.id === data.factory_id) : undefined;
  const batch: PurchaseBatch = {
    ...data,
    id: uuid(),
    factory_name: factory?.name,
    server_count: 0,
    created_at: now(),
  };
  mutate(d => d.batches.push(batch));
  return delay({ ...batch });
}

export async function db_getBatch(id: string): Promise<PurchaseBatch> {
  const batch = getDB().batches.find(b => b.id === id);
  if (!batch) throw new Error('Batch not found');
  return delay({
    ...batch,
    server_count: getDB().servers.filter(s => s.batch_id === id).length,
  });
}

export async function db_updateBatch(id: string, data: Partial<Pick<PurchaseBatch, 'name' | 'notes'>>): Promise<PurchaseBatch> {
  let updated: PurchaseBatch | undefined;
  mutate(d => {
    const b = d.batches.find(x => x.id === id);
    if (!b) throw new Error('Batch not found');
    Object.assign(b, data);
    updated = { ...b };
  });
  return delay(updated!);
}

// ── Servers ──────────────────────────────────────────────────────────────────

export interface ServerListParams {
  factory_id?: string;
  status?: string;
  model?: string;
  service_type?: string;
  cluster_id?: string;
  batch_id?: string;
  search?: string;
}

export async function db_listServers(params: ServerListParams = {}): Promise<Server[]> {
  let list: Server[] = getDB().servers.map(s => ({ ...s }));
  if (params.factory_id) list = list.filter(s => s.factory_id === params.factory_id);
  if (params.status) list = list.filter(s => s.status === params.status);
  if (params.model) list = list.filter(s => s.model === params.model);
  if (params.service_type) list = list.filter(s => s.service_type === params.service_type);
  if (params.cluster_id) list = list.filter(s => s.cluster_id === params.cluster_id);
  if (params.batch_id) list = list.filter(s => s.batch_id === params.batch_id);
  if (params.search) {
    const q = params.search.toLowerCase();
    list = list.filter(s =>
      s.hostname.toLowerCase().includes(q) ||
      s.serial_number.toLowerCase().includes(q) ||
      (s.ip_address ?? '').toLowerCase().includes(q)
    );
  }
  return delay(list);
}

export async function db_createServer(data: Omit<Server, 'id' | 'created_at' | 'updated_at' | 'factory_name' | 'cluster_name' | 'batch_name'>): Promise<Server> {
  const db = getDB();
  if (db.servers.find(s => s.serial_number === data.serial_number)) {
    throw new Error(`Serial number "${data.serial_number}" already exists`);
  }
  const factory = db.factories.find(f => f.id === data.factory_id);
  const cluster = data.cluster_id ? db.clusters.find(c => c.id === data.cluster_id) : undefined;
  const batch = data.batch_id ? db.batches.find(b => b.id === data.batch_id) : undefined;
  const server: ServerDetail = {
    ...data,
    id: uuid(),
    factory_name: factory?.name,
    cluster_name: cluster?.name,
    batch_name: batch?.name,
    created_at: now(),
    updated_at: now(),
    audit_logs: [],
  };
  mutate(d => d.servers.push(server));
  return delay({ ...server });
}

export async function db_bulkCreateServers(items: Omit<Server, 'id' | 'created_at' | 'updated_at' | 'factory_name' | 'cluster_name' | 'batch_name'>[]): Promise<Server[]> {
  const results: Server[] = [];
  for (const item of items) {
    results.push(await db_createServer(item));
  }
  return results;
}

export async function db_getServer(id: string): Promise<ServerDetail> {
  const s = getDB().servers.find(x => x.id === id);
  if (!s) throw new Error('Server not found');
  return delay(structuredClone(s));
}

export async function db_updateServer(
  id: string,
  data: Partial<Server> & { operator?: string; comment?: string }
): Promise<Server> {
  const db = getDB();
  const server = db.servers.find(s => s.id === id);
  if (!server) throw new Error('Server not found');

  const { operator, comment, ...fields } = data;
  const auditEntries: AuditLog[] = [];
  const ts = now();

  for (const [key, newVal] of Object.entries(fields)) {
    const oldVal = (server as unknown as Record<string, unknown>)[key];
    if (oldVal !== newVal && operator) {
      auditEntries.push({
        id: uuid(),
        server_id: id,
        operator,
        field: key,
        old_value: oldVal != null ? String(oldVal) : undefined,
        new_value: newVal != null ? String(newVal) : undefined,
        comment: comment,
        created_at: ts,
      });
    }
  }

  if (fields.cluster_id !== undefined) {
    const cluster = fields.cluster_id ? db.clusters.find(c => c.id === fields.cluster_id) : undefined;
    fields.cluster_name = cluster?.name;
  }

  let updated: Server | undefined;
  mutate(d => {
    const s = d.servers.find(x => x.id === id);
    if (!s) return;
    Object.assign(s, fields, { updated_at: ts });
    s.audit_logs = [...auditEntries.reverse(), ...s.audit_logs];
    updated = { ...s };
  });
  return delay(updated!);
}

export async function db_transitionStatus(
  id: string,
  status: string,
  operator: string,
  comment?: string
): Promise<Server> {
  return db_updateServer(id, { status: status as Server['status'], operator, comment });
}

export async function db_deleteServer(id: string, operator: string, comment?: string): Promise<void> {
  await db_updateServer(id, { status: 'retired', operator, comment: comment ?? 'Server retired' });
  return delay(undefined);
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

import type { DashboardSummary, FactoryBreakdown, ClusterUsage } from '../types';
import type { ServerStatus } from '../types';

const ALL_STATUSES: ServerStatus[] = ['purchased','waiting_infra','waiting_cluster_setup','waiting_platform','active','retired'];

function zeroStatusCounts(): Record<ServerStatus, number> {
  return Object.fromEntries(ALL_STATUSES.map(s => [s, 0])) as Record<ServerStatus, number>;
}

export async function db_getDashboardSummary(): Promise<DashboardSummary> {
  const servers = getDB().servers;
  const status_counts = zeroStatusCounts();
  for (const s of servers) status_counts[s.status]++;
  return delay({ status_counts, total: servers.length });
}

export async function db_getByFactory(): Promise<FactoryBreakdown[]> {
  const db = getDB();
  return delay(db.factories.map(f => {
    const status_counts = zeroStatusCounts();
    const factoryServers = db.servers.filter(s => s.factory_id === f.id);
    for (const s of factoryServers) status_counts[s.status]++;
    return { factory_id: f.id, factory_name: f.name, status_counts, total: factoryServers.length };
  }));
}

export async function db_getByCluster(): Promise<ClusterUsage[]> {
  const db = getDB();
  return delay(db.clusters.map(c => {
    const clusterServers = db.servers.filter(s => s.cluster_id === c.id);
    const active = clusterServers.filter(s => s.status === 'active').length;
    const available = clusterServers.filter(s => s.status !== 'active' && s.status !== 'retired').length;
    const factory = db.factories.find(f => f.id === c.factory_id);
    return {
      cluster_id: c.id,
      cluster_name: c.name,
      cluster_type: c.type,
      factory_name: factory?.name ?? '',
      total_servers: clusterServers.length,
      active_count: active,
      available_count: available,
    };
  }));
}

export async function db_getModelBreakdown(): Promise<{ model: string; count: number }[]> {
  const servers = getDB().servers;
  const counts: Record<string, number> = { model_1: 0, model_2: 0, model_3: 0 };
  for (const s of servers) counts[s.model]++;
  return delay(Object.entries(counts).map(([model, count]) => ({ model, count })));
}

export async function db_getServiceBreakdown(): Promise<{ service_type: string; count: number }[]> {
  const servers = getDB().servers;
  const counts: Record<string, number> = { k8s: 0, vm: 0 };
  for (const s of servers) counts[s.service_type]++;
  return delay(Object.entries(counts).map(([service_type, count]) => ({ service_type, count })));
}

export function db_getTimelineClusters(): Promise<Cluster[]> {
  return delay(getDB().clusters);
}
