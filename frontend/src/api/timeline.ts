import { db_getTimelineClusters } from '../mock/store';
import type { Cluster } from '../types';

export async function fetchTimelineClusters(): Promise<Cluster[]> {
  return db_getTimelineClusters();
}
