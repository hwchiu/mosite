export type ServerStatus =
  | 'purchased'
  | 'waiting_infra'
  | 'waiting_cluster_setup'
  | 'waiting_platform'
  | 'active'
  | 'retired';

export type ServerModel = 'model_1' | 'model_2' | 'model_3';
export type ServiceType = 'k8s' | 'vm';
export type ClusterType = 'k8s' | 'vm';

export interface Factory {
  id: string;
  name: string;
  created_at: string;
}

export interface Cluster {
  id: string;
  name: string;
  type: ClusterType;
  factory_id: string;
  factory_name?: string;
  description?: string;
  created_at: string;
}

export interface PurchaseBatch {
  id: string;
  name: string;
  purchase_date: string;
  factory_id?: string;
  factory_name?: string;
  notes?: string;
  created_at: string;
  server_count?: number;
}

export interface Server {
  id: string;
  hostname: string;
  serial_number: string;
  ip_address?: string;
  model: ServerModel;
  service_type: ServiceType;
  status: ServerStatus;
  factory_id: string;
  factory_name?: string;
  cluster_id?: string;
  cluster_name?: string;
  batch_id?: string;
  batch_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  server_id: string;
  operator: string;
  field: string;
  old_value?: string;
  new_value?: string;
  comment?: string;
  created_at: string;
}

export interface ServerDetail extends Server {
  audit_logs: AuditLog[];
}

export interface DashboardSummary {
  status_counts: Record<ServerStatus, number>;
  total: number;
}

export interface FactoryBreakdown {
  factory_id: string;
  factory_name: string;
  status_counts: Record<ServerStatus, number>;
  total: number;
}

export interface ClusterUsage {
  cluster_id: string;
  cluster_name: string;
  cluster_type: ClusterType;
  factory_name: string;
  total_servers: number;
  active_count: number;
  available_count: number;
}
