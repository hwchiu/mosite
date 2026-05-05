import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listFactories, createFactory, deleteFactory } from '../api/factories';
import { listClusters, createCluster, deleteCluster } from '../api/clusters';
import { listBatches, createBatch, updateBatch } from '../api/batches';
import type { ClusterType } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { Trash2, Plus, RotateCcw, Factory, Network, Package } from 'lucide-react';
import { resetDB } from '../mock/store';

type Tab = 'factories' | 'clusters' | 'batches';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('factories');

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'factories', label: '廠區管理', icon: Factory },
    { id: 'clusters', label: 'Cluster 管理', icon: Network },
    { id: 'batches', label: '採購批次管理', icon: Package },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">系統設定</h1>
          <p className="text-sm text-gray-500 mt-0.5">管理廠區、Cluster 及採購批次基礎資料</p>
        </div>
        <ResetButton />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {activeTab === 'factories' && <FactoriesTab />}
        {activeTab === 'clusters' && <ClustersTab />}
        {activeTab === 'batches' && <BatchesTab />}
      </div>
    </div>
  );
}

// ── Reset Button ─────────────────────────────────────────────────────────────

function ResetButton() {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  function handleReset() {
    if (!confirming) { setConfirming(true); return; }
    resetDB();
    qc.invalidateQueries();
    setConfirming(false);
  }

  return (
    <button
      onClick={handleReset}
      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
        confirming
          ? 'bg-red-600 text-white border-red-600'
          : 'bg-white text-gray-600 border-gray-300 hover:border-red-400 hover:text-red-600'
      }`}
      onBlur={() => setConfirming(false)}
    >
      <RotateCcw size={14} />
      {confirming ? '確定重置？' : '重置模擬資料'}
    </button>
  );
}

// ── Factories Tab ─────────────────────────────────────────────────────────────

function FactoriesTab() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const { data: factories, isLoading } = useQuery({ queryKey: ['factories'], queryFn: listFactories });

  const addMutation = useMutation({
    mutationFn: () => createFactory({ name: name.trim() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['factories'] }); setName(''); setError(''); },
    onError: (e: Error) => setError(e.message),
  });

  const delMutation = useMutation({
    mutationFn: deleteFactory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['factories'] }),
    onError: (e: Error) => setError(e.message),
  });

  if (isLoading) return <div className="p-6"><LoadingSpinner /></div>;

  return (
    <div className="p-6 space-y-5">
      {/* Add form */}
      <div className="flex gap-3 items-start">
        <div className="flex-1">
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="廠區名稱，例如 F6"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addMutation.mutate()}
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
        <button
          onClick={() => addMutation.mutate()}
          disabled={!name.trim() || addMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={14} /> 新增廠區
        </button>
      </div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-y border-gray-200">
          <tr>
            <th className="text-left px-4 py-2.5 font-medium text-gray-600">廠區名稱</th>
            <th className="text-left px-4 py-2.5 font-medium text-gray-600">建立時間</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {(factories ?? []).map(f => (
            <tr key={f.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-800">{f.name}</td>
              <td className="px-4 py-3 text-gray-500">{new Date(f.created_at).toLocaleDateString('zh-TW')}</td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => delMutation.mutate(f.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                  title="刪除廠區"
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
          {(factories ?? []).length === 0 && (
            <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">尚無廠區資料</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Clusters Tab ──────────────────────────────────────────────────────────────

function ClustersTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', type: 'k8s' as ClusterType, factory_id: '', description: '' });
  const [error, setError] = useState('');

  const { data: clusters, isLoading: lc } = useQuery({ queryKey: ['clusters'], queryFn: () => listClusters() });
  const { data: factories, isLoading: lf } = useQuery({ queryKey: ['factories'], queryFn: listFactories });

  const addMutation = useMutation({
    mutationFn: () => createCluster({ name: form.name.trim(), type: form.type, factory_id: form.factory_id, description: form.description.trim() || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clusters'] }); setForm({ name: '', type: 'k8s', factory_id: '', description: '' }); setError(''); },
    onError: (e: Error) => setError(e.message),
  });

  const delMutation = useMutation({
    mutationFn: deleteCluster,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clusters'] }),
    onError: (e: Error) => setError(e.message),
  });

  if (lc || lf) return <div className="p-6"><LoadingSpinner /></div>;

  const canAdd = form.name.trim() && form.factory_id;

  return (
    <div className="p-6 space-y-5">
      {/* Add form */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Cluster 名稱 *</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="例如 F6-K8S-Prod"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">類型 *</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={form.type}
            onChange={e => setForm(p => ({ ...p, type: e.target.value as ClusterType }))}
          >
            <option value="k8s">Kubernetes (k8s)</option>
            <option value="vm">Virtual Machine (vm)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">廠區 *</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={form.factory_id}
            onChange={e => setForm(p => ({ ...p, factory_id: e.target.value }))}
          >
            <option value="">-- 選擇廠區 --</option>
            {(factories ?? []).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">說明</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="選填"
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        onClick={() => addMutation.mutate()}
        disabled={!canAdd || addMutation.isPending}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus size={14} /> 新增 Cluster
      </button>

      {/* Table */}
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-y border-gray-200">
          <tr>
            <th className="text-left px-4 py-2.5 font-medium text-gray-600">名稱</th>
            <th className="text-left px-4 py-2.5 font-medium text-gray-600">類型</th>
            <th className="text-left px-4 py-2.5 font-medium text-gray-600">廠區</th>
            <th className="text-left px-4 py-2.5 font-medium text-gray-600">說明</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {(clusters ?? []).map(c => (
            <tr key={c.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  c.type === 'k8s' ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'
                }`}>{c.type.toUpperCase()}</span>
              </td>
              <td className="px-4 py-3 text-gray-600">{c.factory_name}</td>
              <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">{c.description ?? '—'}</td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => delMutation.mutate(c.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
          {(clusters ?? []).length === 0 && (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">尚無 Cluster 資料</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Batches Tab ───────────────────────────────────────────────────────────────

function BatchesTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', purchase_date: '', factory_id: '', notes: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', notes: '' });
  const [error, setError] = useState('');

  const { data: batches, isLoading: lb } = useQuery({ queryKey: ['batches'], queryFn: () => listBatches() });
  const { data: factories, isLoading: lf } = useQuery({ queryKey: ['factories'], queryFn: listFactories });

  const addMutation = useMutation({
    mutationFn: () => createBatch({ name: form.name.trim(), purchase_date: form.purchase_date, factory_id: form.factory_id || undefined, notes: form.notes.trim() || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['batches'] }); setForm({ name: '', purchase_date: '', factory_id: '', notes: '' }); setError(''); },
    onError: (e: Error) => setError(e.message),
  });

  const editMutation = useMutation({
    mutationFn: () => updateBatch(editingId!, { name: editForm.name.trim(), notes: editForm.notes.trim() || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['batches'] }); setEditingId(null); },
    onError: (e: Error) => setError(e.message),
  });

  if (lb || lf) return <div className="p-6"><LoadingSpinner /></div>;

  const canAdd = form.name.trim() && form.purchase_date;

  return (
    <div className="p-6 space-y-5">
      {/* Add form */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">批次名稱 *</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="例如 2025-Q3-F6-Batch1"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">採購日期 *</label>
          <input
            type="date"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={form.purchase_date}
            onChange={e => setForm(p => ({ ...p, purchase_date: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">目標廠區</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={form.factory_id}
            onChange={e => setForm(p => ({ ...p, factory_id: e.target.value }))}
          >
            <option value="">-- 不指定 --</option>
            {(factories ?? []).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">備註</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="選填"
            value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        onClick={() => addMutation.mutate()}
        disabled={!canAdd || addMutation.isPending}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus size={14} /> 新增批次
      </button>

      {/* Table */}
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-y border-gray-200">
          <tr>
            <th className="text-left px-4 py-2.5 font-medium text-gray-600">批次名稱</th>
            <th className="text-left px-4 py-2.5 font-medium text-gray-600">採購日期</th>
            <th className="text-left px-4 py-2.5 font-medium text-gray-600">廠區</th>
            <th className="text-left px-4 py-2.5 font-medium text-gray-600">機器數</th>
            <th className="text-left px-4 py-2.5 font-medium text-gray-600">備註</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {(batches ?? []).map(b => (
            <tr key={b.id} className="hover:bg-gray-50 transition-colors">
              {editingId === b.id ? (
                <>
                  <td className="px-4 py-2" colSpan={2}>
                    <input
                      className="w-full border border-indigo-300 rounded px-2 py-1 text-sm focus:outline-none"
                      value={editForm.name}
                      onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                    />
                  </td>
                  <td className="px-4 py-2 text-gray-500">{b.factory_name ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-500">{b.server_count ?? 0}</td>
                  <td className="px-4 py-2">
                    <input
                      className="w-full border border-indigo-300 rounded px-2 py-1 text-sm focus:outline-none"
                      value={editForm.notes}
                      onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                    />
                  </td>
                  <td className="px-4 py-2 text-right flex gap-1 justify-end">
                    <button onClick={() => editMutation.mutate()} className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700">儲存</button>
                    <button onClick={() => setEditingId(null)} className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300">取消</button>
                  </td>
                </>
              ) : (
                <>
                  <td className="px-4 py-3 font-medium text-gray-800">{b.name}</td>
                  <td className="px-4 py-3 text-gray-500">{b.purchase_date}</td>
                  <td className="px-4 py-3 text-gray-500">{b.factory_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{b.server_count ?? 0}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs truncate max-w-xs">{b.notes ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { setEditingId(b.id); setEditForm({ name: b.name, notes: b.notes ?? '' }); }}
                      className="text-xs px-2 py-1 text-gray-500 border border-gray-200 rounded hover:bg-gray-100 mr-1"
                    >
                      編輯
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
          {(batches ?? []).length === 0 && (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">尚無批次資料</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
