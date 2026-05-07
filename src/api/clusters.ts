import type { Cluster, ClusterPhase, ClusterType, OperationType } from '../types';
import {
  db_listClusters, db_createCluster, db_getCluster, db_updateCluster, db_deleteCluster,
  db_addOperation, db_updateOperation, db_deleteOperation,
} from '../mock/store';

export interface ClusterListParams {
  factory_id?: string;
  type?: ClusterType;
}

export interface CreateClusterData {
  name: string;
  type: ClusterType;
  factory_id: string;
  phases: ClusterPhase[];
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

export async function updateCluster(
  id: string, 
  data: Partial<Pick<Cluster, 'name' | 'description' | 'factory_id' | 'type' | 'phases'>>
): Promise<Cluster> {
  return db_updateCluster(id, data);
}

export async function deleteCluster(id: string): Promise<void> {
  return db_deleteCluster(id);
}

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
