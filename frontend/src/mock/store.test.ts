import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function resolveAfterDelay<T>(promise: Promise<T>): Promise<T> {
  await vi.advanceTimersByTimeAsync(200);
  return promise;
}

async function importFreshStore() {
  vi.resetModules();
  return import('./store');
}

function overwritePersistedClusterStatus(id: string, status: 'PO' | 'server_movein' | 'infra' | 'cpld' | 'sipd') {
  const raw = localStorage.getItem('mosite_mock_db_v4');
  if (!raw) {
    throw new Error('mock db missing');
  }

  const db = JSON.parse(raw) as {
    factories: Array<{ id: string }>;
    clusters: Array<{ id: string; status?: string }>;
  };
  const cluster = db.clusters.find((entry) => entry.id === id);
  if (!cluster) {
    throw new Error(`cluster ${id} missing`);
  }

  cluster.status = status;
  localStorage.setItem('mosite_mock_db_v4', JSON.stringify(db));
}

describe('mock store derived schedule', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T00:00:00Z'));
    const { resetDB } = await importFreshStore();
    resetDB();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    vi.resetModules();
  });

  it('returns clusters with derived current statuses after reloading stale persisted status fields from localStorage', async () => {
    overwritePersistedClusterStatus('c1', 'PO');
    const { db_listClusters } = await importFreshStore();

    const clusters = await resolveAfterDelay(db_listClusters());

    expect(clusters.find((cluster) => cluster.name === 'F1-K8S-Prod')?.status).toBe('sipd');
  });

  it('counts dashboard cards from derived statuses instead of stale persisted status fields', async () => {
    overwritePersistedClusterStatus('c1', 'PO');
    const { db_getDashboardSummary } = await importFreshStore();

    const summary = await resolveAfterDelay(db_getDashboardSummary());

    expect(summary.status_counts).toEqual({
      PO: 14,
      server_movein: 4,
      infra: 4,
      cpld: 0,
      sipd: 4,
    });
  });

  it('creates a usable derived schedule for status-only cluster payloads', async () => {
    const { db_createCluster, db_getCluster } = await importFreshStore();

    const created = await resolveAfterDelay(
      db_createCluster({
        name: 'F1-K8S-New',
        type: 'k8s',
        factory_id: 'f1',
        status: 'infra',
      }),
    );

    expect(created.status).toBe('infra');
    expect(created.phases?.map((phase) => phase.phase)).toEqual([
      'PO',
      'server_movein',
      'infra',
      'cpld',
      'sipd',
    ]);
    expect(created.phases?.find((phase) => phase.phase === 'infra')?.status).toBe('in_progress');
    expect(created.phases?.find((phase) => phase.phase === 'cpld')?.status).toBe('estimated');

    const reloaded = await resolveAfterDelay(db_getCluster(created.id));

    expect(reloaded.status).toBe('infra');
    expect(reloaded.phases?.find((phase) => phase.phase === 'infra')?.status).toBe('in_progress');
    expect(reloaded.phases?.find((phase) => phase.phase === 'cpld')?.status).toBe('estimated');
  });

  it('keeps status-only updates stable across later reads by translating them into schedule changes', async () => {
    const { db_getCluster, db_updateCluster } = await importFreshStore();

    const updated = await resolveAfterDelay(db_updateCluster('c1', { status: 'PO' }));

    expect(updated.status).toBe('PO');
    expect(updated.phases?.find((phase) => phase.phase === 'PO')?.status).toBe('in_progress');
    expect(updated.phases?.find((phase) => phase.phase === 'server_movein')?.status).toBe('estimated');

    const reloaded = await resolveAfterDelay(db_getCluster('c1'));

    expect(reloaded.status).toBe('PO');
    expect(reloaded.phases?.find((phase) => phase.phase === 'PO')?.status).toBe('in_progress');
    expect(reloaded.phases?.find((phase) => phase.phase === 'server_movein')?.status).toBe('estimated');
  });

  it('clears stale blocked phase flags when a status-only update advances a blocked cluster', async () => {
    const { db_getCluster, db_updateCluster } = await importFreshStore();

    const updated = await resolveAfterDelay(db_updateCluster('c19', { status: 'infra' }));

    expect(updated.status).toBe('infra');
    expect(updated.phases?.find((phase) => phase.phase === 'server_movein')?.status).toBe('completed');
    expect(updated.phases?.find((phase) => phase.phase === 'infra')?.status).toBe('in_progress');
    expect(updated.phases?.some((phase) => phase.status === 'blocked')).toBe(false);

    const reloaded = await resolveAfterDelay(db_getCluster('c19'));

    expect(reloaded.status).toBe('infra');
    expect(reloaded.phases?.find((phase) => phase.phase === 'server_movein')?.status).toBe('completed');
    expect(reloaded.phases?.find((phase) => phase.phase === 'infra')?.status).toBe('in_progress');
    expect(reloaded.phases?.some((phase) => phase.status === 'blocked')).toBe(false);
  });

  it('accepts phase updates and normalizes the returned cluster from phase dates', async () => {
    const { db_getCluster, db_updateCluster } = await importFreshStore();

    const updated = await resolveAfterDelay(
      db_updateCluster('c3', {
        phases: [
          { phase: 'infra', date: '2026-05-09' },
          { phase: 'PO', date: '2026-05-01' },
          { phase: 'server_movein', date: '2026-05-05' },
        ],
      }),
    );

    expect(updated.phases?.map((phase) => phase.phase)).toEqual(['PO', 'server_movein', 'infra']);
    expect(updated.phases?.map((phase) => phase.status)).toEqual(['completed', 'in_progress', 'estimated']);
    expect(updated.status).toBe('server_movein');

    const reloaded = await resolveAfterDelay(db_getCluster('c3'));

    expect(reloaded.phases?.map((phase) => phase.status)).toEqual(['completed', 'in_progress', 'estimated']);
  });

  it('extends partial schedules when a later status-only update targets a missing phase', async () => {
    const { db_getCluster, db_updateCluster } = await importFreshStore();

    await resolveAfterDelay(
      db_updateCluster('c3', {
        phases: [
          { phase: 'PO', date: '2026-05-01' },
          { phase: 'server_movein', date: '2026-05-05' },
        ],
      }),
    );

    const updated = await resolveAfterDelay(db_updateCluster('c3', { status: 'cpld' }));

    expect(updated.status).toBe('cpld');
    expect(updated.phases?.map((phase) => phase.phase)).toEqual([
      'PO',
      'server_movein',
      'infra',
      'cpld',
      'sipd',
    ]);
    expect(updated.phases?.find((phase) => phase.phase === 'infra')?.status).toBe('completed');
    expect(updated.phases?.find((phase) => phase.phase === 'cpld')?.status).toBe('in_progress');
    expect(updated.phases?.find((phase) => phase.phase === 'sipd')?.status).toBe('estimated');

    const reloaded = await resolveAfterDelay(db_getCluster('c3'));

    expect(reloaded.status).toBe('cpld');
    expect(reloaded.phases?.map((phase) => phase.phase)).toEqual([
      'PO',
      'server_movein',
      'infra',
      'cpld',
      'sipd',
    ]);
    expect(reloaded.phases?.find((phase) => phase.phase === 'cpld')?.status).toBe('in_progress');
    expect(reloaded.phases?.find((phase) => phase.phase === 'sipd')?.status).toBe('estimated');
  });
});
