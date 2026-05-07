# Cluster Operations (Option A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `ClusterOperation[]` model to each cluster so init (6-phase) and expansion (5-phase, no platform) operations are tracked independently, with collapsible UI on both Clusters and Timeline pages.

**Architecture:** Each `Cluster` gains an `operations` array replacing the flat `phases` field. Seed data migrates via a v5→v6 localStorage key bump. The Clusters page gets expandable rows showing per-operation cards; the Timeline gets collapsible parent/child rows (A2 design). The cluster's derived `status` always comes from the latest operation's phases.

**Tech Stack:** TypeScript, React, Vitest + @testing-library/react, localStorage mock DB, Vite

---

## File Map

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `OperationType`, `INIT_PHASES`, `EXPANSION_PHASES`, `ClusterOperation`; update `Cluster` |
| `src/mock/store.ts` | Bump LS_KEY v5→v6, add v5 migration, add `db_addOperation` / `db_updateOperation` / `db_deleteOperation`, update `hydrateCluster` |
| `src/mock/seed.ts` | Convert all 26 clusters `phases` → `operations[0]`; add expansion ops to c1, c6, c11, c16 |
| `src/api/clusters.ts` | Add `addOperation`, `updateOperation`, `deleteOperation` |
| `src/pages/Clusters.tsx` | Expandable rows; operations list; Add Expansion form (5-phase); init-only first create |
| `src/timeline/ClusterRow.tsx` | Collapsible parent + OperationRow children |
| `src/pages/Timeline.tsx` | `ClusterEditDrawer` gets operation selector; uses `operations` not raw `phases` |
| `src/timeline/FactoryGroup.tsx` | Read blocked/in_progress from operations instead of top-level phases |
| `src/timeline/TimelineToolbar.tsx` | Add operation-type filter (All / Init Only / Expansion Only) |
| `src/mock/store.test.ts` | Update LS key references v5→v6; add migration + CRUD tests |
| `src/pages/Clusters.test.tsx` | Update tests; add expansion creation test |

---

## Task 1: Types (`src/types/index.ts`)

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add new types and update `Cluster`**

Replace the entire file with:

```ts
export type ClusterStatus = 'purchase' | 'movein' | 'infra' | 'cluster' | 'platform' | 'release';

export type PhaseKey = ClusterStatus;

export type PhaseStatus = 'completed' | 'in_progress' | 'blocked' | 'estimated';

export interface ClusterPhase {
  phase: PhaseKey;
  date: string;
  status?: PhaseStatus;
  note?: string;
}

export type ClusterType = 'k8s' | 'vm';

export interface Factory {
  id: string;
  name: string;
  created_at: string;
}

export type OperationType = 'init' | 'expansion';

// Init uses all 6 phases; Expansion omits 'platform'
export const INIT_PHASES: PhaseKey[] = ['purchase', 'movein', 'infra', 'cluster', 'platform', 'release'];
export const EXPANSION_PHASES: PhaseKey[] = ['purchase', 'movein', 'infra', 'cluster', 'release'];

export interface ClusterOperation {
  id: string;
  type: OperationType;
  label?: string;
  phases: ClusterPhase[];
  created_at: string;
}

export interface Cluster {
  id: string;
  name: string;
  type: ClusterType;
  factory_id: string;
  factory_name?: string;
  description?: string;
  status?: ClusterStatus;
  created_at: string;
  serverCount?: number;
  operations?: ClusterOperation[];  // NEW — primary data
  phases?: ClusterPhase[];          // DEPRECATED — migration source only
}

export interface DashboardSummary {
  status_counts: Record<ClusterStatus, number>;
  total: number;
}
```

- [ ] **Step 2: Verify TypeScript compiles (types only)**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -40
```

Expected: errors only in files that haven't been updated yet (store.ts, etc.), NOT in types/index.ts itself.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add ClusterOperation types and INIT_PHASES/EXPANSION_PHASES constants"
```

---

## Task 2: Store — bump key, migration, CRUD, hydration

**Files:**
- Modify: `src/mock/store.ts`
- Test: `src/mock/store.test.ts`

### Step 2a: Write failing migration test first

- [ ] **Step 1: Write failing test for v5→v6 migration**

In `src/mock/store.test.ts`, add inside the top-level `describe` block (after the existing migration test), a new `describe` block:

```ts
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
    expect(localStorage.getItem('mosite_mock_db_v6')).toContain('c1');
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
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd frontend && npm test -- --run src/mock/store.test.ts 2>&1 | tail -30
```

