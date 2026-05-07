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
  const raw = localStorage.getItem('mosite_mock_db_v7');
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
  localStorage.setItem('mosite_mock_db_v7', JSON.stringify(db));
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
    overwritePersistedClusterStatus('c2', 'purchase');
    const { db_listClusters } = await importFreshStore();

    const clusters = await resolveAfterDelay(db_listClusters());

    expect(clusters.find((cluster) => cluster.name === 'F1-VM-Infra')?.status).toBe('movein');
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
      operations: [
        {
          type: 'init',
          phases: [
            { phase: 'purchase', date: '2026-04-02', status: 'completed' },
            { phase: 'movein', date: '2026-04-30', status: 'in_progress' },
            { phase: 'infra', date: '2026-05-07', status: 'estimated' },
          ],
        },
      ],
    });
    expect(localStorage.getItem('mosite_mock_db_v7')).toContain('legacy-c1');
    expect(localStorage.getItem('mosite_mock_db_v7')).not.toContain('completionWeek');
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
    expect(created.operations![0].phases?.map((phase) => phase.phase)).toEqual([
      'purchase',
      'movein',
      'infra',
      'cluster',
      'platform',
      'release',
    ]);
    expect(created.operations![0].phases?.find((phase) => phase.phase === 'infra')?.status).toBe('in_progress');
    expect(created.operations![0].phases?.find((phase) => phase.phase === 'cluster')?.status).toBe('estimated');

    const reloaded = await resolveAfterDelay(db_getCluster(created.id));

    expect(reloaded.status).toBe('infra');
    expect(reloaded.operations![0].phases?.find((phase) => phase.phase === 'infra')?.status).toBe('in_progress');
    expect(reloaded.operations![0].phases?.find((phase) => phase.phase === 'cluster')?.status).toBe('estimated');
  });

  it('keeps status-only updates stable across later reads by translating them into schedule changes', async () => {
    const { db_getCluster, db_updateCluster } = await importFreshStore();

    const updated = await resolveAfterDelay(db_updateCluster('c1', { status: 'purchase' }));

    expect(updated.status).toBe('purchase');
    expect(updated.operations!.at(-1)!.phases?.find((phase) => phase.phase === 'purchase')?.status).toBe('in_progress');
    expect(updated.operations!.at(-1)!.phases?.find((phase) => phase.phase === 'movein')?.status).toBe('estimated');

    const reloaded = await resolveAfterDelay(db_getCluster('c1'));

    expect(reloaded.status).toBe('purchase');
    expect(reloaded.operations!.at(-1)!.phases?.find((phase) => phase.phase === 'purchase')?.status).toBe('in_progress');
    expect(reloaded.operations!.at(-1)!.phases?.find((phase) => phase.phase === 'movein')?.status).toBe('estimated');
  });

  it('clears stale blocked phase flags when a status-only update advances a blocked cluster', async () => {
    const { db_getCluster, db_updateCluster } = await importFreshStore();

    const updated = await resolveAfterDelay(db_updateCluster('c19', { status: 'infra' }));

    expect(updated.status).toBe('infra');
    expect(updated.operations![0].phases?.find((phase) => phase.phase === 'movein')?.status).toBe('completed');
    expect(updated.operations![0].phases?.find((phase) => phase.phase === 'infra')?.status).toBe('in_progress');
    expect(updated.operations![0].phases?.some((phase) => phase.status === 'blocked')).toBe(false);

    const reloaded = await resolveAfterDelay(db_getCluster('c19'));

    expect(reloaded.status).toBe('infra');
    expect(reloaded.operations![0].phases?.find((phase) => phase.phase === 'movein')?.status).toBe('completed');
    expect(reloaded.operations![0].phases?.find((phase) => phase.phase === 'infra')?.status).toBe('in_progress');
    expect(reloaded.operations![0].phases?.some((phase) => phase.status === 'blocked')).toBe(false);
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

    expect(updated.operations![0].phases?.map((phase) => phase.phase)).toEqual(['purchase', 'movein', 'infra']);
    expect(updated.operations![0].phases?.map((phase) => phase.status)).toEqual(['completed', 'in_progress', 'estimated']);
    expect(updated.status).toBe('movein');

    const reloaded = await resolveAfterDelay(db_getCluster('c3'));

    expect(reloaded.operations![0].phases?.map((phase) => phase.status)).toEqual(['completed', 'in_progress', 'estimated']);
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
    expect(after.operations![0].phases).toEqual(before.operations![0].phases);
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
    expect(updated.operations![0].phases?.map((phase) => phase.phase)).toEqual([
      'purchase',
      'movein',
      'infra',
      'cluster',
      'platform',
      'release',
    ]);
    expect(updated.operations![0].phases?.find((phase) => phase.phase === 'infra')?.status).toBe('completed');
    expect(updated.operations![0].phases?.find((phase) => phase.phase === 'cluster')?.status).toBe('in_progress');
    expect(updated.operations![0].phases?.find((phase) => phase.phase === 'platform')?.status).toBe('estimated');

    const reloaded = await resolveAfterDelay(db_getCluster('c3'));

    expect(reloaded.status).toBe('cluster');
    expect(reloaded.operations![0].phases?.map((phase) => phase.phase)).toEqual([
      'purchase',
      'movein',
      'infra',
      'cluster',
      'platform',
      'release',
    ]);
    expect(reloaded.operations![0].phases?.find((phase) => phase.phase === 'cluster')?.status).toBe('in_progress');
    expect(reloaded.operations![0].phases?.find((phase) => phase.phase === 'platform')?.status).toBe('estimated');
  });
});

