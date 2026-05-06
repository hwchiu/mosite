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
  phases?: ClusterPhase[];
}

export interface DashboardSummary {
  status_counts: Record<ClusterStatus, number>;
  total: number;
}
