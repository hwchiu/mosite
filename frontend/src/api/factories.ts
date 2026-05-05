import client from './client';
import type { Factory } from '../types';

export async function listFactories(): Promise<Factory[]> {
  const { data } = await client.get<Factory[]>('/factories');
  return data;
}

export async function createFactory(data: { name: string }): Promise<Factory> {
  const { data: resp } = await client.post<Factory>('/factories', data);
  return resp;
}

export async function deleteFactory(id: string): Promise<void> {
  await client.delete(`/factories/${id}`);
}
