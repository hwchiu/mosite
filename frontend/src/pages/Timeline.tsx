import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { fetchTimelineClusters } from '../api/timeline';
import { updateCluster } from '../api/clusters';
import TimelineToolbar from '../timeline/TimelineToolbar';
import FactorySidebar from '../timeline/FactorySidebar';
import FactoryGroup from '../timeline/FactoryGroup';
import WeekHeader from '../timeline/WeekHeader';
import MonthHeader from '../timeline/MonthHeader';
import {
  buildWeekColumns,
  buildMonthColumns,
  currentISOWeek,
  weekToMonth,
  PHASE_ORDER,
  validatePhaseDates,
} from '../timeline/utils';
import type { Cluster, Factory, PhaseKey, ClusterPhase } from '../types';


const PHASE_LABELS: Record<PhaseKey, string> = {
  purchase: 'Purchase',
  movein:   'Move-In',
  infra:    'Infra',
  cluster:  'Cluster',
  platform: 'Platform',
  release:  'Release',
};

type PhaseForm = Record<PhaseKey, string>;

function phaseFormFromCluster(cluster: Cluster): PhaseForm {
  const form: PhaseForm = { purchase: '', movein: '', infra: '', cluster: '', platform: '', release: '' };
  cluster.phases?.forEach(p => { form[p.phase] = p.date ?? ''; });
  return form;
}

interface DrawerProps {
  cluster: Cluster;
  onClose: () => void;
  onSaved: () => void;
}

function ClusterEditDrawer({ cluster, onClose, onSaved }: DrawerProps) {
  const queryClient = useQueryClient();
  const [phases, setPhases] = useState<PhaseForm>(() => phaseFormFromCluster(cluster));
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (phases: ClusterPhase[]) => updateCluster(cluster.id, { phases }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['timeline-clusters'] });
      onSaved();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: ClusterPhase[] = PHASE_ORDER.map((phase, i) => {
      const existing = cluster.phases?.find(p => p.phase === phase);
      return { ...existing, phase, date: phases[phase], order: i };
    });
    const errs = validatePhaseDates(payload);
    const firstErr = Object.values(errs)[0];
    if (firstErr) { setError(firstErr); return; }
    setError('');
    mutation.mutate(payload);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <div className="font-semibold text-gray-900 text-sm">{cluster.name}</div>
            <div className="text-xs text-gray-400">{cluster.factory_name} · {cluster.type}</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-y-auto">
          <div className="px-5 py-4 space-y-4 flex-1">
            <p className="text-xs text-gray-500">Edit milestone completion dates for each phase.</p>
            {error && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-600">{error}</div>
            )}
            {PHASE_ORDER.map(phase => (
              <div key={phase}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{PHASE_LABELS[phase]}</label>
                <input
                  type="date"
                  value={phases[phase]}
                  onChange={e => setPhases(prev => ({ ...prev, [phase]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
            ))}
          </div>

          <div className="px-5 py-4 border-t border-gray-200 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// Legend bar at bottom
function Legend() {
  const items = [
    { label: 'Purchase', color: '#94a3b8' },
    { label: 'Move-In',  color: '#f59e0b' },
    { label: 'Infra',    color: '#6366f1' },
    { label: 'Cluster',  color: '#3b82f6' },
    { label: 'Platform', color: '#8b5cf6' },
    { label: 'Release',  color: '#10b981' },
  ];
  return (
    <div className="flex gap-3 px-3 py-1.5 bg-white border-t border-gray-200 flex-wrap flex-shrink-0">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: item.color }} />
          <span className="text-[10px] text-gray-500">{item.label}</span>
        </div>
      ))}
      <span className="ml-auto text-[10px] text-gray-400">藍色外框 = 當前 Phase</span>
    </div>
  );
}

