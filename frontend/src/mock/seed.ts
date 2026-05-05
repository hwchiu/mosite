import type { Factory, Cluster } from '../types';

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
    factory_id: 'f1', factory_name: 'F1', status: 'sipd',
    phases: [
      { phase: 'PO',           completionWeek: '2026-W04', status: 'completed' },
      { phase: 'server_movein',completionWeek: '2026-W06', status: 'completed' },
      { phase: 'infra',        completionWeek: '2026-W10', status: 'completed' },
      { phase: 'cpld',         completionWeek: '2026-W12', status: 'completed' },
      { phase: 'sipd',         completionWeek: '2026-W14', status: 'completed' },
    ],
    created_at: '2025-01-20T08:00:00Z',
  },
  {
    id: 'c2', name: 'F1-VM-Infra', type: 'vm',
    factory_id: 'f1', factory_name: 'F1', status: 'infra',
    phases: [
      { phase: 'PO',           completionWeek: '2026-W16', status: 'completed' },
      { phase: 'server_movein',completionWeek: '2026-W16', status: 'completed' },
      { phase: 'infra',        completionWeek: '2026-W19', status: 'in_progress' },
      { phase: 'cpld',         completionWeek: '2026-W22', status: 'estimated' },
      { phase: 'sipd',         completionWeek: '2026-W24', status: 'estimated' },
    ],
    created_at: '2025-01-25T08:00:00Z',
  },
  {
    id: 'c3', name: 'F1-K8S-Staging', type: 'k8s',
    factory_id: 'f1', factory_name: 'F1', status: 'PO',
    phases: [
      { phase: 'PO',           completionWeek: '2026-W24', status: 'estimated' },
      { phase: 'server_movein',completionWeek: '2026-W26', status: 'estimated' },
      { phase: 'infra',        completionWeek: '2026-W28', status: 'estimated' },
      { phase: 'cpld',         completionWeek: '2026-W30', status: 'estimated' },
      { phase: 'sipd',         completionWeek: '2026-W32', status: 'estimated' },
    ],
    created_at: '2025-01-30T08:00:00Z',
  },
  
  // F2: 2 clusters
  {
    id: 'c4', name: 'F2-K8S-Prod', type: 'k8s',
    factory_id: 'f2', factory_name: 'F2', status: 'infra',
    phases: [
      { phase: 'PO',           completionWeek: '2026-W14', status: 'completed' },
      { phase: 'server_movein',completionWeek: '2026-W17', status: 'completed' },
      { phase: 'infra',        completionWeek: '2026-W23', status: 'blocked', note: '機器延遲到貨，預計 W23 恢復' },
      { phase: 'cpld',         completionWeek: '2026-W25', status: 'estimated' },
      { phase: 'sipd',         completionWeek: '2026-W27', status: 'estimated' },
    ],
    created_at: '2025-02-10T08:00:00Z',
  },
  {
    id: 'c5', name: 'F2-VM-Dev', type: 'vm',
    factory_id: 'f2', factory_name: 'F2', status: 'cpld',
    phases: [
      { phase: 'PO',           completionWeek: '2026-W10', status: 'completed' },
      { phase: 'server_movein',completionWeek: '2026-W12', status: 'completed' },
      { phase: 'infra',        completionWeek: '2026-W15', status: 'completed' },
      { phase: 'cpld',         completionWeek: '2026-W20', status: 'in_progress' },
      { phase: 'sipd',         completionWeek: '2026-W22', status: 'estimated' },
    ],
    created_at: '2025-02-15T08:00:00Z',
  },
  
  // F3: 4 clusters
  {
    id: 'c6', name: 'F3-K8S-Prod-A', type: 'k8s',
    factory_id: 'f3', factory_name: 'F3', status: 'sipd',
    phases: [
      { phase: 'PO',           completionWeek: '2026-W10', status: 'completed' },
      { phase: 'server_movein',completionWeek: '2026-W12', status: 'completed' },
      { phase: 'infra',        completionWeek: '2026-W15', status: 'completed' },
      { phase: 'cpld',         completionWeek: '2026-W17', status: 'completed' },
      { phase: 'sipd',         completionWeek: '2026-W18', status: 'completed' },
    ],
    created_at: '2025-03-20T08:00:00Z',
  },
  {
    id: 'c7', name: 'F3-K8S-Prod-B', type: 'k8s',
    factory_id: 'f3', factory_name: 'F3', status: 'server_movein',
    phases: [
      { phase: 'PO',           completionWeek: '2026-W18', status: 'completed' },
      { phase: 'server_movein',completionWeek: '2026-W21', status: 'in_progress' },
      { phase: 'infra',        completionWeek: '2026-W23', status: 'estimated' },
      { phase: 'cpld',         completionWeek: '2026-W25', status: 'estimated' },
      { phase: 'sipd',         completionWeek: '2026-W27', status: 'estimated' },
    ],
    created_at: '2025-03-22T08:00:00Z',
  },
  {
    id: 'c8', name: 'F3-VM-Dev', type: 'vm',
    factory_id: 'f3', factory_name: 'F3', status: 'cpld',
    phases: [
      { phase: 'PO',           completionWeek: '2026-W16', status: 'completed' },
      { phase: 'server_movein',completionWeek: '2026-W17', status: 'completed' },
      { phase: 'infra',        completionWeek: '2026-W18', status: 'completed' },
      { phase: 'cpld',         completionWeek: '2026-W19', status: 'in_progress' },
      { phase: 'sipd',         completionWeek: '2026-W21', status: 'estimated' },
    ],
    created_at: '2025-03-25T08:00:00Z',
  },
  {
    id: 'c9', name: 'F3-VM-Staging', type: 'vm',
    factory_id: 'f3', factory_name: 'F3', status: 'PO',
    phases: [
      { phase: 'PO',           completionWeek: '2026-W22', status: 'estimated' },
      { phase: 'server_movein',completionWeek: '2026-W24', status: 'estimated' },
      { phase: 'infra',        completionWeek: '2026-W26', status: 'estimated' },
      { phase: 'cpld',         completionWeek: '2026-W28', status: 'estimated' },
      { phase: 'sipd',         completionWeek: '2026-W30', status: 'estimated' },
    ],
    created_at: '2025-03-28T08:00:00Z',
  },
  
  // F4: 1 cluster
  {
    id: 'c10', name: 'F4-K8S-Main', type: 'k8s',
    factory_id: 'f4', factory_name: 'F4', status: 'infra',
    phases: [
      { phase: 'PO',           completionWeek: '2026-W17', status: 'completed' },
      { phase: 'server_movein',completionWeek: '2026-W18', status: 'completed' },
      { phase: 'infra',        completionWeek: '2026-W20', status: 'in_progress' },
      { phase: 'cpld',         completionWeek: '2026-W22', status: 'estimated' },
      { phase: 'sipd',         completionWeek: '2026-W24', status: 'estimated' },
    ],
    created_at: '2025-04-10T08:00:00Z',
  },
  
  // F5: 3 clusters
  {
    id: 'c11', name: 'F5-K8S-Prod', type: 'k8s',
    factory_id: 'f5', factory_name: 'F5', status: 'sipd',
    phases: [
      { phase: 'PO',           completionWeek: '2026-W08', status: 'completed' },
      { phase: 'server_movein',completionWeek: '2026-W10', status: 'completed' },
      { phase: 'infra',        completionWeek: '2026-W13', status: 'completed' },
      { phase: 'cpld',         completionWeek: '2026-W15', status: 'completed' },
      { phase: 'sipd',         completionWeek: '2026-W16', status: 'completed' },
    ],
    created_at: '2025-05-10T08:00:00Z',
  },
  {
    id: 'c12', name: 'F5-VM-Infra', type: 'vm',
    factory_id: 'f5', factory_name: 'F5', status: 'server_movein',
    phases: [
      { phase: 'PO',           completionWeek: '2026-W16', status: 'completed' },
      { phase: 'server_movein',completionWeek: '2026-W19', status: 'in_progress' },
      { phase: 'infra',        completionWeek: '2026-W21', status: 'estimated' },
      { phase: 'cpld',         completionWeek: '2026-W23', status: 'estimated' },
      { phase: 'sipd',         completionWeek: '2026-W25', status: 'estimated' },
    ],
    created_at: '2025-05-15T08:00:00Z',
  },
  {
    id: 'c13', name: 'F5-K8S-Dev', type: 'k8s',
    factory_id: 'f5', factory_name: 'F5', status: 'PO',
    phases: [
      { phase: 'PO',           completionWeek: '2026-W25', status: 'estimated' },
      { phase: 'server_movein',completionWeek: '2026-W27', status: 'estimated' },
      { phase: 'infra',        completionWeek: '2026-W29', status: 'estimated' },
      { phase: 'cpld',         completionWeek: '2026-W31', status: 'estimated' },
      { phase: 'sipd',         completionWeek: '2026-W33', status: 'estimated' },
    ],
    created_at: '2025-05-20T08:00:00Z',
  },
  
  // F6: 2 clusters
  {
    id: 'c14', name: 'F6-K8S-Prod', type: 'k8s',
    factory_id: 'f6', factory_name: 'F6', status: 'cpld',
    phases: [
      { phase: 'PO',           completionWeek: '2026-W14', status: 'completed' },
      { phase: 'server_movein',completionWeek: '2026-W16', status: 'completed' },
      { phase: 'infra',        completionWeek: '2026-W17', status: 'completed' },
      { phase: 'cpld',         completionWeek: '2026-W19', status: 'in_progress' },
      { phase: 'sipd',         completionWeek: '2026-W21', status: 'estimated' },
    ],
    created_at: '2025-06-10T08:00:00Z',
  },
  {
    id: 'c15', name: 'F6-VM-Dev', type: 'vm',
    factory_id: 'f6', factory_name: 'F6', status: 'PO',
    phases: [
      { phase: 'PO',           completionWeek: '2026-W20', status: 'estimated' },
      { phase: 'server_movein',completionWeek: '2026-W22', status: 'estimated' },
      { phase: 'infra',        completionWeek: '2026-W24', status: 'estimated' },
      { phase: 'cpld',         completionWeek: '2026-W26', status: 'estimated' },
      { phase: 'sipd',         completionWeek: '2026-W28', status: 'estimated' },
    ],
    created_at: '2025-06-15T08:00:00Z',
  },
  
  // F7: 5 clusters
  {
    id: 'c16', name: 'F7-K8S-Prod-A', type: 'k8s',
    factory_id: 'f7', factory_name: 'F7', status: 'sipd',
    phases: [
      { phase: 'PO',           completionWeek: '2026-W12', status: 'completed' },
      { phase: 'server_movein',completionWeek: '2026-W13', status: 'completed' },
      { phase: 'infra',        completionWeek: '2026-W15', status: 'completed' },
      { phase: 'cpld',         completionWeek: '2026-W16', status: 'completed' },
      { phase: 'sipd',         completionWeek: '2026-W17', status: 'completed' },
    ],
    created_at: '2025-07-10T08:00:00Z',
  },
  {
    id: 'c17', name: 'F7-K8S-Prod-B', type: 'k8s',
    factory_id: 'f7', factory_name: 'F7', status: 'infra',
    phases: [
      { phase: 'PO',           completionWeek: '2026-W16', status: 'completed' },
      { phase: 'server_movein',completionWeek: '2026-W17', status: 'completed' },
      { phase: 'infra',        completionWeek: '2026-W20', status: 'in_progress' },
      { phase: 'cpld',         completionWeek: '2026-W22', status: 'estimated' },
      { phase: 'sipd',         completionWeek: '2026-W24', status: 'estimated' },
    ],
    created_at: '2025-07-12T08:00:00Z',
  },
  {
    id: 'c18', name: 'F7-VM-Infra', type: 'vm',
    factory_id: 'f7', factory_name: 'F7', status: 'cpld',
    phases: [
      { phase: 'PO',           completionWeek: '2026-W15', status: 'completed' },
      { phase: 'server_movein',completionWeek: '2026-W16', status: 'completed' },
      { phase: 'infra',        completionWeek: '2026-W17', status: 'completed' },
      { phase: 'cpld',         completionWeek: '2026-W19', status: 'in_progress' },
      { phase: 'sipd',         completionWeek: '2026-W20', status: 'estimated' },
    ],
    created_at: '2025-07-15T08:00:00Z',
  },
  {
    id: 'c19', name: 'F7-K8S-Staging', type: 'k8s',
    factory_id: 'f7', factory_name: 'F7', status: 'server_movein',
    phases: [
      { phase: 'PO',           completionWeek: '2026-W17', status: 'completed' },
      { phase: 'server_movein',completionWeek: '2026-W20', status: 'blocked', note: '設施準備延遲' },
      { phase: 'infra',        completionWeek: '2026-W23', status: 'estimated' },
      { phase: 'cpld',         completionWeek: '2026-W25', status: 'estimated' },
      { phase: 'sipd',         completionWeek: '2026-W27', status: 'estimated' },
    ],
    created_at: '2025-07-18T08:00:00Z',
  },
  {
    id: 'c20', name: 'F7-VM-Dev', type: 'vm',
    factory_id: 'f7', factory_name: 'F7', status: 'PO',
    phases: [
      { phase: 'PO',           completionWeek: '2026-W26', status: 'estimated' },
      { phase: 'server_movein',completionWeek: '2026-W28', status: 'estimated' },
      { phase: 'infra',        completionWeek: '2026-W30', status: 'estimated' },
      { phase: 'cpld',         completionWeek: '2026-W32', status: 'estimated' },
      { phase: 'sipd',         completionWeek: '2026-W34', status: 'estimated' },
    ],
    created_at: '2025-07-20T08:00:00Z',
  },
  
  // F8: 2 clusters
  {
    id: 'c21', name: 'F8-K8S-Prod', type: 'k8s',
    factory_id: 'f8', factory_name: 'F8', status: 'infra',
    phases: [
      { phase: 'PO',           completionWeek: '2026-W18', status: 'completed' },
      { phase: 'server_movein',completionWeek: '2026-W19', status: 'completed' },
      { phase: 'infra',        completionWeek: '2026-W21', status: 'in_progress' },
      { phase: 'cpld',         completionWeek: '2026-W23', status: 'estimated' },
      { phase: 'sipd',         completionWeek: '2026-W25', status: 'estimated' },
    ],
    created_at: '2025-08-10T08:00:00Z',
  },
  {
    id: 'c22', name: 'F8-VM-Infra', type: 'vm',
    factory_id: 'f8', factory_name: 'F8', status: 'PO',
    phases: [
      { phase: 'PO',           completionWeek: '2026-W23', status: 'estimated' },
      { phase: 'server_movein',completionWeek: '2026-W25', status: 'estimated' },
      { phase: 'infra',        completionWeek: '2026-W27', status: 'estimated' },
      { phase: 'cpld',         completionWeek: '2026-W29', status: 'estimated' },
      { phase: 'sipd',         completionWeek: '2026-W31', status: 'estimated' },
    ],
    created_at: '2025-08-15T08:00:00Z',
  },
  
  // F9: 3 clusters
  {
    id: 'c23', name: 'F9-K8S-Prod', type: 'k8s',
    factory_id: 'f9', factory_name: 'F9', status: 'server_movein',
    phases: [
      { phase: 'PO',           completionWeek: '2026-W16', status: 'completed' },
      { phase: 'server_movein',completionWeek: '2026-W19', status: 'in_progress' },
      { phase: 'infra',        completionWeek: '2026-W21', status: 'estimated' },
      { phase: 'cpld',         completionWeek: '2026-W23', status: 'estimated' },
      { phase: 'sipd',         completionWeek: '2026-W25', status: 'estimated' },
    ],
    created_at: '2025-09-10T08:00:00Z',
  },
  {
    id: 'c24', name: 'F9-VM-Dev', type: 'vm',
    factory_id: 'f9', factory_name: 'F9', status: 'PO',
    phases: [
      { phase: 'PO',           completionWeek: '2026-W21', status: 'estimated' },
      { phase: 'server_movein',completionWeek: '2026-W23', status: 'estimated' },
      { phase: 'infra',        completionWeek: '2026-W25', status: 'estimated' },
      { phase: 'cpld',         completionWeek: '2026-W27', status: 'estimated' },
      { phase: 'sipd',         completionWeek: '2026-W29', status: 'estimated' },
    ],
    created_at: '2025-09-15T08:00:00Z',
  },
  {
    id: 'c25', name: 'F9-K8S-Staging', type: 'k8s',
    factory_id: 'f9', factory_name: 'F9', status: 'PO',
    phases: [
      { phase: 'PO',           completionWeek: '2026-W27', status: 'estimated' },
      { phase: 'server_movein',completionWeek: '2026-W29', status: 'estimated' },
      { phase: 'infra',        completionWeek: '2026-W31', status: 'estimated' },
      { phase: 'cpld',         completionWeek: '2026-W33', status: 'estimated' },
      { phase: 'sipd',         completionWeek: '2026-W35', status: 'estimated' },
    ],
    created_at: '2025-09-20T08:00:00Z',
  },
  
  // F10: 1 cluster
  {
    id: 'c26', name: 'F10-K8S-Main', type: 'k8s',
    factory_id: 'f10', factory_name: 'F10', status: 'PO',
    phases: [
      { phase: 'PO',           completionWeek: '2026-W24', status: 'estimated' },
      { phase: 'server_movein',completionWeek: '2026-W26', status: 'estimated' },
      { phase: 'infra',        completionWeek: '2026-W28', status: 'estimated' },
      { phase: 'cpld',         completionWeek: '2026-W30', status: 'estimated' },
      { phase: 'sipd',         completionWeek: '2026-W32', status: 'estimated' },
    ],
    created_at: '2025-10-10T08:00:00Z',
  },
];

