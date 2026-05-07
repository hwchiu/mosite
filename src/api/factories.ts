import type { Factory } from '../types';
import client from './client';

export async function listFactories(): Promise<Factory[]> {
  const { data } = await client.get<Factory[]>('/factories');
  return data;
}

export async function createFactory(data: { name: string }): Promise<Factory> {
  const { data: result } = await client.post<Factory>('/factories', data);
  return result;
}

export async function deleteFactory(id: string): Promise<void> {
  await client.delete(`/factories/${id}`);
}