export default function Timeline() {
  const currentUtcYear = () => new Date().getUTCFullYear();
  const [mode, setMode] = useState<'week' | 'month'>('week');
  const [weekOffset, setWeekOffset] = useState(0);   // shift from default W-3
  const [year, setYear] = useState(currentUtcYear);
  const [typeFilter, setTypeFilter] = useState<'all' | 'k8s' | 'vm'>('all');
  const [nameFilter, setNameFilter] = useState('');
  const [editingCluster, setEditingCluster] = useState<Cluster | null>(null);

  const { data: clusters = [], isLoading } = useQuery({
    queryKey: ['timeline-clusters'],
    queryFn: fetchTimelineClusters,
  });

  // Apply type + name filters
  const filteredClusters = useMemo(() => {
    return clusters.filter(c => {
      if (typeFilter !== 'all' && c.type !== typeFilter) return false;
      if (nameFilter && !c.name.toLowerCase().includes(nameFilter.toLowerCase())) return false;
      return true;
    });
  }, [clusters, typeFilter, nameFilter]);

  // Derive factory list from filtered clusters
  const factories = useMemo((): Factory[] => {
    const map = new Map<string, Factory>();
    filteredClusters.forEach(c => {
      if (!map.has(c.factory_id)) {
        map.set(c.factory_id, {
          id: c.factory_id,
          name: c.factory_name ?? c.factory_id,
          created_at: '',
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredClusters]);

  const allVisibleIds = useMemo(() => new Set(factories.map(f => f.id)), [factories]);
  const [visibleIds, setVisibleIds] = useState<Set<string> | null>(null);
  const activeVisibleIds = visibleIds ?? allVisibleIds;

  // Columns
  const nowWeek = currentISOWeek();
  const nowMonth = weekToMonth(nowWeek);
  const columns = useMemo(() =>
    mode === 'week'
      ? buildWeekColumns(-3 + weekOffset, 14)
      : buildMonthColumns(year),
    [mode, weekOffset, year]
  );
  const nowColumn = mode === 'week' ? nowWeek : nowMonth;

  // Filter + group clusters by factory
  const visibleFactories = factories.filter(f => activeVisibleIds.has(f.id));
  const clustersByFactory = useMemo(() => {
    const map = new Map<string, typeof filteredClusters>();
    filteredClusters.forEach(c => {
      if (!map.has(c.factory_id)) map.set(c.factory_id, []);
      map.get(c.factory_id)!.push(c);
    });
    return map;
  }, [filteredClusters]);

  function handleShowAll() { setVisibleIds(new Set(factories.map(f => f.id))); }

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="flex h-full overflow-hidden -m-6">
        <FactorySidebar
          factories={factories}
          visibleIds={activeVisibleIds}
          onToggle={id => setVisibleIds(prev => {
            const next = new Set(prev ?? allVisibleIds);
            if (next.has(id)) {
              next.delete(id);
            } else {
              next.add(id);
            }
            return next;
          })}
          onShowAll={handleShowAll}
        />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TimelineToolbar
          mode={mode}
          onModeChange={m => { setMode(m); setWeekOffset(0); }}
          onPrev={() => mode === 'week' ? setWeekOffset(o => o - 3) : setYear(y => y - 1)}
          onNext={() => mode === 'week' ? setWeekOffset(o => o + 3) : setYear(y => y + 1)}
          onToday={() => mode === 'week' ? setWeekOffset(0) : setYear(currentUtcYear())}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          nameFilter={nameFilter}
          onNameFilterChange={setNameFilter}
        />
        <div className="flex-1 overflow-auto">
          <div style={{ minWidth: '900px' }}>
            {mode === 'week'
              ? <WeekHeader columns={columns} nowColumn={nowColumn} />
              : <MonthHeader columns={columns} nowColumn={nowColumn} />
            }
            {visibleFactories.map(factory => (
              <FactoryGroup
                key={factory.id}
                factory={factory}
                clusters={clustersByFactory.get(factory.id) ?? []}
                columns={columns}
                mode={mode}
                nowColumn={nowColumn}
                defaultExpanded={true}
                onEdit={setEditingCluster}
              />
            ))}
          </div>
        </div>
        <Legend />
      </div>
      {editingCluster && (
        <ClusterEditDrawer
          cluster={editingCluster}
          onClose={() => setEditingCluster(null)}
          onSaved={() => setEditingCluster(null)}
        />
      )}
    </div>
  );
}
