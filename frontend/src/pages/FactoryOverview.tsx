import { useQuery } from '@tanstack/react-query';
import { listFactories } from '../api/factories';
import { listClusters } from '../api/clusters';
import { listServers } from '../api/servers';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import { useState } from 'react';
import type { ServerStatus } from '../types';

const ALL_STATUSES: ServerStatus[] = [
  'purchased',
  'waiting_infra',
  'waiting_cluster_setup',
  'waiting_platform',
  'active',
  'retired',
];

const STATUS_LABEL: Record<ServerStatus, string> = {
  purchased: '採購完畢',
  waiting_infra: '待 Infra',
  waiting_cluster_setup: '待 Cluster',
  waiting_platform: '待 Platform',
  active: '上線',
  retired: '退役',
};

const STATUS_DOT: Record<ServerStatus, string> = {
  purchased: 'bg-gray-400',
  waiting_infra: 'bg-yellow-400',
  waiting_cluster_setup: 'bg-orange-400',
  waiting_platform: 'bg-blue-400',
  active: 'bg-green-500',
  retired: 'bg-red-400',
};

const CLUSTER_TYPE_STYLE: Record<string, string> = {
  k8s: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
  vm: 'bg-teal-100 text-teal-700 border border-teal-200',
};

export default function FactoryOverview() {
  const [selectedFactory, setSelectedFactory] = useState<string>('all');

  const { data: factories, isLoading: lf } = useQuery({ queryKey: ['factories'], queryFn: listFactories });
  const { data: clusters, isLoading: lc } = useQuery({ queryKey: ['clusters'], queryFn: () => listClusters() });
  const { data: servers, isLoading: ls } = useQuery({ queryKey: ['servers'], queryFn: () => listServers() });

  if (lf || lc || ls) return <LoadingSpinner />;

  const visibleFactories = selectedFactory === 'all'
    ? (factories ?? [])
    : (factories ?? []).filter(f => f.id === selectedFactory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">廠區 Cluster 總覽</h1>
          <p className="text-sm text-gray-500 mt-0.5">各廠區 Cluster 建置狀況快照</p>
        </div>
        {/* Factory filter */}
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={selectedFactory}
          onChange={e => setSelectedFactory(e.target.value)}
        >
          <option value="all">全部廠區</option>
          {(factories ?? []).map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      {/* Per-factory sections */}
      {visibleFactories.map(factory => {
        const factoryClusters = (clusters ?? []).filter(c => c.factory_id === factory.id);
        const factoryServers = (servers ?? []).filter(s => s.factory_id === factory.id);
        const unassignedServers = factoryServers.filter(s => !s.cluster_id);
        const totalActive = factoryServers.filter(s => s.status === 'active').length;

        return (
          <section key={factory.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Factory header */}
            <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-800">{factory.name}</span>
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                  {factoryServers.length} 台機器
                </span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  {totalActive} 台上線
                </span>
              </div>
              <span className="text-sm text-gray-500">{factoryClusters.length} 個 Cluster</span>
            </div>

            <div className="p-5">
              {factoryClusters.length === 0 ? (
                <p className="text-sm text-gray-400 italic">此廠區尚無 Cluster</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {factoryClusters.map(cluster => {
                    const clusterServers = factoryServers.filter(s => s.cluster_id === cluster.id);
                    const total = clusterServers.length;
                    const activeCount = clusterServers.filter(s => s.status === 'active').length;
                    const progressPct = total > 0 ? Math.round((activeCount / total) * 100) : 0;

                    const statusCounts = Object.fromEntries(
                      ALL_STATUSES.map(st => [st, clusterServers.filter(s => s.status === st).length])
                    ) as Record<ServerStatus, number>;

                    // Determine cluster "build status" from worst-case server status
                    const buildStatuses = clusterServers.map(s => s.status);
                    const overallStatus: ServerStatus =
                      buildStatuses.includes('purchased') ? 'purchased' :
                      buildStatuses.includes('waiting_infra') ? 'waiting_infra' :
                      buildStatuses.includes('waiting_cluster_setup') ? 'waiting_cluster_setup' :
                      buildStatuses.includes('waiting_platform') ? 'waiting_platform' :
                      buildStatuses.length > 0 && buildStatuses.every(s => s === 'active' || s === 'retired') ? 'active' :
                      'purchased';

                    return (
                      <div
                        key={cluster.id}
                        className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow bg-white"
                      >
                        {/* Cluster title row */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <p className="font-semibold text-gray-800 text-sm leading-tight">{cluster.name}</p>
                            {cluster.description && (
                              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{cluster.description}</p>
                            )}
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${CLUSTER_TYPE_STYLE[cluster.type]}`}>
                            {cluster.type.toUpperCase()}
                          </span>
                        </div>

                        {/* Overall status */}
                        <div className="mb-3">
                          <StatusBadge status={overallStatus} />
                        </div>

                        {/* Progress bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>上線進度</span>
                            <span>{activeCount} / {total} 台 ({progressPct}%)</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full transition-all"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>

                        {/* Status breakdown dots */}
                        <div className="flex flex-wrap gap-2">
                          {ALL_STATUSES.filter(st => statusCounts[st] > 0).map(st => (
                            <div key={st} className="flex items-center gap-1 text-xs text-gray-600">
                              <span className={`w-2 h-2 rounded-full ${STATUS_DOT[st]}`} />
                              <span>{STATUS_LABEL[st]}: {statusCounts[st]}</span>
                            </div>
                          ))}
                          {total === 0 && (
                            <span className="text-xs text-gray-400 italic">尚無機器指派</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Unassigned servers in this factory */}
              {unassignedServers.length > 0 && (
                <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    未指派 Cluster 的機器（{unassignedServers.length} 台）
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ALL_STATUSES.map(st => {
                      const cnt = unassignedServers.filter(s => s.status === st).length;
                      if (cnt === 0) return null;
                      return (
                        <div key={st} className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
                          <span className={`w-2 h-2 rounded-full ${STATUS_DOT[st]}`} />
                          <span>{STATUS_LABEL[st]}: {cnt}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>
        );
      })}

      {visibleFactories.length === 0 && (
        <div className="text-center py-16 text-gray-400">尚無廠區資料</div>
      )}
    </div>
  );
}
