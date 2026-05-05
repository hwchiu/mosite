import type { DashboardSummary } from '../types';
import { db_getDashboardSummary } from '../mock/store';

export async function getSummary(): Promise<DashboardSummary> {
  return db_getDashboardSummary();
}
