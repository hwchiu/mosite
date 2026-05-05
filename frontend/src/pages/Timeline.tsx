import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTimelineClusters } from '../api/timeline';
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
} from '../timeline/utils';
import type { Factory } from '../types';

// Legend bar at bottom
function Legend() {
  const items = [
    { label: '採購完畢', color: '#6c7086' },
    { label: '等待Infra', color: '#fab387' },
    { label: 'Cluster Build', color: '#89b4fa' },
    { label: '等待Platform', color: '#cba6f7' },
    { label: 'Active', color: '#a6e3a1' },
  ];
  return (
    <div className="flex gap-3 px-3 py-1.5 bg-[#1e1e2e] border-t border-[#313244] flex-wrap flex-shrink-0">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: item.color }} />
          <span className="text-[10px] text-[#6c7086]">{item.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-1">
        <span className="w-3 h-3 rounded-sm border border-dashed border-[#6c7086]" />
        <span className="text-[10px] text-[#6c7086]">預估</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="w-3 h-3 rounded-sm" style={{ background: '#f38ba840', border: '2px dashed #f38ba8' }} />
        <span className="text-[10px] text-[#6c7086]">BLOCKED</span>
      </div>
      <span className="ml-auto text-[10px] text-[#45475a]">紫色外框 = 當前 Phase</span>
    </div>
  );
}

export default function Timeline() {
  const [mode, setMode] = useState<'week' | 'month'>('week');
  const [weekOffset, setWeekOffset] = useState(0);   // shift from default W-3
  const [year, setYear] = useState(() => new Date().getFullYear());

  const { data: clusters = [], isLoading } = useQuery({
    queryKey: ['timeline-clusters'],
    queryFn: fetchTimelineClusters,
  });

  // Derive factory list from clusters
  const factories = useMemo((): Factory[] => {
    const map = new Map<string, Factory>();
    clusters.forEach(c => {
      if (!map.has(c.factory_id)) {
        map.set(c.factory_id, {
          id: c.factory_id,
          name: c.factory_name ?? c.factory_id,
          created_at: '',
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [clusters]);

  const [visibleIds, setVisibleIds] = useState<Set<string>>(() => new Set());
  // Initialize visibleIds once factories are loaded
  useEffect(() => {
    if (factories.length > 0 && visibleIds.size === 0) {
      setVisibleIds(new Set(factories.map(f => f.id)));
    }
  }, [factories]);

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
  const visibleFactories = factories.filter(f => visibleIds.has(f.id));
  const clustersByFactory = useMemo(() => {
    const map = new Map<string, typeof clusters>();
    clusters.forEach(c => {
      if (!map.has(c.factory_id)) map.set(c.factory_id, []);
      map.get(c.factory_id)!.push(c);
    });
    return map;
  }, [clusters]);

  // Factories with blocked clusters (auto-expand)
  const blockedFactoryIds = useMemo(() =>
    new Set(clusters.filter(c => c.phases?.some(p => p.status === 'blocked')).map(c => c.factory_id)),
    [clusters]
  );

  function handleShowAll() { setVisibleIds(new Set(factories.map(f => f.id))); }
  function handleShowProblems() {
    setVisibleIds(new Set(factories.filter(f => blockedFactoryIds.has(f.id)).map(f => f.id)));
  }

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center text-[#6c7086]">Loading...</div>;
  }

  return (
    <div className="flex h-full overflow-hidden -m-6">
      <FactorySidebar
        factories={factories}
        visibleIds={visibleIds}
        onToggle={id => setVisibleIds(prev => {
          const next = new Set(prev);
          next.has(id) ? next.delete(id) : next.add(id);
          return next;
        })}
        onShowAll={handleShowAll}
        onShowProblems={handleShowProblems}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TimelineToolbar
          mode={mode}
          onModeChange={m => { setMode(m); setWeekOffset(0); }}
          onPrev={() => mode === 'week' ? setWeekOffset(o => o - 3) : setYear(y => y - 1)}
          onNext={() => mode === 'week' ? setWeekOffset(o => o + 3) : setYear(y => y + 1)}
          onToday={() => mode === 'week' ? setWeekOffset(0) : setYear(new Date().getFullYear())}
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
              />
            ))}
          </div>
        </div>
        <Legend />
      </div>
    </div>
  );
}
