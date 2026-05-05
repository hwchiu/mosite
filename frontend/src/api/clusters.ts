import client from './client';
import type { Cluster, ClusterType } from '../types';

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
  const { data } = await client.get<Cluster[]>('/clusters', { params });
  return data;
}

export async function createCluster(data: CreateClusterData): Promise<Cluster> {
  const { data: resp } = await client.post<Cluster>('/clusters', data);
  return resp;
}

export async function getCluster(id: string): Promise<Cluster> {
  const { data } = await client.get<Cluster>(`/clusters/${id}`);
  return data;
}

export async function updateCluster(id: string, data: Partial<CreateClusterData>): Promise<Cluster> {
  const { data: resp } = await client.put<Cluster>(`/clusters/${id}`, data);
  return resp;
}

export async function deleteCluster(id: string): Promise<void> {
  await client.delete(`/clusters/${id}`);
}
