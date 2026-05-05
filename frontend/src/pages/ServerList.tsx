import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, Eye, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import ModelBadge from '../components/ModelBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { listServers, createServer, bulkCreateServers, transitionStatus } from '../api/servers';
import { listFactories } from '../api/factories';
import { listClusters } from '../api/clusters';
import { listBatches } from '../api/batches';
import type { Server, ServerStatus, ServerModel, ServiceType } from '../types';

const PAGE_SIZE = 20;

const ALL_STATUSES: ServerStatus[] = [
  'purchased', 'waiting_infra', 'waiting_cluster_setup', 'waiting_platform', 'active', 'retired',
];
const ALL_MODELS: ServerModel[] = ['model_1', 'model_2', 'model_3'];
const ALL_SERVICE_TYPES: ServiceType[] = ['k8s', 'vm'];

const STATUS_TRANSITIONS: Record<ServerStatus, ServerStatus[]> = {
  purchased: ['waiting_infra'],
  waiting_infra: ['waiting_cluster_setup', 'retired'],
  waiting_cluster_setup: ['waiting_platform', 'retired'],
  waiting_platform: ['active', 'retired'],
  active: ['retired'],
  retired: [],
};

interface AddServerForm {
  hostname: string;
  serial_number: string;
  ip_address: string;
  model: ServerModel | '';
  service_type: ServiceType | '';
  factory_id: string;
  cluster_id: string;
  batch_id: string;
  notes: string;
}

const emptyForm: AddServerForm = {
  hostname: '', serial_number: '', ip_address: '', model: '',
  service_type: '', factory_id: '', cluster_id: '', batch_id: '', notes: '',
};