describe('v5 → v6 migration: phases → operations', () => {
  function persistV5DB(db: {
    factories: Array<{ id: string; name: string; created_at: string }>;
    clusters: Array<Record<string, unknown>>;
  }) {
    localStorage.setItem('mosite_mock_db_v5', JSON.stringify(db));
  }

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    vi.resetModules();
  });

  it('wraps legacy flat phases into an init operation', async () => {
    persistV5DB({
      factories: [{ id: 'f1', name: 'F1', created_at: '2025-01-01T00:00:00Z' }],
      clusters: [
        {
          id: 'c1',
          name: 'F1-K8S-Prod',
          type: 'k8s',
          factory_id: 'f1',
          factory_name: 'F1',
          status: 'release',
          phases: [
            { phase: 'purchase', date: '2026-01-22' },
            { phase: 'movein',   date: '2026-02-05' },
            { phase: 'infra',    date: '2026-03-05' },
            { phase: 'cluster',  date: '2026-03-19' },
            { phase: 'platform', date: '2026-04-02' },
            { phase: 'release',  date: '2026-04-16' },
          ],
          created_at: '2025-01-20T08:00:00Z',
        },
      ],
    });

    const { db_getCluster } = await importFreshStore();
    const cluster = await resolveAfterDelay(db_getCluster('c1'));

    expect(cluster.operations).toHaveLength(1);
    expect(cluster.operations![0].type).toBe('init');
    expect(cluster.operations![0].phases).toHaveLength(6);
    expect(cluster.phases).toBeUndefined();
    expect(localStorage.getItem('mosite_mock_db_v7')).toContain('c1');
    expect(localStorage.getItem('mosite_mock_db_v5')).toBeNull();
  });

  it('keeps clusters that already have operations and no phases unchanged', async () => {
    persistV5DB({
      factories: [{ id: 'f1', name: 'F1', created_at: '2025-01-01T00:00:00Z' }],
      clusters: [
        {
          id: 'c1',
          name: 'F1-K8S-Prod',
          type: 'k8s',
          factory_id: 'f1',
          factory_name: 'F1',
          operations: [
            {
              id: 'op1',
              type: 'init',
              phases: [
                { phase: 'purchase', date: '2026-01-22' },
                { phase: 'release',  date: '2026-04-16' },
              ],
              created_at: '2025-01-20T08:00:00Z',
            },
          ],
          created_at: '2025-01-20T08:00:00Z',
        },
      ],
    });

    const { db_getCluster } = await importFreshStore();
    const cluster = await resolveAfterDelay(db_getCluster('c1'));

    expect(cluster.operations).toHaveLength(1);
    expect(cluster.operations![0].id).toBe('op1');
  });
});

