import type { Cluster, ClusterType } from '../types';
import { db_listClusters, db_createCluster, db_getCluster, db_updateCluster, db_deleteCluster } from '../mock/store';

export interface ClusterListParams {
  factory_id?: string;
  type?: ClusterType;
}

export interface CreateClusterData {
  name: string;
  type: ClusterType;
  factory_id: string;
  description?: string;
}

export async function listClusters(params?: ClusterListParams): Promise<Cluster[]> {
  return db_listClusters(params?.factory_id, params?.type);
}

export async function createCluster(data: CreateClusterData): Promise<Cluster> {
  return db_createCluster(data);
}

export async function getCluster(id: string): Promise<Cluster> {
  return db_getCluster(id);
}

export async function updateCluster(id: string, data: Partial<CreateClusterData>): Promise<Cluster> {
  return db_updateCluster(id, data);
}

export async function deleteCluster(id: string): Promise<void> {
  return db_deleteCluster(id);
}