Expected: test fails (v6 key doesn't exist yet, migration not implemented).

### Step 2b: Write failing CRUD tests

- [ ] **Step 3: Add failing tests for `db_addOperation`, `db_updateOperation`, `db_deleteOperation`**

Still in `src/mock/store.test.ts`, add another `describe` block:

```ts
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
      resolveAfterDelay(db_deleteOperation('c1', initOp.id)),
    ).rejects.toThrow('Cannot delete the init operation');
  });
});
```

- [ ] **Step 4: Run test to confirm new tests fail**

```bash
cd frontend && npm test -- --run src/mock/store.test.ts 2>&1 | tail -30
```

Expected: new tests fail (functions not exported yet).

### Step 2c: Implement store changes

- [ ] **Step 5: Update `src/mock/store.ts`**

Make the following targeted changes in order:

**5a.** Update the import at line 1 to include the new types:

```ts
import type { Factory, Cluster, ClusterPhase, ClusterOperation, OperationType, DashboardSummary, ClusterStatus, PhaseStatus } from '../types';
```

**5b.** Change the key constants (around line 5–6):

```ts
const LS_KEY = 'mosite_mock_db_v6';
const LEGACY_LS_KEY_V5 = 'mosite_mock_db_v5';
const LEGACY_LS_KEY_V4 = 'mosite_mock_db_v4';
```

**5c.** After the `LegacyMockDB` type (around line 27), add a type alias for the v5 DB (same shape as current `MockDB` but clusters have flat `phases`):

```ts
// v5 clusters still have flat phases (no operations)
type V5Cluster = Omit<Cluster, 'operations'> & { phases?: ClusterPhase[] };
interface V5MockDB {
  factories: Factory[];
  clusters: V5Cluster[];
}
```

**5d.** Update `hydrateCluster` (around line 159) to use operations:

```ts
function hydrateCluster(cluster: Cluster): Cluster {
  if (cluster.operations?.length) {
    const hydratedOps: ClusterOperation[] = cluster.operations.map(op => ({
      ...op,
      phases: hydratePhaseStatuses(op.phases),
    }));
    const latestOp = hydratedOps[hydratedOps.length - 1];
    const status = deriveClusterStatus(latestOp.phases);
    const { phases: _phases, ...rest } = cluster; // drop legacy phases field
    void _phases;
    return { ...rest, operations: hydratedOps, status };
  }
  // Fallback for clusters still using flat phases (during migration)
  const phases = hydratePhaseStatuses(cluster.phases ?? []);
  return {
    ...cluster,
    phases,
    status: phases.length ? deriveClusterStatus(phases) : cluster.status ?? 'purchase',
  };
}
```

**5e.** Add a v5→v6 migration function (just before `migrateLegacyDB`):

```ts
function migrateV5DB(): MockDB | null {
  const v5 = parsePersistedDB<V5MockDB>(localStorage.getItem(LEGACY_LS_KEY_V5));
  if (!v5) return null;

  const migrated: MockDB = {
    factories: v5.factories,
    clusters: v5.clusters.map((c): Cluster => {
      if (c.operations?.length) {
        // Already migrated (e.g. persisted v5 that already had operations)
        const { phases: _p, ...rest } = c as Cluster;
        void _p;
        return rest;
      }
      const { phases, ...rest } = c;
      return {
        ...rest,
        operations: [
          {
            id: uuid(),
            type: 'init',
            phases: phases ?? [],
            created_at: c.created_at,
          },
        ],
      };
    }),
  };

  saveDB(migrated);
  localStorage.removeItem(LEGACY_LS_KEY_V5);
  return migrated;
}
```

**5f.** Update `migrateLegacyDB` to also wrap migrated phases in an operation:

```ts
function migrateLegacyDB(): MockDB | null {
  const legacy = parsePersistedDB<LegacyMockDB>(localStorage.getItem(LEGACY_LS_KEY_V4));
  if (!legacy) return null;

  const migrated: MockDB = {
    factories: legacy.factories,
    clusters: legacy.clusters.map((c): Cluster => {
      const phases = c.phases?.map(migrateLegacyPhase);
      return {
        ...c,
        phases: undefined,
        operations: [
          {
            id: uuid(),
            type: 'init',
            phases: phases ?? [],
            created_at: c.created_at,
          },
        ],
      };
    }),
  };

  saveDB(migrated);
  localStorage.removeItem(LEGACY_LS_KEY_V4);
  return migrated;
}
```

**5g.** Update `loadDB` to try v5 migration before v4:

```ts
function loadDB(): MockDB {
  const current = parsePersistedDB<MockDB>(localStorage.getItem(LS_KEY));
  if (current) return current;

  const migratedV5 = migrateV5DB();
  if (migratedV5) return migratedV5;

  const migratedV4 = migrateLegacyDB();
  if (migratedV4) return migratedV4;

  return {
    factories: structuredClone(SEED_FACTORIES),
    clusters: structuredClone(SEED_CLUSTERS),
  };
}
```

**5h.** Update `db_createCluster` to wrap phases in an init operation:

```ts
export async function db_createCluster(data: Omit<Cluster, 'id' | 'created_at' | 'factory_name'>): Promise<Cluster> {
  const db = getDB();
  const factory = db.factories.find(f => f.id === data.factory_id);
  if (!factory) throw new Error('Factory not found');

  const created_at = now();

  let operations: ClusterOperation[];
  if (data.operations?.length) {
    operations = data.operations;
  } else {
    const phases = data.status && !data.phases
      ? translateStatusUpdateToSchedule(undefined, data.status)
      : data.phases ?? [];
    assertValidPhaseOrdering(phases);
    operations = [{ id: uuid(), type: 'init', phases: phases ?? [], created_at }];
  }

  const cluster: Cluster = {
    ...data,
    phases: undefined,
    operations,
    id: uuid(),
    factory_name: factory.name,
    created_at,
  };
  mutate(d => d.clusters.push(cluster));
  return delay(hydrateCluster({ ...cluster }));
}
```

**5i.** Update `db_updateCluster` to handle operations-based clusters (no direct phases update; phases live inside operations):

```ts
export async function db_updateCluster(
  id: string,
  data: Partial<Pick<Cluster, 'name' | 'description' | 'status' | 'factory_id' | 'type' | 'phases'>>
): Promise<Cluster> {
  let updated: Cluster | undefined;
  mutate(d => {
    const c = d.clusters.find(x => x.id === id);
    if (!c) throw new Error('Cluster not found');

    const nextCluster: Cluster = { ...c };

    if (data.name !== undefined) nextCluster.name = data.name;
    if (data.description !== undefined) nextCluster.description = data.description;
    if (data.type !== undefined) nextCluster.type = data.type;
    if (data.factory_id !== undefined) {
      const factory = d.factories.find(f => f.id === data.factory_id);
      if (factory) { nextCluster.factory_id = data.factory_id!; nextCluster.factory_name = factory.name; }
    }

    // Legacy path: direct phases update (updates init operation's phases)
    if (data.phases !== undefined) {
      const ops = nextCluster.operations ?? [];
      const initIdx = ops.findIndex(o => o.type === 'init');
      if (initIdx >= 0) {
        nextCluster.operations = ops.map((op, i) => i === initIdx ? { ...op, phases: data.phases! } : op);
      }
    } else if (data.status && !data.phases && nextCluster.operations?.length) {
      const ops = nextCluster.operations;
      const lastOp = ops[ops.length - 1];
      const updatedPhases = translateStatusUpdateToSchedule(lastOp.phases, data.status);
      nextCluster.operations = ops.map((op, i) =>
        i === ops.length - 1 ? { ...op, phases: updatedPhases ?? [] } : op
      );
    }

    Object.assign(c, nextCluster);
    updated = hydrateCluster({ ...c });
  });
  return delay(updated!);
}
```

**5j.** Add the three new exported CRUD functions at the end of the Clusters section (before the Dashboard section):

```ts
export interface AddOperationData {
  type: OperationType;
  label?: string;
  phases: ClusterPhase[];
}

export async function db_addOperation(clusterId: string, data: AddOperationData): Promise<Cluster> {
  let updated: Cluster | undefined;
  mutate(d => {
    const c = d.clusters.find(x => x.id === clusterId);
    if (!c) throw new Error('Cluster not found');
    if (data.type === 'init' && c.operations?.some(o => o.type === 'init')) {
      throw new Error('Cluster already has an init operation');
    }
    assertValidPhaseOrdering(data.phases);
    const op: ClusterOperation = {
      id: uuid(),
      type: data.type,
      label: data.label,
      phases: data.phases,
      created_at: now(),
    };
    c.operations = [...(c.operations ?? []), op];
    updated = hydrateCluster({ ...c });
  });
  return delay(updated!);
}

export async function db_updateOperation(
  clusterId: string,
  operationId: string,
  phases: ClusterPhase[],
): Promise<Cluster> {
  let updated: Cluster | undefined;
  mutate(d => {
    const c = d.clusters.find(x => x.id === clusterId);
    if (!c) throw new Error('Cluster not found');
    const opIdx = c.operations?.findIndex(o => o.id === operationId) ?? -1;
    if (opIdx < 0) throw new Error('Operation not found');
    assertValidPhaseOrdering(phases);
    c.operations = c.operations!.map((op, i) => i === opIdx ? { ...op, phases } : op);
    updated = hydrateCluster({ ...c });
  });
  return delay(updated!);
}

export async function db_deleteOperation(clusterId: string, operationId: string): Promise<void> {
  mutate(d => {
    const c = d.clusters.find(x => x.id === clusterId);
    if (!c) throw new Error('Cluster not found');
    const op = c.operations?.find(o => o.id === operationId);
    if (!op) throw new Error('Operation not found');
    if (op.type === 'init') throw new Error('Cannot delete the init operation');
    c.operations = c.operations!.filter(o => o.id !== operationId);
  });
  return delay(undefined);
}
```

- [ ] **Step 6: Run store tests**

```bash
cd frontend && npm test -- --run src/mock/store.test.ts 2>&1 | tail -50
```

Expected: All tests pass, including new migration and CRUD tests.

- [ ] **Step 7: Fix any existing store tests broken by the key change**

In `src/mock/store.test.ts`, update `overwritePersistedClusterStatus` to use the new key:

```ts
function overwritePersistedClusterStatus(id: string, status: 'purchase' | 'movein' | 'infra' | 'cluster' | 'platform') {
  const raw = localStorage.getItem('mosite_mock_db_v6');  // was v5
  if (!raw) throw new Error('mock db missing');
  // ... rest unchanged
  localStorage.setItem('mosite_mock_db_v6', JSON.stringify(db));  // was v5
}
```

Also update the test assertion at the end of the legacy migration test:

```ts
expect(localStorage.getItem('mosite_mock_db_v6')).toContain('legacy-c1');  // was v5
expect(localStorage.getItem('mosite_mock_db_v5')).toBeNull();              // was v4
```

And in the v4 legacy migration test, the assertion:
```ts
expect(localStorage.getItem('mosite_mock_db_v6')).toContain('legacy-c1');  // was v5
expect(localStorage.getItem('mosite_mock_db_v5')).toBeNull();              // was v4 (still v4→v6 path)
// Also: expect(localStorage.getItem('mosite_mock_db_v4')).toBeNull(); stays
```

- [ ] **Step 8: Run store tests again until all pass**

```bash
cd frontend && npm test -- --run src/mock/store.test.ts 2>&1 | tail -30
```

Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add src/mock/store.ts src/mock/store.test.ts
git commit -m "feat: bump store to v6, add operations migration and CRUD"
```

---

## Task 3: Seed Data (`src/mock/seed.ts`)

**Files:**
- Modify: `src/mock/seed.ts`

- [ ] **Step 1: Update seed import and convert all clusters to use `operations`**

At the top of `src/mock/seed.ts`, update the import:

```ts
import type { Factory, Cluster, ClusterOperation } from '../types';
import { isoWeekToDate } from '../timeline/utils';
```

Add a helper to build an init operation from a phases array:

```ts
function initOp(id: string, phases: Cluster['phases'], created_at: string): ClusterOperation {
  return {
    id: `${id}-op-init`,
    type: 'init',
    phases: phases ?? [],
    created_at,
  };
}
```

For each of the 26 clusters, replace the `phases: [...]` field with `operations: [initOp(id, [...], created_at)]`. Remove the top-level `phases` field.

Example transformation for c1:

```ts
{
  id: 'c1', name: 'F1-K8S-Prod', type: 'k8s',
  factory_id: 'f1', factory_name: 'F1', status: 'release',
  operations: [
    {
      id: 'c1-op-init',
      type: 'init',
      phases: [
        { phase: 'purchase', date: isoWeekToDate('2026-W04'), status: 'completed' },
        { phase: 'movein',   date: isoWeekToDate('2026-W06'), status: 'completed' },
        { phase: 'infra',    date: isoWeekToDate('2026-W10'), status: 'completed' },
        { phase: 'cluster',  date: isoWeekToDate('2026-W12'), status: 'completed' },
        { phase: 'platform', date: isoWeekToDate('2026-W14'), status: 'completed' },
        { phase: 'release',  date: isoWeekToDate('2026-W16'), status: 'completed' },
      ],
      created_at: '2025-01-20T08:00:00Z',
    },
  ],
  created_at: '2025-01-20T08:00:00Z',
},
```

Apply the same pattern for all 26 clusters. The phases content stays the same; only the wrapping changes.

- [ ] **Step 2: Add expansion operations to 4 clusters**

For c1 (F1-K8S-Prod, init release W16), add:

```ts
{
  id: 'c1-op-exp1',
  type: 'expansion',
  label: 'Expansion #1',
  phases: [
    { phase: 'purchase', date: isoWeekToDate('2026-W20'), status: 'completed' },
    { phase: 'movein',   date: isoWeekToDate('2026-W22'), status: 'completed' },
    { phase: 'infra',    date: isoWeekToDate('2026-W25'), status: 'in_progress' },
    { phase: 'cluster',  date: isoWeekToDate('2026-W28'), status: 'estimated' },
    { phase: 'release',  date: isoWeekToDate('2026-W30'), status: 'estimated' },
  ],
  created_at: '2026-04-20T08:00:00Z',
},
```

For c6 (F3-K8S-Prod-A, init release W20), add:

```ts
{
  id: 'c6-op-exp1',
  type: 'expansion',
  label: 'Expansion #1',
  phases: [
    { phase: 'purchase', date: isoWeekToDate('2026-W24'), status: 'completed' },
    { phase: 'movein',   date: isoWeekToDate('2026-W26'), status: 'in_progress' },
    { phase: 'infra',    date: isoWeekToDate('2026-W28'), status: 'estimated' },
    { phase: 'cluster',  date: isoWeekToDate('2026-W30'), status: 'estimated' },
    { phase: 'release',  date: isoWeekToDate('2026-W32'), status: 'estimated' },
  ],
  created_at: '2026-05-05T08:00:00Z',
},
```

For c11 (F5-K8S-Prod, init release W18), add two expansions:

```ts
{
  id: 'c11-op-exp1',
  type: 'expansion',
  label: 'Expansion #1',
  phases: [
    { phase: 'purchase', date: isoWeekToDate('2026-W22'), status: 'completed' },
    { phase: 'movein',   date: isoWeekToDate('2026-W24'), status: 'completed' },
    { phase: 'infra',    date: isoWeekToDate('2026-W26'), status: 'completed' },
    { phase: 'cluster',  date: isoWeekToDate('2026-W28'), status: 'estimated' },
    { phase: 'release',  date: isoWeekToDate('2026-W30'), status: 'estimated' },
  ],
  created_at: '2026-04-15T08:00:00Z',
},
{
  id: 'c11-op-exp2',
  type: 'expansion',
  label: 'Expansion #2',
  phases: [
    { phase: 'purchase', date: isoWeekToDate('2026-W32'), status: 'estimated' },
    { phase: 'movein',   date: isoWeekToDate('2026-W34'), status: 'estimated' },
    { phase: 'infra',    date: isoWeekToDate('2026-W36'), status: 'estimated' },
    { phase: 'cluster',  date: isoWeekToDate('2026-W38'), status: 'estimated' },
    { phase: 'release',  date: isoWeekToDate('2026-W40'), status: 'estimated' },
  ],
  created_at: '2026-05-01T08:00:00Z',
},
```

For c16 (F7-K8S-Prod-A, init release W19), add:

```ts
{
  id: 'c16-op-exp1',
  type: 'expansion',
  label: 'Expansion #1',
  phases: [
    { phase: 'purchase', date: isoWeekToDate('2026-W23'), status: 'completed' },
    { phase: 'movein',   date: isoWeekToDate('2026-W25'), status: 'in_progress' },
    { phase: 'infra',    date: isoWeekToDate('2026-W27'), status: 'estimated' },
    { phase: 'cluster',  date: isoWeekToDate('2026-W29'), status: 'estimated' },
    { phase: 'release',  date: isoWeekToDate('2026-W31'), status: 'estimated' },
  ],
  created_at: '2026-04-25T08:00:00Z',
},
```

Note: For clusters with expansions, also update the top-level `status` field to reflect the latest operation's current status. For c1 with an in-progress expansion: `status: 'infra'`. For c6 with movein in-progress: `status: 'movein'`. For c11 with cluster estimated: `status: 'cluster'`. For c16 with movein in-progress: `status: 'movein'`.

- [ ] **Step 3: Run the store tests to verify seed data loads correctly**

```bash
cd frontend && npm test -- --run src/mock/store.test.ts 2>&1 | tail -30
```

Expected: all pass. The store hydrates all 26 clusters without errors.

- [ ] **Step 4: Commit**

```bash
git add src/mock/seed.ts
git commit -m "feat: convert seed data to operations array, add 4 demo expansions"
```

---

## Task 4: API Layer (`src/api/clusters.ts`)

**Files:**
- Modify: `src/api/clusters.ts`

- [ ] **Step 1: Add new imports and functions**

```ts
import type { Cluster, ClusterPhase, ClusterType, ClusterOperation, OperationType } from '../types';
import {
  db_listClusters, db_createCluster, db_getCluster, db_updateCluster, db_deleteCluster,
  db_addOperation, db_updateOperation, db_deleteOperation,
  type AddOperationData,
} from '../mock/store';

// ... keep existing functions ...

export interface CreateOperationData {
  type: OperationType;
  label?: string;
  phases: ClusterPhase[];
}

export async function addOperation(clusterId: string, data: CreateOperationData): Promise<Cluster> {
  return db_addOperation(clusterId, data);
}

export async function updateOperation(
  clusterId: string,
  operationId: string,
  phases: ClusterPhase[],
): Promise<Cluster> {
  return db_updateOperation(clusterId, operationId, phases);
}

export async function deleteOperation(clusterId: string, operationId: string): Promise<void> {
  return db_deleteOperation(clusterId, operationId);
}
```

- [ ] **Step 2: Run build to verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors in `src/api/clusters.ts` or `src/types/index.ts`. There may still be errors in UI files not yet updated.

- [ ] **Step 3: Commit**

```bash
git add src/api/clusters.ts
git commit -m "feat: expose addOperation/updateOperation/deleteOperation in API layer"
```

---

## Task 5: Clusters Page (`src/pages/Clusters.tsx`)

**Files:**
- Modify: `src/pages/Clusters.tsx`
- Test: `src/pages/Clusters.test.tsx`

### Step 5a: Write failing UI tests first

- [ ] **Step 1: Add failing tests for expanded operations view and expansion creation**

In `src/pages/Clusters.test.tsx`, add a new `describe` block after the existing ones:

```tsx
describe('Cluster operations UI', () => {
  beforeEach(() => {
    localStorage.clear();
    resetDB();
  });

  afterEach(async () => {
    await waitForQueryClientsToSettle();
    for (const queryClient of queryClients) queryClient.clear();
    queryClients.length = 0;
    vi.restoreAllMocks();
  });

  it('shows operations when a cluster row is expanded', async () => {
    renderClusters();
    await screen.findByText('F1-K8S-Prod');

    // Click expand toggle on F1-K8S-Prod row
    const row = (await screen.findByText('F1-K8S-Prod')).closest('tr') as HTMLTableRowElement;
    fireEvent.click(within(row).getByTitle('Toggle operations'));

    // Should show the init operation
    expect(await screen.findByText('Init')).toBeInTheDocument();
  });

  it('create form always starts as init type with 6 phase inputs', async () => {
    renderClusters();
    await screen.findByText('F1-K8S-Prod');
    fireEvent.click(screen.getByRole('button', { name: 'Create Cluster' }));

    const form = getForm();
    // First operation type must be init (no choice)
    expect(form.querySelectorAll('input[type="date"]')).toHaveLength(6);
    // Platform phase must be present for init
    expect(form.querySelector('input[name="platform"]')).toBeInTheDocument();
  });

  it('Add Expansion button shows a 5-phase form without platform', async () => {
    renderClusters();
    await screen.findByText('F1-K8S-Prod');

    const row = (await screen.findByText('F1-K8S-Prod')).closest('tr') as HTMLTableRowElement;
    fireEvent.click(within(row).getByTitle('Toggle operations'));

    await clickAndWaitForQueryClientsToSettle(await screen.findByRole('button', { name: '+ Add Expansion' }));

    const form = getForm();
    expect(form.querySelectorAll('input[type="date"]')).toHaveLength(5);
    expect(form.querySelector('input[name="platform"]')).toBeNull();
  });

  it('creates an expansion operation and shows it in the operations list', async () => {
    renderClusters();
    await screen.findByText('F1-K8S-Prod');

    const row = (await screen.findByText('F1-K8S-Prod')).closest('tr') as HTMLTableRowElement;
    fireEvent.click(within(row).getByTitle('Toggle operations'));
    await clickAndWaitForQueryClientsToSettle(await screen.findByRole('button', { name: '+ Add Expansion' }));

    const form = getForm();
    setPhaseDate(form, 'purchase', '2026-06-01');
    setPhaseDate(form, 'movein',   '2026-06-08');
    setPhaseDate(form, 'infra',    '2026-06-15');
    setPhaseDate(form, 'cluster',  '2026-06-22');
    setPhaseDate(form, 'release',  '2026-06-29');
    fireEvent.click(within(form).getByRole('button', { name: 'Add Expansion' }));

    await waitFor(async () => {
      const updated = (await clustersApi.listClusters()).find(c => c.name === 'F1-K8S-Prod');
      expect(updated?.operations?.filter(o => o.type === 'expansion')).toHaveLength(2);
    });
  });
});
```

- [ ] **Step 2: Run test to confirm new tests fail**

```bash
cd frontend && npm test -- --run src/pages/Clusters.test.tsx 2>&1 | tail -30
```

Expected: new tests fail; existing tests may also fail due to type changes.

### Step 5b: Implement Clusters page changes

- [ ] **Step 3: Update `src/pages/Clusters.tsx`**

**3a.** Update imports at the top:

```ts
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, X, FilterX, ChevronRight, ChevronDown } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { listClusters, createCluster, updateCluster, deleteCluster, addOperation, updateOperation, deleteOperation } from '../api/clusters';
import { listFactories } from '../api/factories';
import { validatePhaseDates } from '../timeline/utils';
import type { ClusterType, ClusterStatus, Cluster, ClusterPhase, PhaseKey, ClusterOperation, OperationType } from '../types';
import { INIT_PHASES, EXPANSION_PHASES } from '../types';
```

**3b.** Add `EXPANSION_PHASE_LABELS` and update constants:

```ts
const INIT_PHASE_ORDER: PhaseKey[] = INIT_PHASES;
const EXPANSION_PHASE_ORDER: PhaseKey[] = EXPANSION_PHASES;

