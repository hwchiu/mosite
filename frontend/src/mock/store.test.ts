import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db_getCluster, db_getDashboardSummary, db_listClusters, db_updateCluster, resetDB } from './store';

async function resolveAfterDelay<T>(promise: Promise<T>): Promise<T> {
  await vi.advanceTimersByTimeAsync(200);
  return promise;
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
  beforeEach(() => {
    localStorage.clear();
    resetDB();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    resetDB();
  });

  it('returns clusters with derived current statuses even when persisted status fields are stale', async () => {
    overwritePersistedClusterStatus('c1', 'PO');

    const clusters = await resolveAfterDelay(db_listClusters());

    expect(clusters.find((cluster) => cluster.name === 'F1-K8S-Prod')?.status).toBe('sipd');
  });

  it('counts dashboard cards from derived statuses instead of stale persisted status fields', async () => {
    overwritePersistedClusterStatus('c1', 'PO');

    const summary = await resolveAfterDelay(db_getDashboardSummary());

    expect(summary.status_counts).toEqual({
      PO: 14,
      server_movein: 4,
      infra: 4,
      cpld: 0,
      sipd: 4,
    });
  });

  it('keeps status-only updates stable across later reads by translating them into schedule changes', async () => {
    const updated = await resolveAfterDelay(db_updateCluster('c1', { status: 'PO' }));

    expect(updated.status).toBe('PO');
    expect(updated.phases?.find((phase) => phase.phase === 'PO')?.status).toBe('in_progress');
    expect(updated.phases?.find((phase) => phase.phase === 'server_movein')?.status).toBe('estimated');

    const reloaded = await resolveAfterDelay(db_getCluster('c1'));

    expect(reloaded.status).toBe('PO');
    expect(reloaded.phases?.find((phase) => phase.phase === 'PO')?.status).toBe('in_progress');
    expect(reloaded.phases?.find((phase) => phase.phase === 'server_movein')?.status).toBe('estimated');
  });

  it('accepts phase updates and normalizes the returned cluster from phase dates', async () => {
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
});
