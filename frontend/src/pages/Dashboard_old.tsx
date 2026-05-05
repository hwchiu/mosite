import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Server, Activity, Package, Cpu, CheckCircle, Archive } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { getSummary, getByFactory, getByCluster, getModelBreakdown, getServiceBreakdown } from '../api/dashboard';
import type { ServerStatus } from '../types';

const STATUS_ALL: ServerStatus[] = [
  'purchased',
  'waiting_infra',
  'waiting_cluster_setup',
  'waiting_platform',
  'active',
  'retired',
];

const statusCardConfig: Record<
  ServerStatus,
  { label: string; bgClass: string; textClass: string; borderClass: string; icon: React.ElementType }
> = {
  purchased: {
    label: 'Purchased',
    bgClass: 'bg-gray-50',
    textClass: 'text-gray-700',
    borderClass: 'border-gray-200',
    icon: Package,
  },
  waiting_infra: {
    label: 'Waiting Infra',
    bgClass: 'bg-yellow-50',
    textClass: 'text-yellow-700',
    borderClass: 'border-yellow-200',
    icon: Activity,
  },
  waiting_cluster_setup: {
    label: 'Waiting Cluster',
    bgClass: 'bg-orange-50',
    textClass: 'text-orange-700',
    borderClass: 'border-orange-200',
    icon: Cpu,
  },
  waiting_platform: {
    label: 'Waiting Platform',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200',
    icon: Server,
  },
  active: {
    label: 'Active',
    bgClass: 'bg-green-50',
    textClass: 'text-green-700',
    borderClass: 'border-green-200',
    icon: CheckCircle,
  },
  retired: {
    label: 'Retired',
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    borderClass: 'border-red-200',
    icon: Archive,
  },
};

const PIE_COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981'];

export default function Dashboard() {
  const summaryQ = useQuery({ queryKey: ['dashboard-summary'], queryFn: getSummary });
  const factoryQ = useQuery({ queryKey: ['factory-breakdown'], queryFn: getByFactory });
  const clusterQ = useQuery({ queryKey: ['cluster-usage'], queryFn: getByCluster });
  const modelQ = useQuery({ queryKey: ['model-breakdown'], queryFn: getModelBreakdown });
  const serviceQ = useQuery({ queryKey: ['service-breakdown'], queryFn: getServiceBreakdown });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Status Summary Cards */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Server Status Overview
        </h2>
        {summaryQ.isLoading ? (
          <LoadingSpinner />
        ) : summaryQ.isError ? (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
            Failed to load summary data.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {STATUS_ALL.map((status) => {
              const cfg = statusCardConfig[status];
              const Icon = cfg.icon;
              const count = summaryQ.data?.status_counts?.[status] ?? 0;
              return (
                <div
                  key={status}
                  className={`rounded-xl border p-4 ${cfg.bgClass} ${cfg.borderClass} flex flex-col gap-2`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${cfg.textClass}`}>{cfg.label}</span>
                    <Icon size={16} className={cfg.textClass} />
                  </div>
                  <span className={`text-3xl font-bold ${cfg.textClass}`}>{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Servers by Model</h2>
          {modelQ.isLoading ? (
            <LoadingSpinner />
          ) : modelQ.isError ? (
            <p className="text-red-500 text-sm">Failed to load model data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={modelQ.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="model" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Service Type Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Servers by Service Type</h2>
          {serviceQ.isLoading ? (
            <LoadingSpinner />
          ) : serviceQ.isError ? (
            <p className="text-red-500 text-sm">Failed to load service data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={serviceQ.data}
                  dataKey="count"
                  nameKey="service_type"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {serviceQ.data?.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Factory Breakdown Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Factory Breakdown</h2>
        </div>
        {factoryQ.isLoading ? (
          <LoadingSpinner />
        ) : factoryQ.isError ? (
          <p className="p-5 text-red-500 text-sm">Failed to load factory data.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Factory</th>
                  {STATUS_ALL.map((s) => (
                    <th key={s} className="px-4 py-3 text-center font-semibold text-gray-600">
                      {statusCardConfig[s].label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {factoryQ.data?.map((row) => (
                  <tr key={row.factory_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{row.factory_name}</td>
                    {STATUS_ALL.map((s) => (
                      <td key={s} className="px-4 py-3 text-center text-gray-600">
                        {row.status_counts?.[s] ?? 0}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center font-semibold text-gray-800">{row.total}</td>
                  </tr>
                ))}
                {!factoryQ.data?.length && (
                  <tr>
                    <td colSpan={STATUS_ALL.length + 2} className="px-4 py-6 text-center text-gray-400">
                      No factory data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cluster Usage Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Cluster Usage</h2>
        </div>
        {clusterQ.isLoading ? (
          <LoadingSpinner />
        ) : clusterQ.isError ? (
          <p className="p-5 text-red-500 text-sm">Failed to load cluster data.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Cluster</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Factory</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Total</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Active</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Available</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clusterQ.data?.map((row) => (
                  <tr key={row.cluster_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{row.cluster_name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-800 ring-1 ring-inset ring-indigo-300">
                        {row.cluster_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.factory_name}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{row.total_servers}</td>
                    <td className="px-4 py-3 text-center text-green-700 font-medium">{row.active_count}</td>
                    <td className="px-4 py-3 text-center text-blue-700 font-medium">{row.available_count}</td>
                  </tr>
                ))}
                {!clusterQ.data?.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                      No cluster data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