// Keep PHASE_ORDER for backward compat with validate calls
const PHASE_ORDER = INIT_PHASE_ORDER;
```

**3c.** Update `PhaseForm` type and helpers to be operation-type-aware:

```ts
type PhaseForm = Partial<Record<PhaseKey, string>>;

function emptyPhaseForm(type: OperationType): PhaseForm {
  const keys = type === 'init' ? INIT_PHASE_ORDER : EXPANSION_PHASE_ORDER;
  return Object.fromEntries(keys.map(k => [k, ''])) as PhaseForm;
}

function toPhasePayload(phases: PhaseForm, type: OperationType, existingPhases: ClusterPhase[] = []): ClusterPhase[] {
  const keys = type === 'init' ? INIT_PHASE_ORDER : EXPANSION_PHASE_ORDER;
  const existingByPhase = new Map(existingPhases.map(p => [p.phase, p] as const));
  return keys.map(phase => ({
    ...existingByPhase.get(phase),
    phase,
    date: phases[phase] ?? '',
  }));
}
```

**3d.** Update `ClusterForm` and `emptyForm`:

```ts
interface ClusterForm {
  name: string;
  type: ClusterType | '';
  factory_id: string;
  phases: PhaseForm;
}

const emptyForm = (): ClusterForm => ({
  name: '',
  type: '',
  factory_id: '',
  phases: emptyPhaseForm('init'),
});
```

**3e.** Add state for operations expand/collapse and operation editing:

```ts
const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
const [addingExpansionFor, setAddingExpansionFor] = useState<string | null>(null);
const [expansionForm, setExpansionForm] = useState<PhaseForm>(emptyPhaseForm('expansion'));
const [expansionFormError, setExpansionFormError] = useState('');
const [editingOperation, setEditingOperation] = useState<{ clusterId: string; op: ClusterOperation } | null>(null);
const [opEditForm, setOpEditForm] = useState<PhaseForm>(emptyPhaseForm('init'));
const [opEditError, setOpEditError] = useState('');
```

**3f.** Add mutations for operations:

```ts
const addOpMut = useMutation({
  mutationFn: ({ clusterId, data }: { clusterId: string; data: { type: OperationType; label?: string; phases: ClusterPhase[] } }) =>
    addOperation(clusterId, data),
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: ['clusters'] });
    setAddingExpansionFor(null);
    setExpansionForm(emptyPhaseForm('expansion'));
    setExpansionFormError('');
  },
  onError: (err: Error) => setExpansionFormError(err.message),
});

