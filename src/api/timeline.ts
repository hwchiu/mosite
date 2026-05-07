import client from './client';
import type { Cluster } from '../types';

export async function fetchTimelineClusters(): Promise<Cluster[]> {
  const { data } = await client.get<Cluster[]>('/timeline');
  return data;
}