describe('operation CRUD', () => {
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

  it('db_addOperation adds an expansion to an existing cluster', async () => {
    const { db_addOperation, db_getCluster } = await importFreshStore();

    const cluster = await resolveAfterDelay(db_getCluster('c1'));
    const initialOpCount = cluster.operations!.length;

    const updated = await resolveAfterDelay(
      db_addOperation('c1', {
        type: 'expansion',
        label: 'Expansion #1',
        phases: [
          { phase: 'purchase', date: '2026-05-10' },
          { phase: 'movein',   date: '2026-05-17' },
          { phase: 'infra',    date: '2026-05-24' },
          { phase: 'cluster',  date: '2026-05-31' },
          { phase: 'release',  date: '2026-06-07' },
        ],
      }),
    );

    expect(updated.operations!.length).toBe(initialOpCount + 1);
    const added = updated.operations![updated.operations!.length - 1];
    expect(added.type).toBe('expansion');
    expect(added.label).toBe('Expansion #1');
    expect(added.id).toBeDefined();
    expect(added.created_at).toBeDefined();
  });

  it('db_addOperation rejects a second init operation', async () => {
    const { db_addOperation } = await importFreshStore();

    await expect(
      db_addOperation('c1', {
        type: 'init',
        phases: [
          { phase: 'purchase', date: '2026-05-10' },
          { phase: 'movein',   date: '2026-05-17' },
          { phase: 'infra',    date: '2026-05-24' },
          { phase: 'cluster',  date: '2026-05-31' },
          { phase: 'platform', date: '2026-06-07' },
          { phase: 'release',  date: '2026-06-14' },
        ],
      }),
    ).rejects.toThrow('Cluster already has an init operation');
  });

  it('db_updateOperation updates phases of an existing operation', async () => {
    const { db_updateOperation, db_getCluster } = await importFreshStore();

    const cluster = await resolveAfterDelay(db_getCluster('c1'));
    const opId = cluster.operations![0].id;

    const updated = await resolveAfterDelay(
      db_updateOperation('c1', opId, [
        { phase: 'purchase', date: '2026-01-22' },
        { phase: 'movein',   date: '2026-02-05' },
        { phase: 'infra',    date: '2026-03-05' },
        { phase: 'cluster',  date: '2026-03-19' },
        { phase: 'platform', date: '2026-04-02' },
        { phase: 'release',  date: '2026-05-01' },
      ]),
    );

    const op = updated.operations!.find(o => o.id === opId)!;
    expect(op.phases.find(p => p.phase === 'release')!.date).toBe('2026-05-01');
  });

  it('db_deleteOperation removes a non-init operation', async () => {
    const { db_addOperation, db_deleteOperation, db_getCluster } = await importFreshStore();

    await resolveAfterDelay(
      db_addOperation('c1', {
        type: 'expansion',
        phases: [
          { phase: 'purchase', date: '2026-05-10' },
          { phase: 'movein',   date: '2026-05-17' },
          { phase: 'infra',    date: '2026-05-24' },
          { phase: 'cluster',  date: '2026-05-31' },
          { phase: 'release',  date: '2026-06-07' },
        ],
      }),
    );

    const cluster = await resolveAfterDelay(db_getCluster('c1'));
    const expOp = cluster.operations!.find(o => o.type === 'expansion')!;
    const countBefore = cluster.operations!.length;

    await resolveAfterDelay(db_deleteOperation('c1', expOp.id));

    const after = await resolveAfterDelay(db_getCluster('c1'));
    expect(after.operations!.length).toBe(countBefore - 1);
  });

  it('db_deleteOperation rejects deletion of the init operation', async () => {
    const { db_deleteOperation, db_getCluster } = await importFreshStore();

    const cluster = await resolveAfterDelay(db_getCluster('c1'));
    const initOp = cluster.operations!.find(o => o.type === 'init')!;

    await expect(
      db_deleteOperation('c1', initOp.id),
    ).rejects.toThrow('Cannot delete the init operation');
  });
});

describe('reschedule note CRUD', () => {
  let clusterId: string;
  let opId: string;

  beforeEach(async () => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T00:00:00Z'));
    const store = await importFreshStore();
    store.resetDB();
    await vi.advanceTimersByTimeAsync(200);
    const clusters = await resolveAfterDelay(store.db_listClusters());
    const cluster = clusters.find(c => c.operations && c.operations.length > 0)!;
    clusterId = cluster.id;
    opId = cluster.operations![0].id;
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    vi.resetModules();
  });

  it('adds a note with today date', async () => {
    const store = await importFreshStore();
    const note = await resolveAfterDelay(store.db_addRescheduleNote(clusterId, opId, 'Shipment delayed'));
    expect(note.id).toBeTruthy();
    expect(note.date).toBe('2026-05-06'); // fixed test date from test-setup.ts
    expect(note.note).toBe('Shipment delayed');
  });

  it('updates an existing note text', async () => {
    const store = await importFreshStore();
    const created = await resolveAfterDelay(store.db_addRescheduleNote(clusterId, opId, 'Original'));
    const updated = await resolveAfterDelay(store.db_updateRescheduleNote(clusterId, opId, created.id, 'Updated reason'));
    expect(updated.note).toBe('Updated reason');
    expect(updated.id).toBe(created.id);
  });

  it('deletes a note by id', async () => {
    const store = await importFreshStore();
    const created = await resolveAfterDelay(store.db_addRescheduleNote(clusterId, opId, 'To be deleted'));
    await resolveAfterDelay(store.db_deleteRescheduleNote(clusterId, opId, created.id));
    const clusters = await resolveAfterDelay(store.db_listClusters());
    const cluster = clusters.find(c => c.id === clusterId)!;
    const op = cluster.operations!.find(o => o.id === opId)!;
    expect((op.reschedule_notes ?? []).find(n => n.id === created.id)).toBeUndefined();
  });
});
