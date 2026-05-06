import { Pencil } from 'lucide-react';
import PhaseCell from './PhaseCell';
import { resolveClusterCells } from './utils';
import type { Cluster } from '../types';

interface Props {
  cluster: Cluster;
  columns: string[];
  mode: 'week' | 'month';
  nowColumn: string;
  onEdit?: (cluster: Cluster) => void;
}

export default function ClusterRow({ cluster, columns, mode, nowColumn, onEdit }: Props) {
  const cells = resolveClusterCells(cluster.phases ?? [], columns, mode);

  return (
    <div
      className="grid gap-px items-center py-0.5 border-b border-gray-100"
      style={{ gridTemplateColumns: `180px repeat(${columns.length}, 1fr)` }}
    >
      {/* Label */}
      <div
        className={`pl-6 pr-2 group flex items-center justify-between ${onEdit ? 'cursor-pointer hover:bg-indigo-50 rounded' : ''}`}
        onClick={() => onEdit?.(cluster)}
        title={onEdit ? 'Click to edit phases' : undefined}
      >
        <div>
          <div className="text-[11px] text-gray-700 font-medium">{cluster.name}</div>
          <div className="text-[9px] text-gray-400">{cluster.type}</div>
        </div>
        {onEdit && (
          <Pencil size={11} className="text-gray-300 group-hover:text-indigo-500 flex-shrink-0 mr-1 transition-colors" />
        )}
      </div>

      {/* Phase cells */}
      {cells.map((cell, i) => (
        <PhaseCell
          key={columns[i]}
          cell={cell}
          isNowColumn={columns[i] === nowColumn}
        />
      ))}
    </div>
  );
}