export default function ServerList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Filters
  const [filterFactory, setFilterFactory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [filterService, setFilterService] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState<{ server: Server; next: ServerStatus } | null>(null);
  const [statusOperator, setStatusOperator] = useState('');
  const [statusComment, setStatusComment] = useState('');
  const [bulkStatusTarget, setBulkStatusTarget] = useState<ServerStatus | ''>('');
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [bulkOperator, setBulkOperator] = useState('');

  // Add form
  const [addForm, setAddForm] = useState<AddServerForm>(emptyForm);
  const [addError, setAddError] = useState('');

  // Bulk import
  const [bulkJson, setBulkJson] = useState('');
  const [bulkError, setBulkError] = useState('');

  const serversQ = useQuery({
    queryKey: ['servers', filterFactory, filterStatus, filterModel, filterService, search],
    queryFn: () =>
      listServers({
        factory_id: filterFactory || undefined,
        status: filterStatus || undefined,
        model: filterModel || undefined,
        service_type: filterService || undefined,
        search: search || undefined,
      }),
  });

  const factoriesQ = useQuery({ queryKey: ['factories'], queryFn: listFactories });
  const clustersQ = useQuery({ queryKey: ['clusters'], queryFn: () => listClusters() });
  const batchesQ = useQuery({ queryKey: ['batches'], queryFn: () => listBatches() });

  const createMut = useMutation({
    mutationFn: createServer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      setShowAdd(false);
      setAddForm(emptyForm);
      setAddError('');
    },
    onError: (err: Error) => setAddError(err.message),
  });

  const bulkMut = useMutation({
    mutationFn: bulkCreateServers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      setShowBulk(false);
      setBulkJson('');
      setBulkError('');
    },
    onError: (err: Error) => setBulkError(err.message),
  });

  const transitionMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: ServerStatus; operator: string; comment?: string } }) =>
      transitionStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      setShowStatusModal(null);
      setStatusOperator('');
      setStatusComment('');
    },
  });

  const servers = serversQ.data ?? [];

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return servers.slice(start, start + PAGE_SIZE);
  }, [servers, page]);

  const totalPages = Math.max(1, Math.ceil(servers.length / PAGE_SIZE));

  const allPageSelected = paginated.length > 0 && paginated.every((s) => selected.has(s.id));

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        paginated.forEach((s) => next.delete(s.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        paginated.forEach((s) => next.add(s.id));
        return next;
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.hostname.trim()) return setAddError('Hostname is required');
    if (!addForm.serial_number.trim()) return setAddError('Serial number is required');
    if (!addForm.model) return setAddError('Model is required');
    if (!addForm.service_type) return setAddError('Service type is required');
    if (!addForm.factory_id) return setAddError('Factory is required');
    setAddError('');
    createMut.mutate({
      hostname: addForm.hostname.trim(),
      serial_number: addForm.serial_number.trim(),
      ip_address: addForm.ip_address.trim() || undefined,
      model: addForm.model as ServerModel,
      service_type: addForm.service_type as ServiceType,
      factory_id: addForm.factory_id,
      cluster_id: addForm.cluster_id || undefined,
      batch_id: addForm.batch_id || undefined,
      notes: addForm.notes.trim() || undefined,
    });
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBulkError('');
    let parsed: Partial<Server>[];
    try {
      parsed = JSON.parse(bulkJson);
      if (!Array.isArray(parsed)) throw new Error('Must be a JSON array');
    } catch (err) {
      return setBulkError('Invalid JSON: ' + (err as Error).message);
    }
    bulkMut.mutate(parsed);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(Boolean);
      if (lines.length < 2) return setBulkError('CSV must have a header row and at least one data row.');
      const headers = lines[0].split(',').map((h) => h.trim());
      const records: Partial<Server>[] = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim());
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = values[i] ?? ''; });
        return obj as Partial<Server>;
      });
      setBulkJson(JSON.stringify(records, null, 2));
    };
    reader.readAsText(file);
  };

  const handleTransitionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showStatusModal) return;
    if (!statusOperator.trim()) return;
    transitionMut.mutate({
      id: showStatusModal.server.id,
      data: {
        status: showStatusModal.next,
        operator: statusOperator.trim(),
        comment: statusComment.trim() || undefined,
      },
    });
  };

  const handleBulkStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkStatusTarget || !bulkOperator.trim()) return;
    const ids = Array.from(selected);
    Promise.all(
      ids.map((id) =>
        transitionStatus(id, { status: bulkStatusTarget as ServerStatus, operator: bulkOperator.trim() })
      )
    ).then(() => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      setSelected(new Set());
      setBulkStatusTarget('');
      setBulkOperator('');
      setShowBulkStatusModal(false);
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Servers</h1>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button
              onClick={() => setShowBulkStatusModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors"
            >
              Bulk Status Change ({selected.size})
            </button>
          )}
          <button
            onClick={() => setShowBulk(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Upload size={16} />
            Bulk Import
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            Add Server
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search hostname, serial, IP..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={filterFactory}
          onChange={(e) => { setFilterFactory(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Factories</option>
          {factoriesQ.data?.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <select
          value={filterModel}
          onChange={(e) => { setFilterModel(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Models</option>
          {ALL_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          value={filterService}
          onChange={(e) => { setFilterService(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Service Types</option>
          {ALL_SERVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {(filterFactory || filterStatus || filterModel || filterService || search) && (
          <button
            onClick={() => { setFilterFactory(''); setFilterStatus(''); setFilterModel(''); setFilterService(''); setSearch(''); setPage(1); }}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {serversQ.isLoading ? (
          <LoadingSpinner />
        ) : serversQ.isError ? (
          <div className="p-6 text-center text-red-500 text-sm">Failed to load servers.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Hostname</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Serial</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">IP Address</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Model</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Service</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Factory</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Cluster</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginated.map((server) => {
                    const nextStatuses = STATUS_TRANSITIONS[server.status] ?? [];
                    return (
                      <tr
                        key={server.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/servers/${server.id}`)}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(server.id)}
                            onChange={() => toggleSelect(server.id)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{server.hostname}</td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">{server.serial_number}</td>
                        <td className="px-4 py-3 text-gray-600">{server.ip_address || '—'}</td>
                        <td className="px-4 py-3"><ModelBadge model={server.model} /></td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-800 ring-1 ring-inset ring-indigo-300">
                            {server.service_type}
                          </span>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={server.status} /></td>
                        <td className="px-4 py-3 text-gray-600">{server.factory_name || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{server.cluster_name || '—'}</td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/servers/${server.id}`)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                            >
                              <Eye size={12} /> View
                            </button>
                            {nextStatuses.length > 0 && (
                              <select
                                defaultValue=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    setShowStatusModal({ server, next: e.target.value as ServerStatus });
                                    e.target.value = '';
                                  }
                                }}
                                className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              >
                                <option value="">→ Status</option>
                                {nextStatuses.map((s) => (
                                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                        No servers found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
              <p className="text-xs text-gray-500">
                {servers.length} server{servers.length !== 1 ? 's' : ''} total
                {selected.size > 0 && ` • ${selected.size} selected`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs text-gray-600 font-medium">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Server Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Add Server</h3>
              <button onClick={() => { setShowAdd(false); setAddForm(emptyForm); setAddError(''); }} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {addError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-600 text-sm">{addError}</div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Hostname *</label>
                  <input
                    type="text"
                    value={addForm.hostname}
                    onChange={(e) => setAddForm((f) => ({ ...f, hostname: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="server-01"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Serial Number *</label>
                  <input
                    type="text"
                    value={addForm.serial_number}
                    onChange={(e) => setAddForm((f) => ({ ...f, serial_number: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="SN-XXXXXXXX"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">IP Address</label>
                  <input
                    type="text"
                    value={addForm.ip_address}
                    onChange={(e) => setAddForm((f) => ({ ...f, ip_address: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="192.168.1.1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Model *</label>
                  <select
                    value={addForm.model}
                    onChange={(e) => setAddForm((f) => ({ ...f, model: e.target.value as ServerModel }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select model</option>
                    {ALL_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Service Type *</label>
                  <select
                    value={addForm.service_type}
                    onChange={(e) => setAddForm((f) => ({ ...f, service_type: e.target.value as ServiceType }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select type</option>
                    {ALL_SERVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Factory *</label>
                  <select
                    value={addForm.factory_id}
                    onChange={(e) => setAddForm((f) => ({ ...f, factory_id: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select factory</option>
                    {factoriesQ.data?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cluster</label>
                  <select
                    value={addForm.cluster_id}
                    onChange={(e) => setAddForm((f) => ({ ...f, cluster_id: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">None</option>
                    {clustersQ.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Batch</label>
                  <select
                    value={addForm.batch_id}
                    onChange={(e) => setAddForm((f) => ({ ...f, batch_id: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">None</option>
                    {batchesQ.data?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={addForm.notes}
                  onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Optional notes..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAdd(false); setAddForm(emptyForm); setAddError(''); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMut.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60"
                >
                  {createMut.isPending ? 'Creating...' : 'Create Server'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Bulk Import Servers</h3>
              <button onClick={() => { setShowBulk(false); setBulkJson(''); setBulkError(''); }} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleBulkSubmit} className="p-6 space-y-4">
              {bulkError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-600 text-sm">{bulkError}</div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Upload CSV</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Or paste JSON array</label>
                <textarea
                  value={bulkJson}
                  onChange={(e) => setBulkJson(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 text-xs font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                  placeholder='[{"hostname":"srv-01","serial_number":"SN-001","model":"model_1","service_type":"k8s","factory_id":"..."}]'
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowBulk(false); setBulkJson(''); setBulkError(''); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkMut.isPending || !bulkJson.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60"
                >
                  {bulkMut.isPending ? 'Importing...' : 'Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Transition Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Confirm Status Change</h3>
              <button onClick={() => { setShowStatusModal(null); setStatusOperator(''); setStatusComment(''); }} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleTransitionSubmit} className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Change <span className="font-semibold text-gray-900">{showStatusModal.server.hostname}</span> from{' '}
                <StatusBadge status={showStatusModal.server.status} /> to{' '}
                <StatusBadge status={showStatusModal.next} />
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Operator Name *</label>
                <input
                  type="text"
                  value={statusOperator}
                  onChange={(e) => setStatusOperator(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Comment</label>
                <textarea
                  value={statusComment}
                  onChange={(e) => setStatusComment(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Optional reason..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowStatusModal(null); setStatusOperator(''); setStatusComment(''); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transitionMut.isPending || !statusOperator.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60"
                >
                  {transitionMut.isPending ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Status Modal */}
      {showBulkStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Bulk Status Change ({selected.size} servers)</h3>
              <button onClick={() => setShowBulkStatusModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleBulkStatusSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Target Status *</label>
                <select
                  value={bulkStatusTarget}
                  onChange={(e) => setBulkStatusTarget(e.target.value as ServerStatus)}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select status</option>
                  {ALL_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Operator Name *</label>
                <input
                  type="text"
                  value={bulkOperator}
                  onChange={(e) => setBulkOperator(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Your name"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowBulkStatusModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={!bulkStatusTarget || !bulkOperator.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-60">
                  Apply to {selected.size} Servers
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
