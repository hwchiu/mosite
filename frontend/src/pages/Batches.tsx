import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronDown, ChevronUp, X } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import ModelBadge from '../components/ModelBadge';
import { listBatches, createBatch } from '../api/batches';
import { listFactories } from '../api/factories';
import { listServers } from '../api/servers';

interface CreateBatchForm {
  name: string;
  purchase_date: string;
  factory_id: string;
  notes: string;
}

const emptyForm: CreateBatchForm = { name: '', purchase_date: '', factory_id: '', notes: '' };

export default function Batches() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateBatchForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const batchesQ = useQuery({ queryKey: ['batches'], queryFn: () => listBatches() });
  const factoriesQ = useQuery({ queryKey: ['factories'], queryFn: listFactories });

  const createMut = useMutation({
    mutationFn: createBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      setShowCreate(false);
      setForm(emptyForm);
      setFormError('');
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setFormError('Name is required');
    if (!form.purchase_date) return setFormError('Purchase date is required');
    setFormError('');
    createMut.mutate({
      name: form.name.trim(),
      purchase_date: form.purchase_date,
      factory_id: form.factory_id || undefined,
      notes: form.notes.trim() || undefined,
    });
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  };

  const toggleExpand = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Purchase Batches</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} /> Create Batch
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {batchesQ.isLoading ? (
          <LoadingSpinner />
        ) : batchesQ.isError ? (
          <div className="p-6 text-center text-red-500 text-sm">Failed to load batches.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Purchase Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Factory</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Servers</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {batchesQ.data?.map((batch) => (
                  <>
                    <tr
                      key={batch.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => toggleExpand(batch.id)}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                        {expandedId === batch.id ? (
                          <ChevronUp size={14} className="text-gray-400" />
                        ) : (
                          <ChevronDown size={14} className="text-gray-400" />
                        )}
                        {batch.name}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(batch.purchase_date)}</td>
                      <td className="px-4 py-3 text-gray-600">{batch.factory_name || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-800 text-xs font-semibold">
                          {batch.server_count ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{batch.notes || '—'}</td>
                    </tr>
                    {expandedId === batch.id && (
                      <tr key={`${batch.id}-expanded`}>
                        <td colSpan={5} className="bg-amber-50 border-b border-amber-100">
                          <BatchServers batchId={batch.id} batchName={batch.name} />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {!batchesQ.data?.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      No purchase batches found. Create one to get started.
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
              <h3 className="text-base font-semibold text-gray-900">Create Purchase Batch</h3>
              <button onClick={() => { setShowCreate(false); setForm(emptyForm); setFormError(''); }}
                className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-600 text-sm">{formError}</div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Batch Name *</label>
                <input type="text" value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Q1-2025-Batch-01" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Purchase Date *</label>
                <input type="date" value={form.purchase_date}
                  onChange={(e) => setForm((f) => ({ ...f, purchase_date: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Factory</label>
                <select value={form.factory_id}
                  onChange={(e) => setForm((f) => ({ ...f, factory_id: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">None</option>
                  {factoriesQ.data?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Optional notes about this batch..." />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreate(false); setForm(emptyForm); setFormError(''); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={createMut.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60">
                  {createMut.isPending ? 'Creating...' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function BatchServers({ batchId, batchName }: { batchId: string; batchName: string }) {
  const serversQ = useQuery({
    queryKey: ['servers', 'batch', batchId],
    queryFn: () => listServers(),
    select: (data) => data.filter((s) => s.batch_id === batchId),
  });

  if (serversQ.isLoading) return <div className="px-6 py-4"><LoadingSpinner /></div>;
  if (serversQ.isError) return <div className="px-6 py-3 text-red-500 text-sm">Failed to load servers.</div>;

  const servers = serversQ.data ?? [];

  return (
    <div className="px-6 py-4">
      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">
        {servers.length} Server{servers.length !== 1 ? 's' : ''} in batch "{batchName}"
      </p>
      {servers.length > 0 ? (
        <div className="rounded-lg overflow-hidden border border-amber-200">
          <table className="w-full text-xs">
            <thead className="bg-amber-100">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-amber-800">Hostname</th>
                <th className="px-3 py-2 text-left font-semibold text-amber-800">Serial</th>
                <th className="px-3 py-2 text-left font-semibold text-amber-800">IP</th>
                <th className="px-3 py-2 text-left font-semibold text-amber-800">Model</th>
                <th className="px-3 py-2 text-left font-semibold text-amber-800">Service</th>
                <th className="px-3 py-2 text-left font-semibold text-amber-800">Status</th>
                <th className="px-3 py-2 text-left font-semibold text-amber-800">Cluster</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100 bg-white">
              {servers.map((s) => (
                <tr key={s.id}>
                  <td className="px-3 py-2 font-medium text-gray-800">{s.hostname}</td>
                  <td className="px-3 py-2 font-mono text-gray-600">{s.serial_number}</td>
                  <td className="px-3 py-2 text-gray-600">{s.ip_address || '—'}</td>
                  <td className="px-3 py-2"><ModelBadge model={s.model} /></td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-800">
                      {s.service_type}
                    </span>
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={s.status} /></td>
                  <td className="px-3 py-2 text-gray-500">{s.cluster_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-amber-400 italic">No servers in this batch yet.</p>
      )}
    </div>
  );
}
