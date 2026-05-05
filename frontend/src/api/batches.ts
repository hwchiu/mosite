import type { PurchaseBatch } from '../types';
import { db_listBatches, db_createBatch, db_getBatch, db_updateBatch } from '../mock/store';

export interface BatchListParams {
  factory_id?: string;
}

export interface CreateBatchData {
  name: string;
  purchase_date: string;
  factory_id?: string;
  notes?: string;
}

export async function listBatches(params?: BatchListParams): Promise<PurchaseBatch[]> {
  return db_listBatches(params?.factory_id);
}

export async function createBatch(data: CreateBatchData): Promise<PurchaseBatch> {
  return db_createBatch(data);
}

export async function getBatch(id: string): Promise<PurchaseBatch> {
  return db_getBatch(id);
}

export async function updateBatch(id: string, data: Partial<CreateBatchData>): Promise<PurchaseBatch> {
  return db_updateBatch(id, data);
}