const updateOpMut = useMutation({
  mutationFn: ({ clusterId, opId, phases }: { clusterId: string; opId: string; phases: ClusterPhase[] }) =>
    updateOperation(clusterId, opId, phases),
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: ['clusters'] });
    setEditingOperation(null);
    setOpEditError('');
  },
  onError: (err: Error) => setOpEditError(err.message),
});

const deleteOpMut = useMutation({
  mutationFn: ({ clusterId, opId }: { clusterId: string; opId: string }) =>
    deleteOperation(clusterId, opId),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clusters'] }),
});
```

**3g.** Update `validateForm` to only validate 6 phases (init is always first):

```ts
function validateForm(form: ClusterForm): string {
  if (!form.name.trim()) return 'Name is required';
  if (!form.type) return 'Type is required';
  if (!form.factory_id) return 'Factory is required';

  for (const phase of INIT_PHASE_ORDER) {
    if (!form.phases[phase]) return `${PHASE_LABELS[phase]} date is required`;
  }

  return Object.values(validatePhaseDates(toPhasePayload(form.phases, 'init')))[0] ?? '';
}

function validateExpansionForm(phases: PhaseForm): string {
  for (const phase of EXPANSION_PHASE_ORDER) {
    if (!phases[phase]) return `${PHASE_LABELS[phase]} date is required`;
  }
  return Object.values(validatePhaseDates(toPhasePayload(phases, 'expansion')))[0] ?? '';
}
```

**3h.** Update `handleCreate` to wrap phases in init operation:

```ts
const handleCreate = async (e: React.FormEvent) => {
  e.preventDefault();
  const error = validateForm(form);
  if (error) return setFormError(error);
  setFormError('');
  try {
    await createMut.mutateAsync({
      name: form.name.trim(),
      type: form.type as ClusterType,
      factory_id: form.factory_id,
      phases: toPhasePayload(form.phases, 'init'),
    });
  } catch { /* onError handles */ }
};
```

**3i.** Update `formFromCluster` to read from the init operation:

```ts
function formFromCluster(cluster: Cluster): ClusterForm {
  const phases = emptyPhaseForm('init');
  const initOp = cluster.operations?.find(o => o.type === 'init');
  initOp?.phases.forEach(p => { (phases as Record<string, string>)[p.phase] = p.date; });
  return { name: cluster.name, type: cluster.type, factory_id: cluster.factory_id, phases };
}
```

**3j.** In the cluster table body, add toggle button and operations expansion panel. For each cluster row (`filteredClusters.map(cluster => ...)`), wrap the row in a React Fragment `<>` and add the expansion panel below the `<tr>`:

```tsx
filteredClusters.map((cluster) => {
  const isExpanded = expandedRows.has(cluster.id);
  const status = cluster.status ?? 'purchase';
  const config = STATUS_CONFIG[status];
  return (
    <React.Fragment key={cluster.id}>
      <tr className="hover:bg-gray-50 transition-colors">
        {/* Toggle expand button as first td */}
        <td className="px-2 py-3 w-8">
          <button
            title="Toggle operations"
            onClick={() => setExpandedRows(prev => {
              const next = new Set(prev);
              next.has(cluster.id) ? next.delete(cluster.id) : next.add(cluster.id);
              return next;
            })}
            className="text-gray-400 hover:text-indigo-600"
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </td>
        {/* ... existing factory, name, type, status tds ... */}
        {/* Keep existing Edit / Delete buttons in the actions td */}
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={6} className="bg-gray-50 px-5 py-3 border-b border-gray-200">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Operations</div>
              {cluster.operations?.map((op, idx) => (
                <div key={op.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                  <div>
                    <span className="text-xs font-medium text-gray-700">
                      {op.type === 'init' ? 'Init' : op.label ?? `Expansion #${idx}`}
                    </span>
                    <span className="ml-2 text-xs text-gray-400">
                      {op.phases[0]?.date} → {op.phases[op.phases.length - 1]?.date}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      title="Edit operation phases"
                      onClick={() => {
                        const form: PhaseForm = Object.fromEntries(op.phases.map(p => [p.phase, p.date]));
                        setOpEditForm(form);
                        setEditingOperation({ clusterId: cluster.id, op });
                        setOpEditError('');
                      }}
                      className="text-gray-400 hover:text-indigo-600"
                    >
                      <Edit2 size={13} />
                    </button>
                    {op.type !== 'init' && (
                      <button
                        title="Delete operation"
                        onClick={() => deleteOpMut.mutate({ clusterId: cluster.id, opId: op.id })}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {addingExpansionFor === cluster.id ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const err = validateExpansionForm(expansionForm);
                    if (err) return setExpansionFormError(err);
                    setExpansionFormError('');
                    const expCount = (cluster.operations?.filter(o => o.type === 'expansion').length ?? 0) + 1;
                    await addOpMut.mutateAsync({
                      clusterId: cluster.id,
                      data: {
                        type: 'expansion',
                        label: `Expansion #${expCount}`,
                        phases: toPhasePayload(expansionForm, 'expansion'),
                      },
                    });
                  }}
                  className="space-y-3 pt-2 border-t border-gray-200 mt-2"
                >
                  {expansionFormError && (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{expansionFormError}</div>
                  )}
                  <div className="grid grid-cols-5 gap-3">
                    {EXPANSION_PHASE_ORDER.map(phase => (
                      <div key={phase}>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{PHASE_LABELS[phase]}</label>
                        <input
                          name={phase}
                          type="date"
                          value={expansionForm[phase] ?? ''}
                          onChange={e => setExpansionForm(prev => ({ ...prev, [phase]: e.target.value }))}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setAddingExpansionFor(null)} className="px-3 py-1 text-xs text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50">
                      Cancel
                    </button>
                    <button type="submit" disabled={addOpMut.isPending} className="px-3 py-1 text-xs text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50">
                      Add Expansion
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => {
                    setAddingExpansionFor(cluster.id);
                    setExpansionForm(emptyPhaseForm('expansion'));
                    setExpansionFormError('');
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  + Add Expansion
                </button>
              )}
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
})
```

**3k.** Add the operation edit panel (inline modal/panel). Just above the `return (` statement, add:

```tsx
{/* Operation edit drawer — shown when editingOperation is set */}
{editingOperation && (() => {
  const { clusterId, op } = editingOperation;
  const opPhaseOrder = op.type === 'init' ? INIT_PHASE_ORDER : EXPANSION_PHASE_ORDER;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl p-6 w-[480px]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-800">
            Edit {op.type === 'init' ? 'Init' : op.label ?? 'Expansion'} Phases
          </h2>
          <button onClick={() => setEditingOperation(null)} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        {opEditError && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-3">{opEditError}</div>}
        <form onSubmit={async (e) => {
          e.preventDefault();
          const phases = toPhasePayload(opEditForm, op.type);
          const errs = validatePhaseDates(phases);
          const firstErr = Object.values(errs)[0];
          if (firstErr) return setOpEditError(firstErr);
          setOpEditError('');
          await updateOpMut.mutateAsync({ clusterId, opId: op.id, phases });
        }} className="space-y-4">
          <div className={`grid gap-3 ${op.type === 'init' ? 'grid-cols-3' : 'grid-cols-5'}`}>
            {opPhaseOrder.map(phase => (
              <div key={phase}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{PHASE_LABELS[phase]}</label>
                <input
                  type="date"
                  value={opEditForm[phase] ?? ''}
                  onChange={e => setOpEditForm(prev => ({ ...prev, [phase]: e.target.value }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setEditingOperation(null)} className="px-3 py-1 text-xs text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={updateOpMut.isPending} className="px-3 py-1 text-xs text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
})()}
```

Also add `import React from 'react';` at the top if not already present (needed for `React.Fragment`).

Also update `colSpan` in the existing "no clusters" empty state row from `5` to `6` since we added a column for the toggle button.

Also update the table header to add an empty first `<th>` for the toggle column.

- [ ] **Step 4: Run Clusters tests**

```bash
cd frontend && npm test -- --run src/pages/Clusters.test.tsx 2>&1 | tail -50
```

Expected: all existing tests and new tests pass.

- [ ] **Step 5: Run full test suite**

```bash
cd frontend && npm test 2>&1 | tail -30
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/Clusters.tsx src/pages/Clusters.test.tsx
git commit -m "feat: expandable cluster rows with operations list and Add Expansion form"
```

---

## Task 6: Timeline Components

**Files:**
- Modify: `src/timeline/ClusterRow.tsx`
- Modify: `src/timeline/FactoryGroup.tsx`
- Modify: `src/pages/Timeline.tsx`
- Modify: `src/timeline/TimelineToolbar.tsx`

### 6a: ClusterRow — collapsible parent + operation child rows

- [ ] **Step 1: Rewrite `src/timeline/ClusterRow.tsx`**

```tsx
import { useState } from 'react';
import { Pencil, ChevronRight, ChevronDown } from 'lucide-react';
import PhaseCell from './PhaseCell';
import { resolveClusterCells } from './utils';
import type { Cluster, ClusterOperation } from '../types';

interface OperationRowProps {
  operation: ClusterOperation;
  label: string;
  columns: string[];
  mode: 'week' | 'month';
  nowColumn: string;
  onEdit?: () => void;
  isChild?: boolean;
}

function OperationRow({ operation, label, columns, mode, nowColumn, onEdit, isChild }: OperationRowProps) {
  const cells = resolveClusterCells(operation.phases, columns, mode);
  return (
    <div
      className={`grid gap-px items-center py-0.5 border-b border-gray-100 ${isChild ? 'bg-gray-50/50' : ''}`}
      style={{ gridTemplateColumns: `180px repeat(${columns.length}, 1fr)` }}
    >
      <div
        className={`${isChild ? 'pl-10' : 'pl-6'} pr-2 group flex items-center justify-between ${onEdit ? 'cursor-pointer hover:bg-indigo-50 rounded' : ''}`}
        onClick={onEdit}
        title={onEdit ? 'Click to edit phases' : undefined}
      >
        <div>
          <div className={`text-[11px] font-medium ${isChild ? 'text-gray-500' : 'text-gray-700'}`}>{label}</div>
          {isChild && (
            <div className="text-[9px] text-gray-400">
              {operation.type === 'init' ? 'init' : 'expansion'}
            </div>
          )}
        </div>
        {onEdit && (
          <Pencil size={11} className="text-gray-300 group-hover:text-indigo-500 flex-shrink-0 mr-1 transition-colors" />
        )}
      </div>
      {cells.map((cell, i) => (
        <PhaseCell key={columns[i]} cell={cell} isNowColumn={columns[i] === nowColumn} />
      ))}
    </div>
  );
}

interface Props {
  cluster: Cluster;
  columns: string[];
  mode: 'week' | 'month';
  nowColumn: string;
  onEdit?: (cluster: Cluster, operationId?: string) => void;
}

export default function ClusterRow({ cluster, columns, mode, nowColumn, onEdit }: Props) {
  const [expanded, setExpanded] = useState(false);
  const operations = cluster.operations ?? [];
  const latestOp = operations[operations.length - 1];

  if (!latestOp) {
    // Fallback: legacy cluster with no operations
    const cells = resolveClusterCells(cluster.phases ?? [], columns, mode);
    return (
      <div
        className="grid gap-px items-center py-0.5 border-b border-gray-100"
        style={{ gridTemplateColumns: `180px repeat(${columns.length}, 1fr)` }}
      >
        <div className="pl-6 pr-2 flex items-center">
          <div className="text-[11px] text-gray-700 font-medium">{cluster.name}</div>
        </div>
        {cells.map((cell, i) => (
          <PhaseCell key={columns[i]} cell={cell} isNowColumn={columns[i] === nowColumn} />
        ))}
      </div>
    );
  }

  if (operations.length === 1) {
    // Single operation: show as flat row (no expand toggle)
    return (
      <OperationRow
        operation={latestOp}
        label={cluster.name}
        columns={columns}
        mode={mode}
        nowColumn={nowColumn}
        onEdit={onEdit ? () => onEdit(cluster, latestOp.id) : undefined}
      />
    );
  }

  // Multiple operations: collapsible parent
  return (
    <>
      {/* Parent summary row */}
      <div
        className="grid gap-px items-center py-0.5 border-b border-gray-100 cursor-pointer hover:bg-indigo-50/30"
        style={{ gridTemplateColumns: `180px repeat(${columns.length}, 1fr)` }}
        onClick={() => setExpanded(e => !e)}
      >
        <div className="pl-3 pr-2 flex items-center gap-1">
          <span className="text-gray-400 flex-shrink-0">
            {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </span>
          <div>
            <div className="text-[11px] text-gray-700 font-medium">{cluster.name}</div>
            <div className="text-[9px] text-gray-400">{operations.length} ops</div>
          </div>
        </div>
        {/* Show latest operation's phase cells in collapsed state */}
        {resolveClusterCells(latestOp.phases, columns, mode).map((cell, i) => (
          <PhaseCell key={columns[i]} cell={cell} isNowColumn={columns[i] === nowColumn} />
        ))}
      </div>

      {/* Child operation rows */}
      {expanded && operations.map((op, idx) => (
        <OperationRow
          key={op.id}
          operation={op}
          label={op.type === 'init' ? 'Init' : op.label ?? `Expansion #${idx}`}
          columns={columns}
          mode={mode}
          nowColumn={nowColumn}
          isChild
          onEdit={onEdit ? () => onEdit(cluster, op.id) : undefined}
        />
      ))}
    </>
  );
}
```

### 6b: FactoryGroup — read from operations

- [ ] **Step 2: Update `src/timeline/FactoryGroup.tsx`**

Update the `hasBlocked` and `phaseSummary` computations to read from `operations` instead of top-level `phases`:

```tsx
// Helper: get the "current" operation's phases (last operation)
function currentOpPhases(c: Cluster) {
  const ops = c.operations;
  return ops?.length ? ops[ops.length - 1].phases : c.phases ?? [];
}

const hasBlocked = clusters.some(c =>
  currentOpPhases(c).some(p => p.status === 'blocked') ||
  c.operations?.some(op => op.phases.some(p => p.status === 'blocked'))
);

const phaseSummary = clusters.reduce((acc, c) => {
  const phases = currentOpPhases(c);
  const current = phases.find(p => p.status === 'in_progress' || p.status === 'blocked');
  if (current) acc[current.phase] = (acc[current.phase] || 0) + 1;
  return acc;
}, {} as Record<string, number>);
```

Also add `import type { Cluster } from '../types';` at top and the `currentOpPhases` helper (can be inline in the component).

### 6c: Timeline EditDrawer — operation-aware

- [ ] **Step 3: Update `ClusterEditDrawer` in `src/pages/Timeline.tsx`**

`ClusterEditDrawer` currently reads `cluster.phases`. Update it to show an operation selector and edit the chosen operation's phases:

```tsx
import { updateOperation } from '../api/clusters';
import type { Cluster, ClusterOperation, PhaseKey, ClusterPhase } from '../types';
import { INIT_PHASES, EXPANSION_PHASES } from '../types';

// Replace phaseFormFromCluster with:
function phaseFormFromOperation(op: ClusterOperation): PhaseForm {
  const form: PhaseForm = { purchase: '', movein: '', infra: '', cluster: '', platform: '', release: '' };
  op.phases.forEach(p => { form[p.phase] = p.date ?? ''; });
  return form;
}

function ClusterEditDrawer({ cluster, onClose, onSaved }: DrawerProps) {
  const queryClient = useQueryClient();
  const operations = cluster.operations ?? [];
  const [selectedOpId, setSelectedOpId] = useState(operations[operations.length - 1]?.id ?? '');
  const selectedOp = operations.find(o => o.id === selectedOpId) ?? operations[operations.length - 1];
  const phaseOrder = selectedOp?.type === 'expansion' ? EXPANSION_PHASES : INIT_PHASES;

  const [phases, setPhases] = useState<PhaseForm>(() =>
    selectedOp ? phaseFormFromOperation(selectedOp) : { purchase: '', movein: '', infra: '', cluster: '', platform: '', release: '' }
  );
  const [error, setError] = useState('');

  // Re-initialize phases form when selected operation changes
  const handleOpChange = (opId: string) => {
    setSelectedOpId(opId);
    const op = operations.find(o => o.id === opId);
    if (op) setPhases(phaseFormFromOperation(op));
  };

  const mutation = useMutation({
    mutationFn: (payload: ClusterPhase[]) => updateOperation(cluster.id, selectedOpId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['timeline-clusters'] });
      onSaved();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: ClusterPhase[] = phaseOrder.map((phase, i) => {
      const existing = selectedOp?.phases.find(p => p.phase === phase);
      return { ...existing, phase, date: phases[phase], order: i };
    });
    const errs = validatePhaseDates(payload);
    const firstErr = Object.values(errs)[0];
    if (firstErr) { setError(firstErr); return; }
    setError('');
    mutation.mutate(payload);
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <div className="font-semibold text-gray-900 text-sm">{cluster.name}</div>
            <div className="text-xs text-gray-400">{cluster.factory_name}</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {/* Operation selector (only shown if >1 operation) */}
        {operations.length > 1 && (
          <div className="px-5 py-3 border-b border-gray-200">
            <label className="block text-xs font-medium text-gray-600 mb-1">Operation</label>
            <select
              value={selectedOpId}
              onChange={e => handleOpChange(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
            >
              {operations.map((op, idx) => (
                <option key={op.id} value={op.id}>
                  {op.type === 'init' ? 'Init' : op.label ?? `Expansion #${idx}`}
                </option>
              ))}
            </select>
          </div>
        )}

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
          {phaseOrder.map(phase => (
            <div key={phase}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{PHASE_LABELS[phase]}</label>
              <input
                type="date"
                value={phases[phase]}
                onChange={e => setPhases(prev => ({ ...prev, [phase]: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>
    </>
  );
}
```

Also update the `onEdit` handler in `Timeline.tsx` where it passes cluster to the drawer. The `ClusterRow` now calls `onEdit(cluster, operationId)` — update the Timeline's `onEdit` to accept this signature.

Update `FactoryGroup`'s `onEdit` prop call in Timeline.tsx:

```tsx
onEdit={(cluster, _opId) => setEditingCluster(cluster)}
```

(The drawer now reads `selectedOpId` internally from `cluster.operations`.)

### 6d: TimelineToolbar — add operation type filter

- [ ] **Step 4: Update `src/timeline/TimelineToolbar.tsx`**

First view the current file:

```bash
cat frontend/src/timeline/TimelineToolbar.tsx
```

Add an `operationType` filter prop. The toolbar currently has filter controls. Add:

```tsx
export interface TimelineFilter {
  type: string;        // existing cluster type filter (k8s/vm/all)
  operationType: 'all' | 'init' | 'expansion';  // NEW
}
```

Add the new select to the toolbar JSX alongside the existing type filter:

```tsx
<div className="flex items-center gap-1.5">
  <span className="text-xs text-gray-500">Operation:</span>
  <select
    value={filter.operationType}
    onChange={e => onFilterChange({ ...filter, operationType: e.target.value as 'all' | 'init' | 'expansion' })}
    className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
  >
    <option value="all">All</option>
    <option value="init">Init Only</option>
    <option value="expansion">Expansion Only</option>
  </select>
</div>
```

In `src/pages/Timeline.tsx`, update the filter state and the `filteredClusters` computation to apply the new filter:

```ts
// In filter state, add operationType: 'all' as default
const [filter, setFilter] = useState<TimelineFilter>({ type: 'all', operationType: 'all' });

// In filteredClusters useMemo:
const filteredClusters = useMemo(() => {
  return clusters.filter(c => {
    if (filter.type !== 'all' && c.type !== filter.type) return false;
    if (filter.operationType !== 'all') {
      const hasMatchingOp = c.operations?.some(o => o.type === filter.operationType);
      if (!hasMatchingOp) return false;
    }
    return true;
  });
}, [clusters, filter]);
```

- [ ] **Step 5: Run the full test suite**

```bash
cd frontend && npm test 2>&1 | tail -40
```

Expected: all tests pass.

- [ ] **Step 6: Run build**

```bash
cd frontend && npm run build 2>&1 | tail -30
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add src/timeline/ClusterRow.tsx src/timeline/FactoryGroup.tsx src/pages/Timeline.tsx src/timeline/TimelineToolbar.tsx
git commit -m "feat: timeline collapsible operation rows and operation type filter"
```

---

## Task 7: Final Test Pass + Lint

**Files:**
- Run all tests and lint; fix any remaining failures

- [ ] **Step 1: Run full test suite**

```bash
cd frontend && npm test 2>&1 | tail -50
```

- [ ] **Step 2: Run linter**

```bash
cd frontend && npm run lint 2>&1 | tail -30
```

- [ ] **Step 3: Run build**

```bash
cd frontend && npm run build 2>&1 | tail -30
```

- [ ] **Step 4: Fix any failures**

Iterate on failures by reading error output and making targeted fixes. Common things to fix:
- Missing `import React` for JSX fragments
- TypeScript error on `cluster.phases` being accessed where `cluster.operations` is expected — ensure all callers use `operations`
- Timeline tests may reference `cluster.phases` — update to `cluster.operations?.[0].phases`
- `FactorySidebar.test.tsx` may pass clusters with `phases` — update test fixtures to use `operations`

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: cluster operations (Option A) - init and expansion ops with expandable UI"
```

---

## Quick Reference

**Run all tests:**
```bash
cd frontend && npm test
```

**Run specific test file:**
```bash
cd frontend && npm test -- --run src/mock/store.test.ts
cd frontend && npm test -- --run src/pages/Clusters.test.tsx
```

**Type-check only:**
```bash
cd frontend && npx tsc --noEmit
```

**Full build:**
```bash
cd frontend && npm run build
```

**localStorage keys:**
- v6 = `mosite_mock_db_v6` (current)
- v5 = `mosite_mock_db_v5` (migrated from: flat phases → operations[0])
- v4 = `mosite_mock_db_v4` (migrated from: completionWeek legacy phases)
