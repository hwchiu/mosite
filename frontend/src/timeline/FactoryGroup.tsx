import { useState } from 'react';
import ClusterRow from './ClusterRow';
import type { Cluster, Factory } from '../types';

const FACTORY_COLORS = ['#f38ba8','#fab387','#f9e2af','#a6e3a1','#89dceb','#89b4fa','#cba6f7'];

interface Props {
  factory: Factory;
  clusters: Cluster[];
  columns: string[];
  mode: 'week' | 'month';
  nowColumn: string;
  defaultExpanded?: boolean;
}

export default function FactoryGroup({ factory, clusters, columns, mode, nowColumn, defaultExpanded = true }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const colorIndex = parseInt(factory.id.replace(/\D/g, ''), 10) % FACTORY_COLORS.length;
  const color = FACTORY_COLORS[colorIndex];

  const hasBlocked = clusters.some(c =>
    c.phases?.some(p => p.status === 'blocked')
  );

  // Phase summary counts
  const phaseSummary = clusters.reduce((acc, c) => {
    const current = c.phases?.find(p => p.status === 'in_progress' || p.status === 'blocked');
    if (current) acc[current.phase] = (acc[current.phase] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const PHASE_EMOJI: Record<string, string> = {
    purchased: '🛒', waiting_infra: '⚙️', waiting_build: '🔨',
    waiting_platform: '🚀', active: '🟢', retired: '⬛',
  };

  return (
    <div className="border-b border-[#313244]">
      {/* Factory header */}
      <div
        className="grid items-center bg-[#181825] cursor-pointer hover:bg-[#1e1e2e] sticky top-[33px] z-[5]"
        style={{ gridTemplateColumns: '180px 1fr' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-1.5 px-2 py-1.5">
          <span className="text-[10px] text-[#6c7086] transition-transform duration-200"
            style={{ display: 'inline-block', transform: expanded ? 'rotate(0)' : 'rotate(-90deg)' }}>
            ▼
          </span>
          <span className="font-bold text-[12px]" style={{ color }}>{factory.name} 廠區</span>
          <span className="text-[9px] text-[#6c7086] bg-[#313244] px-1.5 rounded-full">{clusters.length} clusters</span>
          {hasBlocked && <span className="text-[10px] text-[#f38ba8]">⚠ BLOCKED</span>}
        </div>
        <div className="flex gap-2 px-2 flex-wrap">
          {Object.entries(phaseSummary).map(([phase, count]) => (
            <span key={phase} className="text-[9px] text-[#6c7086]">
              {PHASE_EMOJI[phase] ?? '•'} {phase.replace('waiting_', '').replace('_', ' ')}×{count}
            </span>
          ))}
        </div>
      </div>

      {/* Cluster rows */}
      {expanded && clusters.map(cluster => (
        <ClusterRow
          key={cluster.id}
          cluster={cluster}
          columns={columns}
          mode={mode}
          nowColumn={nowColumn}
        />
      ))}
    </div>
  );
}
