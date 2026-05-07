import { useState } from 'react';
import ClusterRow from './ClusterRow';
import type { Cluster, Factory } from '../types';

interface Props {
  factory: Factory;
  clusters: Cluster[];
  columns: string[];
  mode: 'week' | 'month';
  nowColumn: string;
  defaultExpanded?: boolean;
  onEdit?: (cluster: Cluster, operationId?: string) => void;
}

function currentOpPhases(c: Cluster) {
  const ops = c.operations;
  return ops?.length ? ops[ops.length - 1].phases : c.phases ?? [];
}

export default function FactoryGroup({ factory, clusters, columns, mode, nowColumn, defaultExpanded = true, onEdit }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Phase summary counts
  const phaseSummary = clusters.reduce((acc, c) => {
    const phases = currentOpPhases(c);
    const current = phases.find(p => p.status === 'in_progress' || p.status === 'blocked');
    if (current) acc[current.phase] = (acc[current.phase] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="border-b border-gray-200">
      {/* Factory header */}
      <div
        className="grid items-center bg-gray-50 cursor-pointer hover:bg-gray-100 sticky top-[33px] z-[5]"
        style={{ gridTemplateColumns: '180px 1fr' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-1.5 px-2 py-1.5">
          <span className="text-[10px] text-gray-400 transition-transform duration-200"
            style={{ display: 'inline-block', transform: expanded ? 'rotate(0)' : 'rotate(-90deg)' }}>
            ▼
          </span>
          <span className="font-bold text-[12px] text-gray-800">{factory.name} 廠區</span>
          <span className="text-[9px] text-gray-500 bg-gray-200 px-1.5 rounded-full">{clusters.length} clusters</span>

        </div>
        <div className="flex gap-2 px-2 flex-wrap">
          {Object.entries(phaseSummary).map(([phase, count]) => (
            <span key={phase} className="text-[9px] text-gray-500">
              {phase}×{count}
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
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}
