import type { DashboardSummary, FactoryBreakdown, ClusterUsage } from '../types';
import {
  db_getDashboardSummary,
  db_getByFactory,
  db_getByCluster,
  db_getModelBreakdown,
  db_getServiceBreakdown,
} from '../mock/store';

export async function getSummary(): Promise<DashboardSummary> {
  return db_getDashboardSummary();
}

export async function getByFactory(): Promise<FactoryBreakdown[]> {
  return db_getByFactory();
}

export async function getByCluster(): Promise<ClusterUsage[]> {
  return db_getByCluster();
}

export async function getModelBreakdown(): Promise<{ model: string; count: number }[]> {
  return db_getModelBreakdown();
}

export async function getServiceBreakdown(): Promise<{ service_type: string; count: number }[]> {
  return db_getServiceBreakdown();
}
