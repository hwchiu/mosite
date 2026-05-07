import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Pencil, X, FilterX, ChevronRight, ChevronDown } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { listClusters, createCluster, updateCluster, deleteCluster, addOperation, updateOperation, deleteOperation, addRescheduleNote, updateRescheduleNote, deleteRescheduleNote } from '../api/clusters';
import { listFactories } from '../api/factories';
import { validatePhaseDates } from '../timeline/utils';
import type { ClusterType, ClusterStatus, Cluster, ClusterPhase, PhaseKey, ClusterOperation, OperationType, RescheduleNote } from '../types';
import { INIT_PHASES, EXPANSION_PHASES } from '../types';

const STATUS_CONFIG: Record<ClusterStatus, { label: string; bg: string; text: string; border: string; dotColor: string }> = {
  purchase: { label: 'Purchase', bg: 'bg-gray-50',    text: 'text-gray-700',    border: 'border-gray-200',    dotColor: '#94a3b8' },
  movein:   { label: 'Move-In',  bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dotColor: '#f59e0b' },
  infra:    { label: 'Infra',    bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200',  dotColor: '#6366f1' },
  cluster:  { label: 'Cluster',  bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dotColor: '#3b82f6' },
  platform: { label: 'Platform', bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  dotColor: '#8b5cf6' },
  release:  { label: 'Release',  bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dotColor: '#10b981' },
};

const PHASE_LABELS: Record<PhaseKey, string> = {
  purchase: 'Purchase',
  movein:   'Move-In',
  infra:    'Infra',
  cluster:  'Cluster',
  platform: 'Platform',
  release:  'Release',
};

const INIT_PHASE_ORDER: PhaseKey[] = INIT_PHASES;
const EXPANSION_PHASE_ORDER: PhaseKey[] = EXPANSION_PHASES;

type PhaseForm = Partial<Record<PhaseKey, string>>;

function emptyPhaseForm(type: OperationType): PhaseForm {
  const keys = type === 'init' ? INIT_PHASE_ORDER : EXPANSION_PHASE_ORDER;
  return Object.fromEntries(keys.map(k => [k, ''])) as PhaseForm;
}

interface ClusterForm {
  name: string;
  type: ClusterType | '';
  factory_id: string;
  phases: PhaseForm;
}

const emptyForm = (): ClusterForm => ({
  name: '',
  type: '',
  factory_id: '',
  phases: emptyPhaseForm('init'),
});

function toPhasePayload(phases: PhaseForm, type: OperationType, existingPhases: ClusterPhase[] = []): ClusterPhase[] {
  const keys = type === 'init' ? INIT_PHASE_ORDER : EXPANSION_PHASE_ORDER;
  const existingByPhase = new Map(existingPhases.map(p => [p.phase, p] as const));
  return keys.map(phase => ({
    ...existingByPhase.get(phase),
    phase,
    date: phases[phase] ?? '',
  }));
}

function validateForm(form: ClusterForm): string {
  if (!form.name.trim()) return 'Name is required';
  if (!form.type) return 'Type is required';
  if (!form.factory_id) return 'Factory is required';

  for (const phase of INIT_PHASE_ORDER) {
    if (!form.phases[phase]) return `${PHASE_LABELS[phase]} date is required`;
  }

  return Object.values(validatePhaseDates(toPhasePayload(form.phases, 'init')))[0] ?? '';
}

function validateExpansionForm(phases: PhaseForm): string {
  for (const phase of EXPANSION_PHASE_ORDER) {
    if (!phases[phase]) return `${PHASE_LABELS[phase]} date is required`;
  }
  return Object.values(validatePhaseDates(toPhasePayload(phases, 'expansion')))[0] ?? '';
}

function formFromCluster(cluster: Cluster): ClusterForm {
  const phases = emptyPhaseForm('init');
  const initOp = cluster.operations?.find(o => o.type === 'init');
  initOp?.phases.forEach(p => { (phases as Record<string, string>)[p.phase] = p.date; });
  return { name: cluster.name, type: cluster.type, factory_id: cluster.factory_id, phases };
}

interface FilterState {
  factory: string;
  name: string;
  type: string;
  status: string;
}

const emptyFilter = (): FilterState => ({ factory: '', name: '', type: '', status: '' });

export default function Clusters() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClusterForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(emptyFilter());

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [addingExpansionFor, setAddingExpansionFor] = useState<string | null>(null);
  const [expansionForm, setExpansionForm] = useState<PhaseForm>(emptyPhaseForm('expansion'));
  const [expansionFormError, setExpansionFormError] = useState('');
  const [editingOperation, setEditingOperation] = useState<{ clusterId: string; op: ClusterOperation } | null>(null);
  const [opEditForm, setOpEditForm] = useState<PhaseForm>(emptyPhaseForm('init'));
  const [opEditError, setOpEditError] = useState('');

  const [notesModal, setNotesModal] = useState<{ clusterId: string; op: ClusterOperation } | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [editingNote, setEditingNote] = useState<{ id: string; text: string } | null>(null);

  const clustersQ = useQuery({ queryKey: ['clusters'], queryFn: () => listClusters() });
  const clusters = clustersQ.data;
  const factoriesQ = useQuery({ queryKey: ['factories'], queryFn: listFactories });

  const createMut = useMutation({
    mutationFn: createCluster,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clusters'] });
      setShowCreate(false);
      setForm(emptyForm());
      setFormError('');
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Cluster> }) => updateCluster(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clusters'] });
      setEditingId(null);
      setForm(emptyForm());
      setFormError('');
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteCluster,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clusters'] });
      setDeleteConfirm(null);
    },
  });

  const addOpMut = useMutation({
    mutationFn: ({ clusterId, data }: { clusterId: string; data: { type: OperationType; label?: string; phases: ClusterPhase[] } }) =>
      addOperation(clusterId, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clusters'] });
      setAddingExpansionFor(null);
      setExpansionForm(emptyPhaseForm('expansion'));
      setExpansionFormError('');
    },
    onError: (err: Error) => setExpansionFormError(err.message),
  });

  const updateOpMut = useMutation({
    mutationFn: ({ clusterId, opId, phases }: { clusterId: string; opId: string; phases: ClusterPhase[] }) =>
      updateOperation(clusterId, opId, phases),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clusters'] });
      setEditingOperation(null);
      setOpEditError('');
    },
    onError: (err: Error) => setOpEditError(err.message),
  });

  const deleteOpMut = useMutation({
    mutationFn: ({ clusterId, opId }: { clusterId: string; opId: string }) =>
      deleteOperation(clusterId, opId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clusters'] }),
  });

  const addNoteMut = useMutation({
    mutationFn: ({ clusterId, opId, note }: { clusterId: string; opId: string; note: string }) =>
      addRescheduleNote(clusterId, opId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clusters'] });
      setNewNoteText('');
    },
  });

  const updateNoteMut = useMutation({
    mutationFn: ({ clusterId, opId, noteId, note }: { clusterId: string; opId: string; noteId: string; note: string }) =>
      updateRescheduleNote(clusterId, opId, noteId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clusters'] });
      setEditingNote(null);
    },
  });

  const deleteNoteMut = useMutation({
    mutationFn: ({ clusterId, opId, noteId }: { clusterId: string; opId: string; noteId: string }) =>
      deleteRescheduleNote(clusterId, opId, noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clusters'] });
    },
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateForm(form);
    if (error) return setFormError(error);
    setFormError('');
    try {
      await createMut.mutateAsync({
        name: form.name.trim(),
        type: form.type as ClusterType,
        factory_id: form.factory_id,
        phases: toPhasePayload(form.phases, 'init'),
      });
    } catch { /* onError handles */ }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    if (!form.name.trim()) return setFormError('Name is required');
    if (!form.type) return setFormError('Type is required');
    if (!form.factory_id) return setFormError('Factory is required');

    setFormError('');
    try {
      await updateMut.mutateAsync({
        id: editingId,
        data: {
          name: form.name.trim(),
          type: form.type as ClusterType,
          factory_id: form.factory_id,
        },
      });
    } catch { /* onError handles */ }
  };

  const startEdit = (cluster: Cluster) => {
    setEditingId(cluster.id);
    setShowCreate(false);
    setForm(formFromCluster(cluster));
    setFormError('');
  };

  const startCreate = () => {
    setEditingId(null);
    setShowCreate(true);
    setForm(emptyForm());
    setFormError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormError('');
  };

  const factories = factoriesQ.data ?? [];

  const filteredClusters = useMemo(() => {
    return (clustersQ.data ?? [])
      .sort((a, b) => (a.factory_name ?? '').localeCompare(b.factory_name ?? ''))
      .filter((c) => {
        if (filters.factory && c.factory_name !== filters.factory) return false;
        if (filters.name && !c.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
        if (filters.type && c.type !== filters.type) return false;
        if (filters.status && c.status !== filters.status) return false;
        return true;
      });
  }, [clustersQ.data, filters]);

  const hasFilter = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clusters</h1>
        <button
          onClick={startCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} /> Create Cluster
        </button>
      </div>

      {/* Create/Edit Panel */}
      {(showCreate || editingId) && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {editingId ? 'Edit Cluster' : 'Create Cluster'}
            </h2>
            <button
              onClick={() => {
                setShowCreate(false);
                cancelEdit();
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
          <form onSubmit={editingId ? handleUpdate : handleCreate} className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {formError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Factory</label>
                <select
                  name="factory_id"
                  value={form.factory_id}
                  onChange={(e) => setForm({ ...form, factory_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="">Select Factory</option>
                  {factories.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., F1-K8S-Prod"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  name="type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as ClusterType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="">Select Type</option>
                  <option value="k8s">k8s</option>
                  <option value="vm">vm</option>
                </select>
              </div>
            </div>
            {!editingId && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Milestone Dates</h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
                  {INIT_PHASE_ORDER.map((phase) => (
                    <div key={phase}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {PHASE_LABELS[phase]} Date
                      </label>
                      <input
                        name={phase}
                        type="date"
                        value={form.phases[phase] ?? ''}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            phases: {
                              ...form.phases,
                              [phase]: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  cancelEdit();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMut.isPending || updateMut.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Clusters Table */}
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
                  <th className="px-2 py-3 w-8" />
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factory</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {hasFilter && (
                      <button
                        onClick={() => setFilters(emptyFilter())}
                        className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-normal normal-case"
                        title="Clear all filters"
                      >
                        <FilterX size={13} /> Clear
                      </button>
                    )}
                  </th>
                </tr>
                <tr className="border-b border-gray-200">
                  <td />
                  <td className="px-3 py-2">
                    <select
                      value={filters.factory}
                      onChange={(e) => setFilters({ ...filters, factory: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 outline-none bg-white"
                    >
                      <option value="">All</option>
                      {(factoriesQ.data ?? []).map(f => (
                        <option key={f.id} value={f.name}>{f.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={filters.name}
                      onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                      placeholder="Filter…"
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 outline-none"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={filters.type}
                      onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 outline-none"
                    >
                      <option value="">All</option>
                      <option value="k8s">k8s</option>
                      <option value="vm">vm</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 outline-none"
                    >
                      <option value="">All</option>
                      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <option key={key} value={key}>{cfg.label}</option>
                      ))}
                    </select>
                  </td>
                  <td />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredClusters.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">
                      No clusters match the current filters.
                    </td>
                  </tr>
                ) : (
                filteredClusters.map((cluster) => {
                  const isExpanded = expandedRows.has(cluster.id);
                  const status = cluster.status ?? 'purchase';
                  const config = STATUS_CONFIG[status];
                  return (
                    <React.Fragment key={cluster.id}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-2 py-3 w-8">
                          <button
                            title="Toggle operations"
                            onClick={() => setExpandedRows(prev => {
                              const next = new Set(prev);
                              if (next.has(cluster.id)) {
                                next.delete(cluster.id);
                              } else {
                                next.add(cluster.id);
                              }
                              return next;
                            })}
                            className="text-gray-400 hover:text-indigo-600"
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        </td>
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
                        <td className="px-5 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => startEdit(cluster)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(cluster.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                            <div className="space-y-2">
                              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Operations</div>
                              {cluster.operations?.map((op, idx) => (
                                <div key={op.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                                  <div>
                                    <span className="text-xs font-medium text-gray-700">
                                      {op.type === 'init' ? 'Init' : op.label ?? `Expansion #${idx}`}
                                    </span>
                                    <span className="ml-2 text-xs text-gray-400">
                                      {op.phases[0]?.date} → {op.phases[op.phases.length - 1]?.date}
                                    </span>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => { setNotesModal({ clusterId: cluster.id, op }); setNewNoteText(''); setEditingNote(null); }}
                                      className="p-1 text-gray-400 hover:text-indigo-500 rounded"
                                      title="Reschedule notes"
                                    >
                                      <span className="text-xs">💬{(op.reschedule_notes?.length ?? 0) > 0 ? ` ${op.reschedule_notes!.length}` : ''}</span>
                                    </button>
                                    <button
                                      title="Edit operation phases"
                                      onClick={() => {
                                        const opForm: PhaseForm = Object.fromEntries(op.phases.map(p => [p.phase, p.date]));
                                        setOpEditForm(opForm);
                                        setEditingOperation({ clusterId: cluster.id, op });
                                        setOpEditError('');
                                      }}
                                      className="text-gray-400 hover:text-indigo-600"
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    {op.type !== 'init' && (
                                      <button
                                        title="Delete operation"
                                        onClick={() => deleteOpMut.mutate({ clusterId: cluster.id, opId: op.id })}
                                        className="text-gray-400 hover:text-red-600"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {addingExpansionFor === cluster.id ? (
                                <form
                                  onSubmit={async (e) => {
                                    e.preventDefault();
                                    const err = validateExpansionForm(expansionForm);
                                    if (err) return setExpansionFormError(err);
                                    setExpansionFormError('');
                                    const expCount = (cluster.operations?.filter(o => o.type === 'expansion').length ?? 0) + 1;
                                    await addOpMut.mutateAsync({
                                      clusterId: cluster.id,
                                      data: {
                                        type: 'expansion',
                                        label: `Expansion #${expCount}`,
                                        phases: toPhasePayload(expansionForm, 'expansion'),
                                      },
                                    });
                                  }}
                                  className="space-y-3 pt-2 border-t border-gray-200 mt-2"
                                >
                                  {expansionFormError && (
                                    <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{expansionFormError}</div>
                                  )}
                                  <div className="grid grid-cols-5 gap-3">
                                    {EXPANSION_PHASE_ORDER.map(phase => (
                                      <div key={phase}>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">{PHASE_LABELS[phase]}</label>
                                        <input
                                          name={phase}
                                          type="date"
                                          value={expansionForm[phase] ?? ''}
                                          onChange={e => setExpansionForm(prev => ({ ...prev, [phase]: e.target.value }))}
                                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-indigo-500"
                                          required
                                        />
                                      </div>
                                    ))}
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <button type="button" onClick={() => setAddingExpansionFor(null)} className="px-3 py-1 text-xs text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50">
                                      Cancel
                                    </button>
                                    <button type="submit" disabled={addOpMut.isPending} className="px-3 py-1 text-xs text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50">
                                      Add Expansion
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                <button
                                  onClick={() => {
                                    setAddingExpansionFor(cluster.id);
                                    setExpansionForm(emptyPhaseForm('expansion'));
                                    setExpansionFormError('');
                                  }}
                                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                >
                                  + Add Expansion
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                }))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Cluster?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete this cluster? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMut.mutate(deleteConfirm)}
                disabled={deleteMut.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Operation Edit Modal */}
      {editingOperation && (() => {
        const { clusterId, op } = editingOperation;
        const opPhaseOrder = op.type === 'init' ? INIT_PHASE_ORDER : EXPANSION_PHASE_ORDER;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-xl shadow-xl p-6 w-[480px]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-800">
                  Edit {op.type === 'init' ? 'Init' : op.label ?? 'Expansion'} Phases
                </h2>
                <button onClick={() => setEditingOperation(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
              {opEditError && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-3">{opEditError}</div>}
              <form onSubmit={async (e) => {
                e.preventDefault();
                const phases = toPhasePayload(opEditForm, op.type);
                const errs = validatePhaseDates(phases);
                const firstErr = Object.values(errs)[0];
                if (firstErr) return setOpEditError(firstErr);
                setOpEditError('');
                await updateOpMut.mutateAsync({ clusterId, opId: op.id, phases });
              }} className="space-y-4">
                <div className={`grid gap-3 ${op.type === 'init' ? 'grid-cols-3' : 'grid-cols-5'}`}>
                  {opPhaseOrder.map(phase => (
                    <div key={phase}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{PHASE_LABELS[phase]}</label>
                      <input
                        type="date"
                        value={opEditForm[phase] ?? ''}
                        onChange={e => setOpEditForm(prev => ({ ...prev, [phase]: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setEditingOperation(null)} className="px-3 py-1 text-xs text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={updateOpMut.isPending} className="px-3 py-1 text-xs text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50">
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Reschedule Notes Modal */}
      {notesModal && (() => {
        const { clusterId } = notesModal;
        const freshCluster = clusters?.find(c => c.id === clusterId);
        const op = freshCluster?.operations?.find(o => o.id === notesModal.op.id) ?? notesModal.op;
        const notes: RescheduleNote[] = op.reschedule_notes ?? [];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-xl shadow-xl p-6 w-[480px] max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-800">
                  Reschedule Notes — {op.type === 'init' ? 'Init' : op.label ?? 'Expansion'}
                </h2>
                <button onClick={() => setNotesModal(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>

              {/* Existing notes list */}
              <div className="flex-1 overflow-y-auto space-y-2 mb-4 min-h-0">
                {notes.length === 0 && (
                  <p className="text-xs text-gray-400 italic">No notes yet.</p>
                )}
                {notes.map((n, idx) => {
                  const isEditing = editingNote?.id === n.id;
                  return (
                    <div key={n.id} className={`border rounded-lg p-3 text-xs ${idx === notes.length - 1 ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-gray-400 font-medium shrink-0">{n.date}</span>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => setEditingNote({ id: n.id, text: n.note })}
                            className="text-gray-400 hover:text-indigo-500"
                            title="Edit note"
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            onClick={() => deleteNoteMut.mutate({ clusterId, opId: op.id, noteId: n.id })}
                            disabled={deleteNoteMut.isPending}
                            className="text-gray-400 hover:text-red-500 disabled:opacity-50"
                            title="Delete note"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                      {isEditing ? (
                        <div className="mt-2 flex gap-2">
                          <input
                            type="text"
                            value={editingNote.text}
                            onChange={e => setEditingNote({ id: n.id, text: e.target.value })}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-indigo-500"
                            autoFocus
                          />
                          <button
                            onClick={() => updateNoteMut.mutate({ clusterId, opId: op.id, noteId: n.id, note: editingNote.text })}
                            disabled={updateNoteMut.isPending || !editingNote.text.trim()}
                            className="px-2 py-1 text-xs text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button onClick={() => setEditingNote(null)} className="px-2 py-1 text-xs text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <p className="mt-1 text-gray-700 leading-relaxed">{n.note}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add new note form */}
              <div className="border-t border-gray-100 pt-4">
                <div className="text-xs font-medium text-gray-600 mb-2">Add note</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Reason for reschedule..."
                    value={newNoteText}
                    onChange={e => setNewNoteText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newNoteText.trim()) addNoteMut.mutate({ clusterId, opId: op.id, note: newNoteText }); }}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => addNoteMut.mutate({ clusterId, opId: op.id, note: newNoteText })}
                    disabled={addNoteMut.isPending || !newNoteText.trim()}
                    className="px-3 py-1 text-xs text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
