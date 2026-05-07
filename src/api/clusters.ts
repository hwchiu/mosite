import type { Cluster, ClusterPhase, ClusterType, OperationType, RescheduleNote } from '../types';
import client from './client';

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
  const { data } = await client.get<Cluster[]>('/clusters', { params });
  return data;
}

export async function createCluster(data: CreateClusterData): Promise<Cluster> {
  const { data: result } = await client.post<Cluster>('/clusters', data);
  return result;
}

export async function getCluster(id: string): Promise<Cluster> {
  const { data } = await client.get<Cluster>(`/clusters/${id}`);
  return data;
}

export async function updateCluster(
  id: string,
  data: Partial<Pick<Cluster, 'name' | 'description' | 'factory_id' | 'type' | 'phases'>>
): Promise<Cluster> {
  const { data: result } = await client.put<Cluster>(`/clusters/${id}`, data);
  return result;
}

export async function deleteCluster(id: string): Promise<void> {
  await client.delete(`/clusters/${id}`);
}

export interface CreateOperationData {
  type: OperationType;
  label?: string;
  phases: ClusterPhase[];
}

export async function addOperation(clusterId: string, data: CreateOperationData): Promise<Cluster> {
  const { data: result } = await client.post<Cluster>(`/clusters/${clusterId}/operations`, data);
  return result;
}

export async function updateOperation(
  clusterId: string,
  operationId: string,
  phases: ClusterPhase[],
): Promise<Cluster> {
  const { data: result } = await client.put<Cluster>(
    `/clusters/${clusterId}/operations/${operationId}`,
    { phases },
  );
  return result;
}

export async function deleteOperation(clusterId: string, operationId: string): Promise<void> {
  await client.delete(`/clusters/${clusterId}/operations/${operationId}`);
}

export async function addRescheduleNote(
  clusterId: string,
  operationId: string,
  note: string,
): Promise<RescheduleNote> {
  const { data } = await client.post<RescheduleNote>(
    `/clusters/${clusterId}/operations/${operationId}/notes`,
    { note },
  );
  return data;
}

export async function updateRescheduleNote(
  clusterId: string,
  operationId: string,
  noteId: string,
  note: string,
): Promise<RescheduleNote> {
  const { data } = await client.put<RescheduleNote>(
    `/clusters/${clusterId}/operations/${operationId}/notes/${noteId}`,
    { note },
  );
  return data;
}

export async function deleteRescheduleNote(
  clusterId: string,
  operationId: string,
  noteId: string,
): Promise<void> {
  await client.delete(
    `/clusters/${clusterId}/operations/${operationId}/notes/${noteId}`,
  );
}
