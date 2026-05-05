import client from './client';
import type { Server, ServerDetail, ServerStatus } from '../types';

export interface ServerListParams {
  factory_id?: string;
  status?: string;
  model?: string;
  service_type?: string;
  search?: string;
}

export async function listServers(params?: ServerListParams): Promise<Server[]> {
  const { data } = await client.get<Server[]>('/servers', { params });
  return data;
}

export async function createServer(data: Partial<Server>): Promise<Server> {
  const { data: resp } = await client.post<Server>('/servers', data);
  return resp;
}

export async function bulkCreateServers(data: Partial<Server>[]): Promise<Server[]> {
  const { data: resp } = await client.post<Server[]>('/servers/bulk', data);
  return resp;
}

export async function getServer(id: string): Promise<ServerDetail> {
  const { data } = await client.get<ServerDetail>(`/servers/${id}`);
  return data;
}

export async function updateServer(id: string, data: Partial<Server>): Promise<Server> {
  const { data: resp } = await client.put<Server>(`/servers/${id}`, data);
  return resp;
}

export async function deleteServer(id: string): Promise<void> {
  await client.delete(`/servers/${id}`);
}

export async function transitionStatus(
  id: string,
  data: { status: ServerStatus; operator: string; comment?: string }
): Promise<Server> {
  const { data: resp } = await client.post<Server>(`/servers/${id}/transition`, data);
  return resp;
}
