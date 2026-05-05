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
      className="grid gap-px items-center py-0.5 border-b border-[#1e1e2e]"
      style={{ gridTemplateColumns: `180px repeat(${columns.length}, 1fr)` }}
    >
      {/* Label */}
      <div className="pl-6 pr-2">
        <div className="text-[11px] text-[#cdd6f4]">{cluster.name}</div>
        <div className="text-[9px] text-[#6c7086]">{cluster.type} · {cluster.serverCount ?? '?'}台</div>
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
