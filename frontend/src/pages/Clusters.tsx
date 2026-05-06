import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { listClusters, createCluster, updateCluster, deleteCluster } from '../api/clusters';
import { listFactories } from '../api/factories';
import { PHASE_ORDER, validatePhaseDates } from '../timeline/utils';
import type { ClusterType, ClusterStatus, Cluster, ClusterPhase, PhaseKey } from '../types';

const STATUS_CONFIG: Record<ClusterStatus, { label: string; bg: string; text: string; border: string; dotColor: string }> = {
  PO:           { label: 'PO',            bg: 'bg-gray-50',    text: 'text-gray-700',    border: 'border-gray-200',    dotColor: '#94a3b8' },
  server_movein:{ label: 'Server Move-In', bg: 'bg-amber-50',  text: 'text-amber-700',   border: 'border-amber-200',   dotColor: '#f59e0b' },
  infra:        { label: 'Infra',         bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200',  dotColor: '#6366f1' },
  cpld:         { label: 'CPLD',          bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  dotColor: '#8b5cf6' },
  sipd:         { label: 'SIPD',          bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dotColor: '#10b981' },
};

const PHASE_LABELS: Record<PhaseKey, string> = {
  PO: 'PO',
  server_movein: 'Move-In',
  infra: 'Infra',
  cpld: 'CPLD',
  sipd: 'SIPD',
};

type PhaseForm = Record<PhaseKey, string>;

const emptyPhases = (): PhaseForm => ({
  PO: '',
  server_movein: '',
  infra: '',
  cpld: '',
  sipd: '',
});

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
  phases: emptyPhases(),
});

function toPhasePayload(phases: PhaseForm, existingPhases: ClusterPhase[] = []): ClusterPhase[] {
  const existingByPhase = new Map(existingPhases.map((phase) => [phase.phase, phase] as const));

  return PHASE_ORDER.map((phase) => ({
    ...existingByPhase.get(phase),
    phase,
    date: phases[phase],
  }));
}

function validateForm(form: ClusterForm): string {
  if (!form.name.trim()) return 'Name is required';
  if (!form.type) return 'Type is required';
  if (!form.factory_id) return 'Factory is required';

  for (const phase of PHASE_ORDER) {
    if (!form.phases[phase]) {
      return `${PHASE_LABELS[phase]} date is required`;
    }
  }

  return Object.values(validatePhaseDates(toPhasePayload(form.phases)))[0] ?? '';
}

function formFromCluster(cluster: Cluster): ClusterForm {
  const phases = emptyPhases();
  cluster.phases?.forEach((phase) => {
    phases[phase.phase] = phase.date;
  });

  return {
    name: cluster.name,
    type: cluster.type,
    factory_id: cluster.factory_id,
    phases,
  };
}

export default function Clusters() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClusterForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const clustersQ = useQuery({ queryKey: ['clusters'], queryFn: () => listClusters() });
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
        phases: toPhasePayload(form.phases),
      });
    } catch {
      // onError surfaces the validation message for the form.
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const error = validateForm(form);
    if (error) return setFormError(error);

    const existingPhases = clusters.find((cluster) => cluster.id === editingId)?.phases ?? [];

    setFormError('');
    try {
      await updateMut.mutateAsync({
        id: editingId,
        data: {
          name: form.name.trim(),
          type: form.type as ClusterType,
          factory_id: form.factory_id,
          phases: toPhasePayload(form.phases, existingPhases),
        },
      });
    } catch {
      // onError surfaces the validation message for the form.
    }
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

  const clusters = clustersQ.data ?? [];
  const factories = factoriesQ.data ?? [];

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
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Milestone Dates</h3>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                {PHASE_ORDER.map((phase) => (
                  <div key={phase}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {PHASE_LABELS[phase]} Date
                    </label>
                    <input
                      name={phase}
                      type="date"
                      value={form.phases[phase]}
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
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factory</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clusters
                  .sort((a, b) => (a.factory_name ?? '').localeCompare(b.factory_name ?? ''))
                  .map((cluster) => {
                    const status = cluster.status ?? 'PO';
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
                    );
                  })}
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
    </div>
  );
}
