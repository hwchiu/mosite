import type { Factory } from '../types';
import { db_listFactories, db_createFactory, db_deleteFactory } from '../mock/store';

export async function listFactories(): Promise<Factory[]> {
  return db_listFactories();
}

export async function createFactory(data: { name: string }): Promise<Factory> {
  return db_createFactory(data.name);
}

export async function deleteFactory(id: string): Promise<void> {
  return db_deleteFactory(id);
}
