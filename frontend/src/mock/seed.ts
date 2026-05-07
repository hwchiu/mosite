import type { Factory, Cluster, ClusterOperation } from '../types';
import { isoWeekToDate } from '../timeline/utils';

function initOp(id: string, phases: NonNullable<Cluster['phases']>, created_at: string): ClusterOperation {
  return {
    id: `${id}-op-init`,
    type: 'init',
    phases,
    created_at,
  };
}

export const SEED_FACTORIES: Factory[] = [
  { id: 'f1',  name: 'F1',  created_at: '2025-01-10T08:00:00Z' },
  { id: 'f2',  name: 'F2',  created_at: '2025-02-01T08:00:00Z' },
  { id: 'f3',  name: 'F3',  created_at: '2025-03-15T08:00:00Z' },
  { id: 'f4',  name: 'F4',  created_at: '2025-04-01T08:00:00Z' },
  { id: 'f5',  name: 'F5',  created_at: '2025-05-01T08:00:00Z' },
  { id: 'f6',  name: 'F6',  created_at: '2025-06-01T08:00:00Z' },
  { id: 'f7',  name: 'F7',  created_at: '2025-07-01T08:00:00Z' },
  { id: 'f8',  name: 'F8',  created_at: '2025-08-01T08:00:00Z' },
  { id: 'f9',  name: 'F9',  created_at: '2025-09-01T08:00:00Z' },
  { id: 'f10', name: 'F10', created_at: '2025-10-01T08:00:00Z' },
];

