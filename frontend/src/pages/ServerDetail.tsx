import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit2, Clock, User, ChevronRight, X } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import ModelBadge from '../components/ModelBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { getServer, updateServer, transitionStatus } from '../api/servers';
import { listFactories } from '../api/factories';
import { listClusters } from '../api/clusters';
import type { Server, ServerStatus, ServerModel, ServiceType } from '../types';

const STATUS_TRANSITIONS: Record<ServerStatus, ServerStatus[]> = {
  purchased: ['waiting_infra'],
  waiting_infra: ['waiting_cluster_setup', 'retired'],
  waiting_cluster_setup: ['waiting_platform', 'retired'],
  waiting_platform: ['active', 'retired'],
  active: ['retired'],
  retired: [],
};

const STATUS_BUTTON_COLORS: Record<ServerStatus, string> = {
  purchased: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300',
  waiting_infra: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300',
  waiting_cluster_setup: 'bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-300',
  waiting_platform: 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300',
  active: 'bg-green-100 text-green-800 hover:bg-green-200 border-green-300',
  retired: 'bg-red-100 text-red-700 hover:bg-red-200 border-red-300',
};

const ALL_MODELS: ServerModel[] = ['model_1', 'model_2', 'model_3'];
const ALL_SERVICE_TYPES: ServiceType[] = ['k8s', 'vm'];

interface EditForm {
  hostname: string;
  ip_address: string;
  model: ServerModel | '';
  service_type: ServiceType | '';
  factory_id: string;
  cluster_id: string;
  notes: string;
}

