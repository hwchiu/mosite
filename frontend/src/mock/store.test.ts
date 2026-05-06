import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db_getDashboardSummary, db_listClusters, db_updateCluster, resetDB } from './store';

async function resolveAfterDelay<T>(promise: Promise<T>): Promise<T> {
  await vi.advanceTimersByTimeAsync(200);
  return promise;
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

  it('returns clusters with derived current statuses even when persisted statuses are stale', async () => {
    await resolveAfterDelay(db_updateCluster('c1', { status: 'PO' }));

    const clusters = await resolveAfterDelay(db_listClusters());

    expect(clusters.find((cluster) => cluster.name === 'F1-K8S-Prod')?.status).toBe('sipd');
  });

  it('counts dashboard cards from derived statuses instead of persisted status fields', async () => {
    await resolveAfterDelay(db_updateCluster('c1', { status: 'PO' }));

    const summary = await resolveAfterDelay(db_getDashboardSummary());

    expect(summary.status_counts).toEqual({
      PO: 14,
      server_movein: 4,
      infra: 4,
      cpld: 0,
      sipd: 4,
    });
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
    expect(updated.status).toBe('server_movein');
  });
});
