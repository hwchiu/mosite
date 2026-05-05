import client from './client';
import type { PurchaseBatch } from '../types';

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
  const { data } = await client.get<PurchaseBatch[]>('/batches', { params });
  return data;
}

export async function createBatch(data: CreateBatchData): Promise<PurchaseBatch> {
  const { data: resp } = await client.post<PurchaseBatch>('/batches', data);
  return resp;
}

export async function getBatch(id: string): Promise<PurchaseBatch> {
  const { data } = await client.get<PurchaseBatch>(`/batches/${id}`);
  return data;
}

export async function updateBatch(id: string, data: Partial<CreateBatchData>): Promise<PurchaseBatch> {
  const { data: resp } = await client.put<PurchaseBatch>(`/batches/${id}`, data);
  return resp;
}
