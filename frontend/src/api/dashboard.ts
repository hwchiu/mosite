import client from './client';
import type { DashboardSummary, FactoryBreakdown, ClusterUsage } from '../types';

export async function getSummary(): Promise<DashboardSummary> {
  const { data } = await client.get<DashboardSummary>('/dashboard/summary');
  return data;
}

export async function getByFactory(): Promise<FactoryBreakdown[]> {
  const { data } = await client.get<FactoryBreakdown[]>('/dashboard/by-factory');
  return data;
}

export async function getByCluster(): Promise<ClusterUsage[]> {
  const { data } = await client.get<ClusterUsage[]>('/dashboard/by-cluster');
  return data;
}

export async function getModelBreakdown(): Promise<{ model: string; count: number }[]> {
  const { data } = await client.get<{ model: string; count: number }[]>('/dashboard/model-breakdown');
  return data;
}

export async function getServiceBreakdown(): Promise<{ service_type: string; count: number }[]> {
  const { data } = await client.get<{ service_type: string; count: number }[]>('/dashboard/service-breakdown');
  return data;
}
