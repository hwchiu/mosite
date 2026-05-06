import { useQuery } from '@tanstack/react-query';
import LoadingSpinner from '../components/LoadingSpinner';
import { getSummary } from '../api/dashboard';
import { listClusters } from '../api/clusters';
import type { ClusterStatus } from '../types';

const STATUS_CONFIG: Record<ClusterStatus, { label: string; bg: string; text: string; border: string; dotColor: string }> = {
  purchase: { label: 'Purchase', bg: 'bg-gray-50',    text: 'text-gray-700',    border: 'border-gray-200',    dotColor: '#94a3b8' },
  movein:   { label: 'Move-In',  bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dotColor: '#f59e0b' },
  infra:    { label: 'Infra',    bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200',  dotColor: '#6366f1' },
  cluster:  { label: 'Cluster',  bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dotColor: '#3b82f6' },
  platform: { label: 'Platform', bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  dotColor: '#8b5cf6' },
  release:  { label: 'Release',  bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dotColor: '#10b981' },
};

const CLUSTER_STATUSES: ClusterStatus[] = ['purchase', 'movein', 'infra', 'cluster', 'platform', 'release'];

export default function Dashboard() {
  const summaryQ = useQuery({ queryKey: ['dashboard-summary'], queryFn: getSummary });
  const clustersQ = useQuery({ queryKey: ['clusters'], queryFn: () => listClusters() });
  
  if (summaryQ.isLoading || clustersQ.isLoading) return <LoadingSpinner />;
  
  const summary = summaryQ.data;
  const clusters = clustersQ.data ?? [];
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">共 {summary?.total ?? 0} 個 Cluster</p>
      </div>
      
      {/* 6 status cards */}
      <div className="grid grid-cols-6 gap-4">
        {CLUSTER_STATUSES.map(status => {
          const config = STATUS_CONFIG[status];
          const count = summary?.status_counts[status] ?? 0;
          return (
            <div
              key={status}
              className={`${config.bg} ${config.border} border rounded-xl p-4 shadow-sm`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: config.dotColor }}
                />
                <span className="text-xs font-medium text-gray-600">{config.label}</span>
              </div>
              <div className={`text-3xl font-bold ${config.text}`}>{count}</div>
            </div>
          );
        })}
      </div>
      
      {/* Recent clusters table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">所有 Clusters</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factory</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clusters
                .sort((a, b) => (a.factory_name ?? '').localeCompare(b.factory_name ?? ''))
                .map(cluster => {
                  const status = cluster.status ?? 'purchase';
                  const config = STATUS_CONFIG[status];
                  return (
                    <tr key={cluster.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{cluster.factory_name}</span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{cluster.name}</span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className="text-xs font-medium text-gray-500 uppercase">{cluster.type}</span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${config.bg} ${config.text} ${config.border} border`}
                        >
                          <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: config.dotColor }}
                          />
                          {config.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
