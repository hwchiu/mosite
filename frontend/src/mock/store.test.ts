import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function resolveAfterDelay<T>(promise: Promise<T>): Promise<T> {
  await vi.advanceTimersByTimeAsync(200);
  return promise;
}

async function importFreshStore() {
  vi.resetModules();
  return import('./store');
}

function persistLegacyDB(db: {
  factories: Array<{ id: string; name: string; created_at: string }>;
  clusters: Array<Record<string, unknown>>;
}) {
  localStorage.setItem('mosite_mock_db_v4', JSON.stringify(db));
}

function overwritePersistedClusterStatus(id: string, status: 'purchase' | 'movein' | 'infra' | 'cluster' | 'platform') {
  const raw = localStorage.getItem('mosite_mock_db_v5');
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
  localStorage.setItem('mosite_mock_db_v5', JSON.stringify(db));
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
    overwritePersistedClusterStatus('c1', 'purchase');
    const { db_listClusters } = await importFreshStore();

    const clusters = await resolveAfterDelay(db_listClusters());

    expect(clusters.find((cluster) => cluster.name === 'F1-K8S-Prod')?.status).toBe('release');
  });

  it('counts dashboard cards from derived statuses instead of stale persisted status fields', async () => {
    overwritePersistedClusterStatus('c1', 'purchase');
    const { db_getDashboardSummary } = await importFreshStore();

    const summary = await resolveAfterDelay(db_getDashboardSummary());

    expect(Object.keys(summary.status_counts)).toEqual(
      expect.arrayContaining(['purchase', 'movein', 'infra', 'cluster', 'platform', 'release']),
    );
    // total should still be 26 (c1 derived from phases, not stale stored status)
    expect(summary.total).toBe(26);
  });

  it('migrates persisted v3 completionWeek phases into readable date phases before falling back to seeds', async () => {
    localStorage.clear();
    vi.resetModules();
    persistLegacyDB({
      factories: [{ id: 'legacy-f1', name: 'Legacy Factory', created_at: '2025-01-01T00:00:00Z' }],
      clusters: [
        {
          id: 'legacy-c1',
          name: 'Legacy Cluster',
          type: 'k8s',
          factory_id: 'legacy-f1',
          factory_name: 'Legacy Factory',
          status: 'infra',
          phases: [
            { phase: 'purchase', completionWeek: '2026-W14', status: 'completed' },
            { phase: 'movein', completionWeek: '2026-W18', status: 'completed' },
            { phase: 'infra', completionWeek: '2026-W19', status: 'estimated' },
          ],
          created_at: '2025-01-02T00:00:00Z',
        },
      ],
    });

    const { db_listFactories, db_getCluster } = await importFreshStore();

    await expect(resolveAfterDelay(db_listFactories())).resolves.toEqual([
      {
        id: 'legacy-f1',
        name: 'Legacy Factory',
        created_at: '2025-01-01T00:00:00Z',
      },
    ]);
    await expect(resolveAfterDelay(db_getCluster('legacy-c1'))).resolves.toMatchObject({
      id: 'legacy-c1',
      name: 'Legacy Cluster',
      factory_id: 'legacy-f1',
      status: 'movein',
      phases: [
        { phase: 'purchase', date: '2026-04-02', status: 'completed' },
        { phase: 'movein', date: '2026-04-30', status: 'in_progress' },
        { phase: 'infra', date: '2026-05-07', status: 'estimated' },
      ],
    });
    expect(localStorage.getItem('mosite_mock_db_v5')).toContain('legacy-c1');
    expect(localStorage.getItem('mosite_mock_db_v5')).not.toContain('completionWeek');
    expect(localStorage.getItem('mosite_mock_db_v4')).toBeNull();
  });

  it('rejects malformed v3 phases that have neither date nor completionWeek', async () => {
    localStorage.clear();
    vi.resetModules();
    persistLegacyDB({
      factories: [{ id: 'legacy-f1', name: 'Legacy Factory', created_at: '2025-01-01T00:00:00Z' }],
      clusters: [
        {
          id: 'legacy-c1',
          name: 'Legacy Cluster',
          type: 'k8s',
          factory_id: 'legacy-f1',
          phases: [{ phase: 'purchase', status: 'completed' }],
          created_at: '2025-01-02T00:00:00Z',
        },
      ],
    });

    const { db_listClusters } = await importFreshStore();

    await expect(db_listClusters()).rejects.toThrow(
      'Invalid legacy phase data: phase purchase has neither date nor completionWeek',
    );
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
      'purchase',
      'movein',
      'infra',
      'cluster',
      'platform',
      'release',
    ]);
    expect(created.phases?.find((phase) => phase.phase === 'infra')?.status).toBe('in_progress');
    expect(created.phases?.find((phase) => phase.phase === 'cluster')?.status).toBe('estimated');

    const reloaded = await resolveAfterDelay(db_getCluster(created.id));

    expect(reloaded.status).toBe('infra');
    expect(reloaded.phases?.find((phase) => phase.phase === 'infra')?.status).toBe('in_progress');
    expect(reloaded.phases?.find((phase) => phase.phase === 'cluster')?.status).toBe('estimated');
  });

  it('keeps status-only updates stable across later reads by translating them into schedule changes', async () => {
    const { db_getCluster, db_updateCluster } = await importFreshStore();

    const updated = await resolveAfterDelay(db_updateCluster('c1', { status: 'purchase' }));

    expect(updated.status).toBe('purchase');
    expect(updated.phases?.find((phase) => phase.phase === 'purchase')?.status).toBe('in_progress');
    expect(updated.phases?.find((phase) => phase.phase === 'movein')?.status).toBe('estimated');

    const reloaded = await resolveAfterDelay(db_getCluster('c1'));

    expect(reloaded.status).toBe('purchase');
    expect(reloaded.phases?.find((phase) => phase.phase === 'purchase')?.status).toBe('in_progress');
    expect(reloaded.phases?.find((phase) => phase.phase === 'movein')?.status).toBe('estimated');
  });

  it('clears stale blocked phase flags when a status-only update advances a blocked cluster', async () => {
    const { db_getCluster, db_updateCluster } = await importFreshStore();

    const updated = await resolveAfterDelay(db_updateCluster('c19', { status: 'infra' }));

    expect(updated.status).toBe('infra');
    expect(updated.phases?.find((phase) => phase.phase === 'movein')?.status).toBe('completed');
    expect(updated.phases?.find((phase) => phase.phase === 'infra')?.status).toBe('in_progress');
    expect(updated.phases?.some((phase) => phase.status === 'blocked')).toBe(false);

    const reloaded = await resolveAfterDelay(db_getCluster('c19'));

    expect(reloaded.status).toBe('infra');
    expect(reloaded.phases?.find((phase) => phase.phase === 'movein')?.status).toBe('completed');
    expect(reloaded.phases?.find((phase) => phase.phase === 'infra')?.status).toBe('in_progress');
    expect(reloaded.phases?.some((phase) => phase.status === 'blocked')).toBe(false);
  });

  it('accepts phase updates and normalizes the returned cluster from phase dates', async () => {
    const { db_getCluster, db_updateCluster } = await importFreshStore();

    const updated = await resolveAfterDelay(
      db_updateCluster('c3', {
        phases: [
          { phase: 'infra', date: '2026-05-09' },
          { phase: 'purchase', date: '2026-05-01' },
          { phase: 'movein', date: '2026-05-05' },
        ],
      }),
    );

    expect(updated.phases?.map((phase) => phase.phase)).toEqual(['purchase', 'movein', 'infra']);
    expect(updated.phases?.map((phase) => phase.status)).toEqual(['completed', 'in_progress', 'estimated']);
    expect(updated.status).toBe('movein');

    const reloaded = await resolveAfterDelay(db_getCluster('c3'));

    expect(reloaded.phases?.map((phase) => phase.status)).toEqual(['completed', 'in_progress', 'estimated']);
  });

  it('rejects creating a cluster whose milestone dates move backward', async () => {
    const { db_createCluster, db_listClusters } = await importFreshStore();

    await expect(
      db_createCluster({
        name: 'F1-K8S-OutOfOrder',
        type: 'k8s',
        factory_id: 'f1',
        phases: [
          { phase: 'purchase', date: '2026-05-06' },
          { phase: 'movein', date: '2026-05-05' },
        ],
      }),
    ).rejects.toThrow('Move-In date must be on or after Purchase date.');

    expect(
      (await resolveAfterDelay(db_listClusters())).some((cluster) => cluster.name === 'F1-K8S-OutOfOrder'),
    ).toBe(false);
  });

  it('rejects updating a cluster whose milestone dates move backward', async () => {
    const { db_getCluster, db_updateCluster } = await importFreshStore();
    const before = await resolveAfterDelay(db_getCluster('c3'));

    await expect(
      db_updateCluster('c3', {
        phases: [
          { phase: 'purchase', date: '2026-05-06' },
          { phase: 'movein', date: '2026-05-05' },
        ],
      }),
    ).rejects.toThrow('Move-In date must be on or after Purchase date.');

    const after = await resolveAfterDelay(db_getCluster('c3'));
    expect(after.phases).toEqual(before.phases);
  });

  it('extends partial schedules when a later status-only update targets a missing phase', async () => {
    const { db_getCluster, db_updateCluster } = await importFreshStore();

    await resolveAfterDelay(
      db_updateCluster('c3', {
        phases: [
          { phase: 'purchase', date: '2026-05-01' },
          { phase: 'movein', date: '2026-05-05' },
        ],
      }),
    );

    const updated = await resolveAfterDelay(db_updateCluster('c3', { status: 'cluster' }));

    expect(updated.status).toBe('cluster');
    expect(updated.phases?.map((phase) => phase.phase)).toEqual([
      'purchase',
      'movein',
      'infra',
      'cluster',
      'platform',
      'release',
    ]);
    expect(updated.phases?.find((phase) => phase.phase === 'infra')?.status).toBe('completed');
    expect(updated.phases?.find((phase) => phase.phase === 'cluster')?.status).toBe('in_progress');
    expect(updated.phases?.find((phase) => phase.phase === 'platform')?.status).toBe('estimated');

    const reloaded = await resolveAfterDelay(db_getCluster('c3'));

    expect(reloaded.status).toBe('cluster');
    expect(reloaded.phases?.map((phase) => phase.phase)).toEqual([
      'purchase',
      'movein',
      'infra',
      'cluster',
      'platform',
      'release',
    ]);
    expect(reloaded.phases?.find((phase) => phase.phase === 'cluster')?.status).toBe('in_progress');
    expect(reloaded.phases?.find((phase) => phase.phase === 'platform')?.status).toBe('estimated');
  });
});
