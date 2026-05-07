import type { DashboardSummary } from '../types';
import client from './client';

export async function getSummary(): Promise<DashboardSummary> {
  const { data } = await client.get<DashboardSummary>('/dashboard');
  return data;
}
