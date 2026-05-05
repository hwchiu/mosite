import type { Server, ServerDetail, ServerStatus } from '../types';
import {
  db_listServers, db_createServer, db_bulkCreateServers,
  db_getServer, db_updateServer, db_transitionStatus, db_deleteServer,
} from '../mock/store';
import type { ServerListParams } from '../mock/store';

export type { ServerListParams };

export async function listServers(params?: ServerListParams): Promise<Server[]> {
  return db_listServers(params);
}

export async function createServer(data: Partial<Server>): Promise<Server> {
  return db_createServer(data as Parameters<typeof db_createServer>[0]);
}

export async function bulkCreateServers(data: Partial<Server>[]): Promise<Server[]> {
  return db_bulkCreateServers(data as Parameters<typeof db_bulkCreateServers>[0]);
}

export async function getServer(id: string): Promise<ServerDetail> {
  return db_getServer(id);
}

export async function updateServer(id: string, data: Partial<Server> & { operator?: string; comment?: string }): Promise<Server> {
  return db_updateServer(id, data);
}

export async function deleteServer(id: string, operator = 'system', comment?: string): Promise<void> {
  return db_deleteServer(id, operator, comment);
}

export async function transitionStatus(
  id: string,
  data: { status: ServerStatus; operator: string; comment?: string }
): Promise<Server> {
  return db_transitionStatus(id, data.status, data.operator, data.comment);
}
