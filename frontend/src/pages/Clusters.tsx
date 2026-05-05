import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronDown, ChevronUp, X, Trash2 } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import ModelBadge from '../components/ModelBadge';
import { listClusters, createCluster, deleteCluster } from '../api/clusters';
import { listFactories } from '../api/factories';
import { listServers } from '../api/servers';
import type { ClusterType } from '../types';

interface CreateClusterForm {
  name: string;
  type: ClusterType | '';
  factory_id: string;
  description: string;
}

const emptyForm: CreateClusterForm = { name: '', type: '', factory_id: '', description: '' };

export default function Clusters() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateClusterForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const clustersQ = useQuery({ queryKey: ['clusters'], queryFn: () => listClusters() });
  const factoriesQ = useQuery({ queryKey: ['factories'], queryFn: listFactories });

  const createMut = useMutation({
    mutationFn: createCluster,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clusters'] });
      setShowCreate(false);
      setForm(emptyForm);
      setFormError('');
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteCluster,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clusters'] }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setFormError('Name is required');
    if (!form.type) return setFormError('Type is required');
    if (!form.factory_id) return setFormError('Factory is required');
    setFormError('');
    createMut.mutate({
      name: form.name.trim(),
      type: form.type as ClusterType,
      factory_id: form.factory_id,
      description: form.description.trim() || undefined,
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clusters</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} /> Create Cluster
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {clustersQ.isLoading ? (
          <LoadingSpinner />
        ) : clustersQ.isError ? (
          <div className="p-6 text-center text-red-500 text-sm">Failed to load clusters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Factory</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Description</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clustersQ.data?.map((cluster) => (
                  <>
                    <tr
                      key={cluster.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => toggleExpand(cluster.id)}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                        {expandedId === cluster.id ? (
                          <ChevronUp size={14} className="text-gray-400" />
                        ) : (
                          <ChevronDown size={14} className="text-gray-400" />
                        )}
                        {cluster.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          cluster.type === 'k8s'
                            ? 'bg-indigo-100 text-indigo-800 ring-indigo-300'
                            : 'bg-teal-100 text-teal-800 ring-teal-300'
                        }`}>
                          {cluster.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{cluster.factory_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{cluster.description || '—'}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete cluster "${cluster.name}"?`)) {
                              deleteMut.mutate(cluster.id);
                            }
                          }}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                    {expandedId === cluster.id && (
                      <tr key={`${cluster.id}-expanded`}>
                        <td colSpan={5} className="bg-indigo-50 border-b border-indigo-100">
                          <ClusterServers clusterId={cluster.id} />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {!clustersQ.data?.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      No clusters found. Create one to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Create Cluster</h3>
              <button onClick={() => { setShowCreate(false); setForm(emptyForm); setFormError(''); }}
                className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-600 text-sm">{formError}</div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cluster Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="prod-k8s-01" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Type *</label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ClusterType }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select type</option>
                  <option value="k8s">Kubernetes (k8s)</option>
                  <option value="vm">Virtual Machine (vm)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Factory *</label>
                <select value={form.factory_id} onChange={(e) => setForm((f) => ({ ...f, factory_id: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select factory</option>
                  {factoriesQ.data?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Optional description..." />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreate(false); setForm(emptyForm); setFormError(''); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={createMut.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60">
                  {createMut.isPending ? 'Creating...' : 'Create Cluster'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ClusterServers({ clusterId }: { clusterId: string }) {
  const serversQ = useQuery({
    queryKey: ['servers', 'cluster', clusterId],
    queryFn: () => listServers({ factory_id: undefined }),
    select: (data) => data.filter((s) => s.cluster_id === clusterId),
  });

  if (serversQ.isLoading) return <div className="px-6 py-4"><LoadingSpinner /></div>;
  if (serversQ.isError) return <div className="px-6 py-3 text-red-500 text-sm">Failed to load servers.</div>;

  const servers = serversQ.data ?? [];

  return (
    <div className="px-6 py-4">
      <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-3">
        {servers.length} Server{servers.length !== 1 ? 's' : ''} in this cluster
      </p>
      {servers.length > 0 ? (
        <div className="rounded-lg overflow-hidden border border-indigo-200">
          <table className="w-full text-xs">
            <thead className="bg-indigo-100">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-indigo-700">Hostname</th>
                <th className="px-3 py-2 text-left font-semibold text-indigo-700">Serial</th>
                <th className="px-3 py-2 text-left font-semibold text-indigo-700">IP</th>
                <th className="px-3 py-2 text-left font-semibold text-indigo-700">Model</th>
                <th className="px-3 py-2 text-left font-semibold text-indigo-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-100 bg-white">
              {servers.map((s) => (
                <tr key={s.id}>
                  <td className="px-3 py-2 font-medium text-gray-800">{s.hostname}</td>
                  <td className="px-3 py-2 font-mono text-gray-600">{s.serial_number}</td>
                  <td className="px-3 py-2 text-gray-600">{s.ip_address || '—'}</td>
                  <td className="px-3 py-2"><ModelBadge model={s.model} /></td>
                  <td className="px-3 py-2"><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-indigo-400 italic">No servers assigned to this cluster.</p>
      )}
    </div>
  );
}
