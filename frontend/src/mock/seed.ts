import type { Factory, Cluster, PurchaseBatch, ServerDetail } from '../types';

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

export const SEED_BATCHES: PurchaseBatch[] = [
  { id: 'b1', name: '2025-Q1-F1-Batch1', purchase_date: '2025-01-08', factory_id: 'f1', factory_name: 'F1', notes: 'F1 首批採購，含 Model 1 & 2', created_at: '2025-01-08T08:00:00Z', server_count: 10 },
  { id: 'b2', name: '2025-Q1-F2-Batch1', purchase_date: '2025-02-05', factory_id: 'f2', factory_name: 'F2', notes: 'F2 首批採購', created_at: '2025-02-05T08:00:00Z', server_count: 8 },
  { id: 'b3', name: '2025-Q2-F3-Batch1', purchase_date: '2025-04-10', factory_id: 'f3', factory_name: 'F3', notes: 'F3 Q2 採購，全部 Model 3', created_at: '2025-04-10T08:00:00Z', server_count: 6 },
];

export const SEED_SERVERS: ServerDetail[] = [
  // --- F1 / c1 (K8S) / b1 — active servers ---
  {
    id: 's01', hostname: 'f1-k8s-node-01', serial_number: 'SN-F1-001', ip_address: '10.1.1.1',
    model: 'model_1', service_type: 'k8s', status: 'active',
    factory_id: 'f1', factory_name: 'F1', cluster_id: 'c1', cluster_name: 'F1-K8S-Prod',
    batch_id: 'b1', batch_name: '2025-Q1-F1-Batch1',
    created_at: '2025-01-15T09:00:00Z', updated_at: '2025-03-01T10:00:00Z',
    audit_logs: [
      { id: 'al-s01-1', server_id: 's01', operator: 'alice', field: 'status', old_value: 'purchased', new_value: 'waiting_infra', comment: '移交給 Infra Team', created_at: '2025-01-20T09:00:00Z' },
      { id: 'al-s01-2', server_id: 's01', operator: 'bob', field: 'status', old_value: 'waiting_infra', new_value: 'waiting_cluster_setup', comment: 'Infra 設定完畢', created_at: '2025-02-01T09:00:00Z' },
      { id: 'al-s01-3', server_id: 's01', operator: 'alice', field: 'status', old_value: 'waiting_cluster_setup', new_value: 'waiting_platform', comment: 'Cluster 搭建完成', created_at: '2025-02-15T09:00:00Z' },
      { id: 'al-s01-4', server_id: 's01', operator: 'carol', field: 'status', old_value: 'waiting_platform', new_value: 'active', comment: 'Platform 部署完成，上線', created_at: '2025-03-01T10:00:00Z' },
    ],
  },
  {
    id: 's02', hostname: 'f1-k8s-node-02', serial_number: 'SN-F1-002', ip_address: '10.1.1.2',
    model: 'model_1', service_type: 'k8s', status: 'active',
    factory_id: 'f1', factory_name: 'F1', cluster_id: 'c1', cluster_name: 'F1-K8S-Prod',
    batch_id: 'b1', batch_name: '2025-Q1-F1-Batch1',
    created_at: '2025-01-15T09:00:00Z', updated_at: '2025-03-01T10:00:00Z',
    audit_logs: [
      { id: 'al-s02-1', server_id: 's02', operator: 'alice', field: 'status', old_value: 'purchased', new_value: 'waiting_infra', comment: '移交給 Infra Team', created_at: '2025-01-20T09:00:00Z' },
      { id: 'al-s02-2', server_id: 's02', operator: 'bob', field: 'status', old_value: 'waiting_infra', new_value: 'active', comment: '快速通道上線', created_at: '2025-03-01T10:00:00Z' },
    ],
  },
  {
    id: 's03', hostname: 'f1-k8s-node-03', serial_number: 'SN-F1-003', ip_address: '10.1.1.3',
    model: 'model_2', service_type: 'k8s', status: 'waiting_platform',
    factory_id: 'f1', factory_name: 'F1', cluster_id: 'c1', cluster_name: 'F1-K8S-Prod',
    batch_id: 'b1', batch_name: '2025-Q1-F1-Batch1',
    created_at: '2025-01-15T09:00:00Z', updated_at: '2025-04-01T09:00:00Z',
    audit_logs: [
      { id: 'al-s03-1', server_id: 's03', operator: 'alice', field: 'status', old_value: 'purchased', new_value: 'waiting_infra', comment: '', created_at: '2025-01-20T09:00:00Z' },
      { id: 'al-s03-2', server_id: 's03', operator: 'bob', field: 'status', old_value: 'waiting_infra', new_value: 'waiting_cluster_setup', comment: '', created_at: '2025-02-10T09:00:00Z' },
      { id: 'al-s03-3', server_id: 's03', operator: 'dave', field: 'status', old_value: 'waiting_cluster_setup', new_value: 'waiting_platform', comment: 'Cluster 節點加入完畢', created_at: '2025-04-01T09:00:00Z' },
    ],
  },
  // --- F1 / c2 (VM) / b1 ---
  {
    id: 's04', hostname: 'f1-vm-host-01', serial_number: 'SN-F1-004', ip_address: '10.1.2.1',
    model: 'model_2', service_type: 'vm', status: 'active',
    factory_id: 'f1', factory_name: 'F1', cluster_id: 'c2', cluster_name: 'F1-VM-Infra',
    batch_id: 'b1', batch_name: '2025-Q1-F1-Batch1',
    created_at: '2025-01-15T09:00:00Z', updated_at: '2025-03-10T09:00:00Z',
    audit_logs: [
      { id: 'al-s04-1', server_id: 's04', operator: 'bob', field: 'status', old_value: 'purchased', new_value: 'active', comment: 'VM 主機直接上線', created_at: '2025-03-10T09:00:00Z' },
    ],
  },
  {
    id: 's05', hostname: 'f1-vm-host-02', serial_number: 'SN-F1-005', ip_address: '10.1.2.2',
    model: 'model_2', service_type: 'vm', status: 'waiting_infra',
    factory_id: 'f1', factory_name: 'F1', cluster_id: undefined, cluster_name: undefined,
    batch_id: 'b1', batch_name: '2025-Q1-F1-Batch1',
    created_at: '2025-01-15T09:00:00Z', updated_at: '2025-01-20T09:00:00Z',
    audit_logs: [
      { id: 'al-s05-1', server_id: 's05', operator: 'alice', field: 'status', old_value: 'purchased', new_value: 'waiting_infra', comment: '', created_at: '2025-01-20T09:00:00Z' },
    ],
  },
  // --- F1 unassigned ---
  {
    id: 's06', hostname: 'f1-spare-01', serial_number: 'SN-F1-006', ip_address: undefined,
    model: 'model_3', service_type: 'k8s', status: 'purchased',
    factory_id: 'f1', factory_name: 'F1', cluster_id: undefined, cluster_name: undefined,
    batch_id: 'b1', batch_name: '2025-Q1-F1-Batch1',
    created_at: '2025-01-15T09:00:00Z', updated_at: '2025-01-15T09:00:00Z',
    audit_logs: [],
  },
  // --- F2 / c3 (K8S) / b2 ---
  {
    id: 's07', hostname: 'f2-k8s-node-01', serial_number: 'SN-F2-001', ip_address: '10.2.1.1',
    model: 'model_1', service_type: 'k8s', status: 'active',
    factory_id: 'f2', factory_name: 'F2', cluster_id: 'c3', cluster_name: 'F2-K8S-Prod',
    batch_id: 'b2', batch_name: '2025-Q1-F2-Batch1',
    created_at: '2025-02-10T09:00:00Z', updated_at: '2025-04-05T09:00:00Z',
    audit_logs: [
      { id: 'al-s07-1', server_id: 's07', operator: 'eve', field: 'status', old_value: 'purchased', new_value: 'active', comment: 'F2 K8S 節點上線', created_at: '2025-04-05T09:00:00Z' },
    ],
  },
  {
    id: 's08', hostname: 'f2-k8s-node-02', serial_number: 'SN-F2-002', ip_address: '10.2.1.2',
    model: 'model_1', service_type: 'k8s', status: 'active',
    factory_id: 'f2', factory_name: 'F2', cluster_id: 'c3', cluster_name: 'F2-K8S-Prod',
    batch_id: 'b2', batch_name: '2025-Q1-F2-Batch1',
    created_at: '2025-02-10T09:00:00Z', updated_at: '2025-04-05T09:00:00Z',
    audit_logs: [
      { id: 'al-s08-1', server_id: 's08', operator: 'eve', field: 'status', old_value: 'purchased', new_value: 'active', comment: 'F2 K8S 節點上線', created_at: '2025-04-05T09:00:00Z' },
    ],
  },
  {
    id: 's09', hostname: 'f2-k8s-node-03', serial_number: 'SN-F2-003', ip_address: '10.2.1.3',
    model: 'model_2', service_type: 'k8s', status: 'waiting_cluster_setup',
    factory_id: 'f2', factory_name: 'F2', cluster_id: 'c3', cluster_name: 'F2-K8S-Prod',
    batch_id: 'b2', batch_name: '2025-Q1-F2-Batch1',
    created_at: '2025-02-10T09:00:00Z', updated_at: '2025-03-20T09:00:00Z',
    audit_logs: [
      { id: 'al-s09-1', server_id: 's09', operator: 'frank', field: 'status', old_value: 'purchased', new_value: 'waiting_infra', comment: '', created_at: '2025-02-15T09:00:00Z' },
      { id: 'al-s09-2', server_id: 's09', operator: 'eve', field: 'status', old_value: 'waiting_infra', new_value: 'waiting_cluster_setup', comment: 'Infra 完成', created_at: '2025-03-20T09:00:00Z' },
    ],
  },
  {
    id: 's10', hostname: 'f2-spare-01', serial_number: 'SN-F2-004', ip_address: undefined,
    model: 'model_3', service_type: 'vm', status: 'purchased',
    factory_id: 'f2', factory_name: 'F2', cluster_id: undefined, cluster_name: undefined,
    batch_id: 'b2', batch_name: '2025-Q1-F2-Batch1',
    created_at: '2025-02-10T09:00:00Z', updated_at: '2025-02-10T09:00:00Z',
    audit_logs: [],
  },
  {
    id: 's11', hostname: 'f2-spare-02', serial_number: 'SN-F2-005', ip_address: undefined,
    model: 'model_3', service_type: 'k8s', status: 'waiting_infra',
    factory_id: 'f2', factory_name: 'F2', cluster_id: undefined, cluster_name: undefined,
    batch_id: 'b2', batch_name: '2025-Q1-F2-Batch1',
    created_at: '2025-02-10T09:00:00Z', updated_at: '2025-02-20T09:00:00Z',
    audit_logs: [
      { id: 'al-s11-1', server_id: 's11', operator: 'frank', field: 'status', old_value: 'purchased', new_value: 'waiting_infra', comment: '', created_at: '2025-02-20T09:00:00Z' },
    ],
  },
  // --- F3 / c4 (K8S-Staging) / b3 ---
  {
    id: 's12', hostname: 'f3-k8s-stg-01', serial_number: 'SN-F3-001', ip_address: '10.3.1.1',
    model: 'model_3', service_type: 'k8s', status: 'waiting_platform',
    factory_id: 'f3', factory_name: 'F3', cluster_id: 'c4', cluster_name: 'F3-K8S-Staging',
    batch_id: 'b3', batch_name: '2025-Q2-F3-Batch1',
    created_at: '2025-04-15T09:00:00Z', updated_at: '2025-04-28T09:00:00Z',
    audit_logs: [
      { id: 'al-s12-1', server_id: 's12', operator: 'grace', field: 'status', old_value: 'purchased', new_value: 'waiting_infra', comment: '', created_at: '2025-04-16T09:00:00Z' },
      { id: 'al-s12-2', server_id: 's12', operator: 'henry', field: 'status', old_value: 'waiting_infra', new_value: 'waiting_cluster_setup', comment: 'Infra 完成', created_at: '2025-04-20T09:00:00Z' },
      { id: 'al-s12-3', server_id: 's12', operator: 'grace', field: 'status', old_value: 'waiting_cluster_setup', new_value: 'waiting_platform', comment: 'K8S 節點加入', created_at: '2025-04-28T09:00:00Z' },
    ],
  },
  {
    id: 's13', hostname: 'f3-k8s-stg-02', serial_number: 'SN-F3-002', ip_address: '10.3.1.2',
    model: 'model_3', service_type: 'k8s', status: 'waiting_cluster_setup',
    factory_id: 'f3', factory_name: 'F3', cluster_id: 'c4', cluster_name: 'F3-K8S-Staging',
    batch_id: 'b3', batch_name: '2025-Q2-F3-Batch1',
    created_at: '2025-04-15T09:00:00Z', updated_at: '2025-04-22T09:00:00Z',
    audit_logs: [
      { id: 'al-s13-1', server_id: 's13', operator: 'grace', field: 'status', old_value: 'purchased', new_value: 'waiting_infra', comment: '', created_at: '2025-04-16T09:00:00Z' },
      { id: 'al-s13-2', server_id: 's13', operator: 'henry', field: 'status', old_value: 'waiting_infra', new_value: 'waiting_cluster_setup', comment: '', created_at: '2025-04-22T09:00:00Z' },
    ],
  },
  {
    id: 's14', hostname: 'f3-vm-dev-01', serial_number: 'SN-F3-003', ip_address: '10.3.2.1',
    model: 'model_3', service_type: 'vm', status: 'purchased',
    factory_id: 'f3', factory_name: 'F3', cluster_id: 'c5', cluster_name: 'F3-VM-Dev',
    batch_id: 'b3', batch_name: '2025-Q2-F3-Batch1',
    created_at: '2025-04-15T09:00:00Z', updated_at: '2025-04-15T09:00:00Z',
    audit_logs: [],
  },
  {
    id: 's15', hostname: 'f3-spare-01', serial_number: 'SN-F3-004', ip_address: undefined,
    model: 'model_2', service_type: 'k8s', status: 'purchased',
    factory_id: 'f3', factory_name: 'F3', cluster_id: undefined, cluster_name: undefined,
    batch_id: 'b3', batch_name: '2025-Q2-F3-Batch1',
    created_at: '2025-04-15T09:00:00Z', updated_at: '2025-04-15T09:00:00Z',
    audit_logs: [],
  },
  // --- F4 — all purchased (新批次剛到) ---
  {
    id: 's16', hostname: 'f4-node-01', serial_number: 'SN-F4-001', ip_address: undefined,
    model: 'model_1', service_type: 'k8s', status: 'purchased',
    factory_id: 'f4', factory_name: 'F4', cluster_id: undefined, cluster_name: undefined,
    batch_id: undefined, batch_name: undefined,
    created_at: '2025-05-01T09:00:00Z', updated_at: '2025-05-01T09:00:00Z',
    audit_logs: [],
  },
  {
    id: 's17', hostname: 'f4-node-02', serial_number: 'SN-F4-002', ip_address: undefined,
    model: 'model_1', service_type: 'k8s', status: 'purchased',
    factory_id: 'f4', factory_name: 'F4', cluster_id: undefined, cluster_name: undefined,
    batch_id: undefined, batch_name: undefined,
    created_at: '2025-05-01T09:00:00Z', updated_at: '2025-05-01T09:00:00Z',
    audit_logs: [],
  },
  {
    id: 's18', hostname: 'f4-node-03', serial_number: 'SN-F4-003', ip_address: undefined,
    model: 'model_2', service_type: 'vm', status: 'purchased',
    factory_id: 'f4', factory_name: 'F4', cluster_id: undefined, cluster_name: undefined,
    batch_id: undefined, batch_name: undefined,
    created_at: '2025-05-01T09:00:00Z', updated_at: '2025-05-01T09:00:00Z',
    audit_logs: [],
  },
  // --- F1 retired ---
  {
    id: 's19', hostname: 'f1-k8s-old-01', serial_number: 'SN-F1-OLD-001', ip_address: '10.1.1.99',
    model: 'model_1', service_type: 'k8s', status: 'retired',
    factory_id: 'f1', factory_name: 'F1', cluster_id: undefined, cluster_name: undefined,
    batch_id: 'b1', batch_name: '2025-Q1-F1-Batch1', notes: '硬體故障，已退役',
    created_at: '2025-01-15T09:00:00Z', updated_at: '2025-04-20T09:00:00Z',
    audit_logs: [
      { id: 'al-s19-1', server_id: 's19', operator: 'alice', field: 'status', old_value: 'active', new_value: 'retired', comment: '硬體故障，CPU 損壞', created_at: '2025-04-20T09:00:00Z' },
    ],
  },
];