export const SEED_CLUSTERS: Cluster[] = [
  // F1: 3 clusters
  {
    id: 'c1', name: 'F1-K8S-Prod', type: 'k8s',
    factory_id: 'f1', factory_name: 'F1', status: 'infra',
    operations: [
      initOp('c1', [
        { phase: 'purchase', date: isoWeekToDate('2026-W04'), status: 'completed' },
        { phase: 'movein',   date: isoWeekToDate('2026-W06'), status: 'completed' },
        { phase: 'infra',    date: isoWeekToDate('2026-W10'), status: 'completed' },
        { phase: 'cluster',  date: isoWeekToDate('2026-W12'), status: 'completed' },
        { phase: 'platform', date: isoWeekToDate('2026-W14'), status: 'completed' },
        { phase: 'release',  date: isoWeekToDate('2026-W16'), status: 'completed' },
      ], '2025-01-20T08:00:00Z'),
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
    ],
    created_at: '2025-01-20T08:00:00Z',
  },
  {
    id: 'c2', name: 'F1-VM-Infra', type: 'vm',
    factory_id: 'f1', factory_name: 'F1', status: 'infra',
    operations: [
      initOp('c2', [
        { phase: 'purchase', date: isoWeekToDate('2026-W16'), status: 'completed' },
        { phase: 'movein',   date: isoWeekToDate('2026-W16'), status: 'completed' },
        { phase: 'infra',    date: isoWeekToDate('2026-W19'), status: 'in_progress' },
        { phase: 'cluster',  date: isoWeekToDate('2026-W22'), status: 'estimated' },
        { phase: 'platform', date: isoWeekToDate('2026-W24'), status: 'estimated' },
        { phase: 'release',  date: isoWeekToDate('2026-W26'), status: 'estimated' },
      ], '2025-01-25T08:00:00Z'),
    ],
    created_at: '2025-01-25T08:00:00Z',
  },
  {
    id: 'c3', name: 'F1-K8S-Staging', type: 'k8s',
    factory_id: 'f1', factory_name: 'F1', status: 'purchase',
    operations: [
      initOp('c3', [
        { phase: 'purchase', date: isoWeekToDate('2026-W24'), status: 'estimated' },
        { phase: 'movein',   date: isoWeekToDate('2026-W26'), status: 'estimated' },
        { phase: 'infra',    date: isoWeekToDate('2026-W28'), status: 'estimated' },
        { phase: 'cluster',  date: isoWeekToDate('2026-W30'), status: 'estimated' },
        { phase: 'platform', date: isoWeekToDate('2026-W32'), status: 'estimated' },
        { phase: 'release',  date: isoWeekToDate('2026-W34'), status: 'estimated' },
      ], '2025-01-30T08:00:00Z'),
    ],
    created_at: '2025-01-30T08:00:00Z',
  },
  
  // F2: 2 clusters
  {
    id: 'c4', name: 'F2-K8S-Prod', type: 'k8s',
    factory_id: 'f2', factory_name: 'F2', status: 'infra',
    operations: [
      initOp('c4', [
        { phase: 'purchase', date: isoWeekToDate('2026-W14'), status: 'completed' },
        { phase: 'movein',   date: isoWeekToDate('2026-W17'), status: 'completed' },
        { phase: 'infra',    date: isoWeekToDate('2026-W23'), status: 'blocked', note: '機器延遲到貨，預計 W23 恢復' },
        { phase: 'cluster',  date: isoWeekToDate('2026-W25'), status: 'estimated' },
        { phase: 'platform', date: isoWeekToDate('2026-W27'), status: 'estimated' },
        { phase: 'release',  date: isoWeekToDate('2026-W29'), status: 'estimated' },
      ], '2025-02-10T08:00:00Z'),
    ],
    created_at: '2025-02-10T08:00:00Z',
  },
  {
    id: 'c5', name: 'F2-VM-Dev', type: 'vm',
    factory_id: 'f2', factory_name: 'F2', status: 'cluster',
    operations: [
      initOp('c5', [
        { phase: 'purchase', date: isoWeekToDate('2026-W10'), status: 'completed' },
        { phase: 'movein',   date: isoWeekToDate('2026-W12'), status: 'completed' },
        { phase: 'infra',    date: isoWeekToDate('2026-W15'), status: 'completed' },
        { phase: 'cluster',  date: isoWeekToDate('2026-W20'), status: 'in_progress' },
        { phase: 'platform', date: isoWeekToDate('2026-W22'), status: 'estimated' },
        { phase: 'release',  date: isoWeekToDate('2026-W24'), status: 'estimated' },
      ], '2025-02-15T08:00:00Z'),
    ],
    created_at: '2025-02-15T08:00:00Z',
  },
  
  // F3: 4 clusters
  {
    id: 'c6', name: 'F3-K8S-Prod-A', type: 'k8s',
    factory_id: 'f3', factory_name: 'F3', status: 'movein',
    operations: [
      initOp('c6', [
        { phase: 'purchase', date: isoWeekToDate('2026-W10'), status: 'completed' },
        { phase: 'movein',   date: isoWeekToDate('2026-W12'), status: 'completed' },
        { phase: 'infra',    date: isoWeekToDate('2026-W15'), status: 'completed' },
        { phase: 'cluster',  date: isoWeekToDate('2026-W17'), status: 'completed' },
        { phase: 'platform', date: isoWeekToDate('2026-W18'), status: 'completed' },
        { phase: 'release',  date: isoWeekToDate('2026-W20'), status: 'completed' },
      ], '2025-03-20T08:00:00Z'),
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
    ],
    created_at: '2025-03-20T08:00:00Z',
  },
  {
    id: 'c7', name: 'F3-K8S-Prod-B', type: 'k8s',
    factory_id: 'f3', factory_name: 'F3', status: 'movein',
    operations: [
      initOp('c7', [
        { phase: 'purchase', date: isoWeekToDate('2026-W18'), status: 'completed' },
        { phase: 'movein',   date: isoWeekToDate('2026-W21'), status: 'in_progress' },
        { phase: 'infra',    date: isoWeekToDate('2026-W23'), status: 'estimated' },
        { phase: 'cluster',  date: isoWeekToDate('2026-W25'), status: 'estimated' },
        { phase: 'platform', date: isoWeekToDate('2026-W27'), status: 'estimated' },
        { phase: 'release',  date: isoWeekToDate('2026-W29'), status: 'estimated' },
      ], '2025-03-22T08:00:00Z'),
    ],
    created_at: '2025-03-22T08:00:00Z',
  },
  {
    id: 'c8', name: 'F3-VM-Dev', type: 'vm',
    factory_id: 'f3', factory_name: 'F3', status: 'cluster',
    operations: [
      initOp('c8', [
        { phase: 'purchase', date: isoWeekToDate('2026-W16'), status: 'completed' },
        { phase: 'movein',   date: isoWeekToDate('2026-W17'), status: 'completed' },
        { phase: 'infra',    date: isoWeekToDate('2026-W18'), status: 'completed' },
        { phase: 'cluster',  date: isoWeekToDate('2026-W19'), status: 'in_progress' },
        { phase: 'platform', date: isoWeekToDate('2026-W21'), status: 'estimated' },
        { phase: 'release',  date: isoWeekToDate('2026-W23'), status: 'estimated' },
      ], '2025-03-25T08:00:00Z'),
    ],
    created_at: '2025-03-25T08:00:00Z',
  },
  {
    id: 'c9', name: 'F3-VM-Staging', type: 'vm',
    factory_id: 'f3', factory_name: 'F3', status: 'purchase',
    operations: [
      initOp('c9', [
        { phase: 'purchase', date: isoWeekToDate('2026-W22'), status: 'estimated' },
        { phase: 'movein',   date: isoWeekToDate('2026-W24'), status: 'estimated' },
        { phase: 'infra',    date: isoWeekToDate('2026-W26'), status: 'estimated' },
        { phase: 'cluster',  date: isoWeekToDate('2026-W28'), status: 'estimated' },
        { phase: 'platform', date: isoWeekToDate('2026-W30'), status: 'estimated' },
        { phase: 'release',  date: isoWeekToDate('2026-W32'), status: 'estimated' },
      ], '2025-03-28T08:00:00Z'),
    ],
    created_at: '2025-03-28T08:00:00Z',
  },
  
  // F4: 1 cluster
  {
    id: 'c10', name: 'F4-K8S-Main', type: 'k8s',
    factory_id: 'f4', factory_name: 'F4', status: 'infra',
    operations: [
      initOp('c10', [
        { phase: 'purchase', date: isoWeekToDate('2026-W17'), status: 'completed' },
        { phase: 'movein',   date: isoWeekToDate('2026-W18'), status: 'completed' },
        { phase: 'infra',    date: isoWeekToDate('2026-W20'), status: 'in_progress' },
        { phase: 'cluster',  date: isoWeekToDate('2026-W22'), status: 'estimated' },
        { phase: 'platform', date: isoWeekToDate('2026-W24'), status: 'estimated' },
        { phase: 'release',  date: isoWeekToDate('2026-W26'), status: 'estimated' },
      ], '2025-04-10T08:00:00Z'),
    ],
    created_at: '2025-04-10T08:00:00Z',
  },
  
  // F5: 3 clusters
  {
    id: 'c11', name: 'F5-K8S-Prod', type: 'k8s',
    factory_id: 'f5', factory_name: 'F5', status: 'cluster',
    operations: [
      initOp('c11', [
        { phase: 'purchase', date: isoWeekToDate('2026-W08'), status: 'completed' },
        { phase: 'movein',   date: isoWeekToDate('2026-W10'), status: 'completed' },
        { phase: 'infra',    date: isoWeekToDate('2026-W13'), status: 'completed' },
        { phase: 'cluster',  date: isoWeekToDate('2026-W15'), status: 'completed' },
        { phase: 'platform', date: isoWeekToDate('2026-W16'), status: 'completed' },
        { phase: 'release',  date: isoWeekToDate('2026-W18'), status: 'completed' },
      ], '2025-05-10T08:00:00Z'),
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
    ],
    created_at: '2025-05-10T08:00:00Z',
  },
  {
    id: 'c12', name: 'F5-VM-Infra', type: 'vm',
    factory_id: 'f5', factory_name: 'F5', status: 'movein',
    operations: [
      initOp('c12', [
        { phase: 'purchase', date: isoWeekToDate('2026-W16'), status: 'completed' },
        { phase: 'movein',   date: isoWeekToDate('2026-W19'), status: 'in_progress' },
        { phase: 'infra',    date: isoWeekToDate('2026-W21'), status: 'estimated' },
        { phase: 'cluster',  date: isoWeekToDate('2026-W23'), status: 'estimated' },
        { phase: 'platform', date: isoWeekToDate('2026-W25'), status: 'estimated' },
        { phase: 'release',  date: isoWeekToDate('2026-W27'), status: 'estimated' },
      ], '2025-05-15T08:00:00Z'),
    ],
    created_at: '2025-05-15T08:00:00Z',
  },
  {
    id: 'c13', name: 'F5-K8S-Dev', type: 'k8s',
    factory_id: 'f5', factory_name: 'F5', status: 'purchase',
    operations: [
      initOp('c13', [
        { phase: 'purchase', date: isoWeekToDate('2026-W25'), status: 'estimated' },
        { phase: 'movein',   date: isoWeekToDate('2026-W27'), status: 'estimated' },
        { phase: 'infra',    date: isoWeekToDate('2026-W29'), status: 'estimated' },
        { phase: 'cluster',  date: isoWeekToDate('2026-W31'), status: 'estimated' },
        { phase: 'platform', date: isoWeekToDate('2026-W33'), status: 'estimated' },
        { phase: 'release',  date: isoWeekToDate('2026-W35'), status: 'estimated' },
      ], '2025-05-20T08:00:00Z'),
    ],
    created_at: '2025-05-20T08:00:00Z',
  },
  
  // F6: 2 clusters
  {
    id: 'c14', name: 'F6-K8S-Prod', type: 'k8s',
    factory_id: 'f6', factory_name: 'F6', status: 'cluster',
    operations: [
      initOp('c14', [
        { phase: 'purchase', date: isoWeekToDate('2026-W14'), status: 'completed' },
        { phase: 'movein',   date: isoWeekToDate('2026-W16'), status: 'completed' },
        { phase: 'infra',    date: isoWeekToDate('2026-W17'), status: 'completed' },
        { phase: 'cluster',  date: isoWeekToDate('2026-W19'), status: 'in_progress' },
        { phase: 'platform', date: isoWeekToDate('2026-W21'), status: 'estimated' },
        { phase: 'release',  date: isoWeekToDate('2026-W23'), status: 'estimated' },
      ], '2025-06-10T08:00:00Z'),
    ],
    created_at: '2025-06-10T08:00:00Z',
  },
  {
    id: 'c15', name: 'F6-VM-Dev', type: 'vm',
    factory_id: 'f6', factory_name: 'F6', status: 'purchase',
    operations: [
      initOp('c15', [
        { phase: 'purchase', date: isoWeekToDate('2026-W20'), status: 'estimated' },
        { phase: 'movein',   date: isoWeekToDate('2026-W22'), status: 'estimated' },
        { phase: 'infra',    date: isoWeekToDate('2026-W24'), status: 'estimated' },
        { phase: 'cluster',  date: isoWeekToDate('2026-W26'), status: 'estimated' },
        { phase: 'platform', date: isoWeekToDate('2026-W28'), status: 'estimated' },
        { phase: 'release',  date: isoWeekToDate('2026-W30'), status: 'estimated' },
      ], '2025-06-15T08:00:00Z'),
    ],
    created_at: '2025-06-15T08:00:00Z',
  },
  
  // F7: 5 clusters
  {
    id: 'c16', name: 'F7-K8S-Prod-A', type: 'k8s',
    factory_id: 'f7', factory_name: 'F7', status: 'movein',
    operations: [
      initOp('c16', [
        { phase: 'purchase', date: isoWeekToDate('2026-W12'), status: 'completed' },
        { phase: 'movein',   date: isoWeekToDate('2026-W13'), status: 'completed' },
        { phase: 'infra',    date: isoWeekToDate('2026-W15'), status: 'completed' },
        { phase: 'cluster',  date: isoWeekToDate('2026-W16'), status: 'completed' },
        { phase: 'platform', date: isoWeekToDate('2026-W17'), status: 'completed' },
        { phase: 'release',  date: isoWeekToDate('2026-W19'), status: 'completed' },
      ], '2025-07-10T08:00:00Z'),
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
    ],
    created_at: '2025-07-10T08:00:00Z',
  },
  {
    id: 'c17', name: 'F7-K8S-Prod-B', type: 'k8s',
    factory_id: 'f7', factory_name: 'F7', status: 'infra',
    operations: [
      initOp('c17', [
        { phase: 'purchase', date: isoWeekToDate('2026-W16'), status: 'completed' },
        { phase: 'movein',   date: isoWeekToDate('2026-W17'), status: 'completed' },
        { phase: 'infra',    date: isoWeekToDate('2026-W20'), status: 'in_progress' },
        { phase: 'cluster',  date: isoWeekToDate('2026-W22'), status: 'estimated' },
        { phase: 'platform', date: isoWeekToDate('2026-W24'), status: 'estimated' },
        { phase: 'release',  date: isoWeekToDate('2026-W26'), status: 'estimated' },
      ], '2025-07-12T08:00:00Z'),
    ],
    created_at: '2025-07-12T08:00:00Z',
  },
  {
    id: 'c18', name: 'F7-VM-Infra', type: 'vm',
    factory_id: 'f7', factory_name: 'F7', status: 'cluster',
    operations: [
      initOp('c18', [
        { phase: 'purchase', date: isoWeekToDate('2026-W15'), status: 'completed' },
        { phase: 'movein',   date: isoWeekToDate('2026-W16'), status: 'completed' },
        { phase: 'infra',    date: isoWeekToDate('2026-W17'), status: 'completed' },
        { phase: 'cluster',  date: isoWeekToDate('2026-W19'), status: 'in_progress' },
        { phase: 'platform', date: isoWeekToDate('2026-W20'), status: 'estimated' },
        { phase: 'release',  date: isoWeekToDate('2026-W22'), status: 'estimated' },
      ], '2025-07-15T08:00:00Z'),
    ],
    created_at: '2025-07-15T08:00:00Z',
  },
  {
    id: 'c19', name: 'F7-K8S-Staging', type: 'k8s',
    factory_id: 'f7', factory_name: 'F7', status: 'movein',
    operations: [
      initOp('c19', [
        { phase: 'purchase', date: isoWeekToDate('2026-W17'), status: 'completed' },
        { phase: 'movein',   date: isoWeekToDate('2026-W20'), status: 'blocked', note: '設施準備延遲' },
        { phase: 'infra',    date: isoWeekToDate('2026-W23'), status: 'estimated' },
        { phase: 'cluster',  date: isoWeekToDate('2026-W25'), status: 'estimated' },
        { phase: 'platform', date: isoWeekToDate('2026-W27'), status: 'estimated' },
        { phase: 'release',  date: isoWeekToDate('2026-W29'), status: 'estimated' },
      ], '2025-07-18T08:00:00Z'),
    ],
    created_at: '2025-07-18T08:00:00Z',
  },
  {
    id: 'c20', name: 'F7-VM-Dev', type: 'vm',
    factory_id: 'f7', factory_name: 'F7', status: 'purchase',
    operations: [
      initOp('c20', [
        { phase: 'purchase', date: isoWeekToDate('2026-W26'), status: 'estimated' },
        { phase: 'movein',   date: isoWeekToDate('2026-W28'), status: 'estimated' },
        { phase: 'infra',    date: isoWeekToDate('2026-W30'), status: 'estimated' },
        { phase: 'cluster',  date: isoWeekToDate('2026-W32'), status: 'estimated' },
        { phase: 'platform', date: isoWeekToDate('2026-W34'), status: 'estimated' },
        { phase: 'release',  date: isoWeekToDate('2026-W36'), status: 'estimated' },
      ], '2025-07-20T08:00:00Z'),
    ],
    created_at: '2025-07-20T08:00:00Z',
  },
  
  // F8: 2 clusters
  {
    id: 'c21', name: 'F8-K8S-Prod', type: 'k8s',
    factory_id: 'f8', factory_name: 'F8', status: 'infra',
    operations: [
      initOp('c21', [
        { phase: 'purchase', date: isoWeekToDate('2026-W18'), status: 'completed' },
        { phase: 'movein',   date: isoWeekToDate('2026-W19'), status: 'completed' },
        { phase: 'infra',    date: isoWeekToDate('2026-W21'), status: 'in_progress' },
        { phase: 'cluster',  date: isoWeekToDate('2026-W23'), status: 'estimated' },
        { phase: 'platform', date: isoWeekToDate('2026-W25'), status: 'estimated' },
        { phase: 'release',  date: isoWeekToDate('2026-W27'), status: 'estimated' },
      ], '2025-08-10T08:00:00Z'),
    ],
    created_at: '2025-08-10T08:00:00Z',
  },
  {
    id: 'c22', name: 'F8-VM-Infra', type: 'vm',
    factory_id: 'f8', factory_name: 'F8', status: 'purchase',
    operations: [
      initOp('c22', [
        { phase: 'purchase', date: isoWeekToDate('2026-W23'), status: 'estimated' },
        { phase: 'movein',   date: isoWeekToDate('2026-W25'), status: 'estimated' },
        { phase: 'infra',    date: isoWeekToDate('2026-W27'), status: 'estimated' },
        { phase: 'cluster',  date: isoWeekToDate('2026-W29'), status: 'estimated' },
        { phase: 'platform', date: isoWeekToDate('2026-W31'), status: 'estimated' },
        { phase: 'release',  date: isoWeekToDate('2026-W33'), status: 'estimated' },
      ], '2025-08-15T08:00:00Z'),
    ],
    created_at: '2025-08-15T08:00:00Z',
  },
  
  // F9: 3 clusters
  {
    id: 'c23', name: 'F9-K8S-Prod', type: 'k8s',
    factory_id: 'f9', factory_name: 'F9', status: 'movein',
    operations: [
      initOp('c23', [
        { phase: 'purchase', date: isoWeekToDate('2026-W16'), status: 'completed' },
        { phase: 'movein',   date: isoWeekToDate('2026-W19'), status: 'in_progress' },
        { phase: 'infra',    date: isoWeekToDate('2026-W21'), status: 'estimated' },
        { phase: 'cluster',  date: isoWeekToDate('2026-W23'), status: 'estimated' },
        { phase: 'platform', date: isoWeekToDate('2026-W25'), status: 'estimated' },
        { phase: 'release',  date: isoWeekToDate('2026-W27'), status: 'estimated' },
      ], '2025-09-10T08:00:00Z'),
    ],
    created_at: '2025-09-10T08:00:00Z',
  },
  {
    id: 'c24', name: 'F9-VM-Dev', type: 'vm',
    factory_id: 'f9', factory_name: 'F9', status: 'purchase',
    operations: [
      initOp('c24', [
        { phase: 'purchase', date: isoWeekToDate('2026-W21'), status: 'estimated' },
        { phase: 'movein',   date: isoWeekToDate('2026-W23'), status: 'estimated' },
        { phase: 'infra',    date: isoWeekToDate('2026-W25'), status: 'estimated' },
        { phase: 'cluster',  date: isoWeekToDate('2026-W27'), status: 'estimated' },
        { phase: 'platform', date: isoWeekToDate('2026-W29'), status: 'estimated' },
        { phase: 'release',  date: isoWeekToDate('2026-W31'), status: 'estimated' },
      ], '2025-09-15T08:00:00Z'),
    ],
    created_at: '2025-09-15T08:00:00Z',
  },
  {
    id: 'c25', name: 'F9-K8S-Staging', type: 'k8s',
    factory_id: 'f9', factory_name: 'F9', status: 'purchase',
    operations: [
      initOp('c25', [
        { phase: 'purchase', date: isoWeekToDate('2026-W27'), status: 'estimated' },
        { phase: 'movein',   date: isoWeekToDate('2026-W29'), status: 'estimated' },
        { phase: 'infra',    date: isoWeekToDate('2026-W31'), status: 'estimated' },
        { phase: 'cluster',  date: isoWeekToDate('2026-W33'), status: 'estimated' },
        { phase: 'platform', date: isoWeekToDate('2026-W35'), status: 'estimated' },
        { phase: 'release',  date: isoWeekToDate('2026-W37'), status: 'estimated' },
      ], '2025-09-20T08:00:00Z'),
    ],
    created_at: '2025-09-20T08:00:00Z',
  },
  
  // F10: 1 cluster
  {
    id: 'c26', name: 'F10-K8S-Main', type: 'k8s',
    factory_id: 'f10', factory_name: 'F10', status: 'purchase',
    operations: [
      initOp('c26', [
        { phase: 'purchase', date: isoWeekToDate('2026-W24'), status: 'estimated' },
        { phase: 'movein',   date: isoWeekToDate('2026-W26'), status: 'estimated' },
        { phase: 'infra',    date: isoWeekToDate('2026-W28'), status: 'estimated' },
        { phase: 'cluster',  date: isoWeekToDate('2026-W30'), status: 'estimated' },
        { phase: 'platform', date: isoWeekToDate('2026-W32'), status: 'estimated' },
        { phase: 'release',  date: isoWeekToDate('2026-W34'), status: 'estimated' },
      ], '2025-10-10T08:00:00Z'),
    ],
    created_at: '2025-10-10T08:00:00Z',
  },
];
