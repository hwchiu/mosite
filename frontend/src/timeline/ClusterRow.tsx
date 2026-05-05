import PhaseCell from './PhaseCell';
import { resolveClusterCells } from './utils';
import type { Cluster } from '../types';

interface Props {
  cluster: Cluster;
  columns: string[];
  mode: 'week' | 'month';
  nowColumn: string;
}

export default function ClusterRow({ cluster, columns, mode, nowColumn }: Props) {
  const cells = resolveClusterCells(cluster.phases ?? [], columns, mode);

  return (
    <div
      className="grid gap-px items-center py-0.5 border-b border-gray-100"
      style={{ gridTemplateColumns: `180px repeat(${columns.length}, 1fr)` }}
    >
      {/* Label */}
      <div className="pl-6 pr-2">
        <div className="text-[11px] text-gray-700 font-medium">{cluster.name}</div>
        <div className="text-[9px] text-gray-400">{cluster.type}</div>
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