export default function ServerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    hostname: '', ip_address: '', model: '', service_type: '', factory_id: '', cluster_id: '', notes: '',
  });
  const [editError, setEditError] = useState('');

  const [transitionTarget, setTransitionTarget] = useState<ServerStatus | null>(null);
  const [operator, setOperator] = useState('');
  const [comment, setComment] = useState('');

  const serverQ = useQuery({
    queryKey: ['server', id],
    queryFn: () => getServer(id!),
    enabled: !!id,
  });

  const factoriesQ = useQuery({ queryKey: ['factories'], queryFn: listFactories });
  const clustersQ = useQuery({ queryKey: ['clusters'], queryFn: () => listClusters() });

  const updateMut = useMutation({
    mutationFn: (data: Partial<Server>) => updateServer(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server', id] });
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      setShowEdit(false);
      setEditError('');
    },
    onError: (err: Error) => setEditError(err.message),
  });

  const transitionMut = useMutation({
    mutationFn: (data: { status: ServerStatus; operator: string; comment?: string }) =>
      transitionStatus(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server', id] });
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      setTransitionTarget(null);
      setOperator('');
      setComment('');
    },
  });

  const openEdit = () => {
    const s = serverQ.data;
    if (!s) return;
    setEditForm({
      hostname: s.hostname,
      ip_address: s.ip_address ?? '',
      model: s.model,
      service_type: s.service_type,
      factory_id: s.factory_id,
      cluster_id: s.cluster_id ?? '',
      notes: s.notes ?? '',
    });
    setEditError('');
    setShowEdit(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.hostname.trim()) return setEditError('Hostname is required');
    if (!editForm.model) return setEditError('Model is required');
    if (!editForm.service_type) return setEditError('Service type is required');
    if (!editForm.factory_id) return setEditError('Factory is required');
    setEditError('');
    updateMut.mutate({
      hostname: editForm.hostname.trim(),
      ip_address: editForm.ip_address.trim() || undefined,
      model: editForm.model as ServerModel,
      service_type: editForm.service_type as ServiceType,
      factory_id: editForm.factory_id,
      cluster_id: editForm.cluster_id || undefined,
      notes: editForm.notes.trim() || undefined,
    });
  };

  const handleTransitionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transitionTarget || !operator.trim()) return;
    transitionMut.mutate({
      status: transitionTarget,
      operator: operator.trim(),
      comment: comment.trim() || undefined,
    });
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  if (serverQ.isLoading) return <LoadingSpinner />;
  if (serverQ.isError)
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-red-600 text-sm">
        Failed to load server details.
      </div>
    );

  const server = serverQ.data!;
  const nextStatuses = STATUS_TRANSITIONS[server.status] ?? [];

  const infoFields: { label: string; value: React.ReactNode }[] = [
    { label: 'Hostname', value: <span className="font-mono font-semibold">{server.hostname}</span> },
    { label: 'Serial Number', value: <span className="font-mono">{server.serial_number}</span> },
    { label: 'IP Address', value: server.ip_address || <span className="text-gray-400">—</span> },
    { label: 'Model', value: <ModelBadge model={server.model} /> },
    { label: 'Service Type', value: (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-800 ring-1 ring-inset ring-indigo-300">
        {server.service_type}
      </span>
    )},
    { label: 'Status', value: <StatusBadge status={server.status} /> },
    { label: 'Factory', value: server.factory_name || server.factory_id },
    { label: 'Cluster', value: server.cluster_name || <span className="text-gray-400">—</span> },
    { label: 'Batch', value: server.batch_name || <span className="text-gray-400">—</span> },
    { label: 'Notes', value: server.notes || <span className="text-gray-400">—</span> },
    { label: 'Created', value: formatDate(server.created_at) },
    { label: 'Updated', value: formatDate(server.updated_at) },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/" className="hover:text-indigo-600 transition-colors">Dashboard</Link>
        <ChevronRight size={14} />
        <Link to="/servers" className="hover:text-indigo-600 transition-colors">Servers</Link>
        <ChevronRight size={14} />
        <span className="font-medium text-gray-800">{server.hostname}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/servers')}
            className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{server.hostname}</h1>
            <p className="text-sm text-gray-500 font-mono">{server.serial_number}</p>
          </div>
        </div>
        <button
          onClick={openEdit}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          <Edit2 size={14} /> Edit
        </button>
      </div>

      {/* Server Info Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Server Information</h2>
        </div>
        <div className="p-5 grid grid-cols-2 gap-x-8 gap-y-4">
          {infoFields.map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
              <span className="text-sm text-gray-800">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Status Transition */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Status Transition</h2>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm text-gray-600">Current status:</span>
            <StatusBadge status={server.status} />
          </div>
          {nextStatuses.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-500 self-center">Transition to:</span>
              {nextStatuses.map((s) => (
                <button
                  key={s}
                  onClick={() => setTransitionTarget(s)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${STATUS_BUTTON_COLORS[s]}`}
                >
                  {s.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No further transitions available.</p>
          )}
        </div>
      </div>

      {/* Audit Log */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Audit Log</h2>
        </div>
        <div className="p-5">
          {server.audit_logs?.length ? (
            <ol className="relative border-l-2 border-gray-200 space-y-6 ml-2">
              {server.audit_logs.map((log) => (
                <li key={log.id} className="ml-5 relative">
                  <span className="absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 ring-4 ring-white">
                    <Clock size={10} className="text-indigo-600" />
                  </span>
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-700">
                        Field: <span className="text-indigo-600">{log.field}</span>
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(log.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                      {log.old_value !== undefined && (
                        <>
                          <span className="line-through text-red-400">{log.old_value || 'empty'}</span>
                          <ChevronRight size={12} className="text-gray-400" />
                        </>
                      )}
                      <span className="font-medium text-green-700">{log.new_value || 'empty'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <User size={10} />
                      <span>{log.operator}</span>
                      {log.comment && <span className="ml-2 italic text-gray-400">"{log.comment}"</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-gray-400 italic text-center py-4">No audit log entries.</p>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Edit Server</h3>
              <button onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {editError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-600 text-sm">{editError}</div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Hostname *</label>
                  <input type="text" value={editForm.hostname}
                    onChange={(e) => setEditForm((f) => ({ ...f, hostname: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">IP Address</label>
                  <input type="text" value={editForm.ip_address}
                    onChange={(e) => setEditForm((f) => ({ ...f, ip_address: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="192.168.1.1" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Model *</label>
                  <select value={editForm.model}
                    onChange={(e) => setEditForm((f) => ({ ...f, model: e.target.value as ServerModel }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select model</option>
                    {ALL_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Service Type *</label>
                  <select value={editForm.service_type}
                    onChange={(e) => setEditForm((f) => ({ ...f, service_type: e.target.value as ServiceType }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select type</option>
                    {ALL_SERVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Factory *</label>
                  <select value={editForm.factory_id}
                    onChange={(e) => setEditForm((f) => ({ ...f, factory_id: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select factory</option>
                    {factoriesQ.data?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cluster</label>
                  <select value={editForm.cluster_id}
                    onChange={(e) => setEditForm((f) => ({ ...f, cluster_id: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">None</option>
                    {clustersQ.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Optional notes..." />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowEdit(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={updateMut.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60">
                  {updateMut.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transition Confirm Modal */}
      {transitionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Confirm Status Transition</h3>
              <button onClick={() => { setTransitionTarget(null); setOperator(''); setComment(''); }}
                className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleTransitionSubmit} className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <StatusBadge status={server.status} />
                <ChevronRight size={16} className="text-gray-400" />
                <StatusBadge status={transitionTarget} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Operator Name *</label>
                <input type="text" value={operator} onChange={(e) => setOperator(e.target.value)} required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Your name" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Comment</label>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Optional reason..." />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setTransitionTarget(null); setOperator(''); setComment(''); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={transitionMut.isPending || !operator.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60">
                  {transitionMut.isPending ? 'Saving...' : 'Confirm Transition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
