import { useState } from 'react';
import { Pencil, ChevronRight, ChevronDown } from 'lucide-react';
import PhaseCell from './PhaseCell';
import { resolveClusterCells } from './utils';
import type { Cluster, ClusterOperation } from '../types';

interface OperationRowProps {
  operation: ClusterOperation;
  label: string;
  columns: string[];
  mode: 'week' | 'month';
  nowColumn: string;
  onEdit?: () => void;
  isChild?: boolean;
}

function OperationRow({ operation, label, columns, mode, nowColumn, onEdit, isChild }: OperationRowProps) {
  const cells = resolveClusterCells(operation.phases, columns, mode);
  const hasDelayed = cells.some(c => c.isDelayed);

  return (
    <div
      className={`grid gap-px items-center py-0.5 border-b border-gray-100 ${isChild ? 'bg-gray-50/50' : ''}`}
      style={{
        gridTemplateColumns: `180px repeat(${columns.length}, 1fr)`,
        ...(hasDelayed ? { background: '#fff5f5' } : {}),
      }}
    >
      <div
        className={`${isChild ? 'pl-10' : 'pl-6'} pr-2 group flex items-center justify-between ${onEdit ? 'cursor-pointer hover:bg-indigo-50 rounded' : ''}`}
        onClick={onEdit}
        title={onEdit ? 'Click to edit phases' : undefined}
      >
        <div>
          <div className={`text-[11px] font-medium ${isChild ? 'text-gray-500' : 'text-gray-700'}`}>
            {hasDelayed ? '⚠ ' : ''}{label}
          </div>
          {isChild && (
            <div className="text-[9px] text-gray-400">
              {operation.type === 'init' ? 'init' : 'expansion'}
            </div>
          )}
        </div>
        {onEdit && (
          <Pencil size={11} className="text-gray-300 group-hover:text-indigo-500 flex-shrink-0 mr-1 transition-colors" />
        )}
      </div>
      {cells.map((cell, i) => (
        <PhaseCell key={columns[i]} cell={cell} isNowColumn={columns[i] === nowColumn} />
      ))}
    </div>
  );
}

interface Props {
  cluster: Cluster;
  columns: string[];
  mode: 'week' | 'month';
  nowColumn: string;
  onEdit?: (cluster: Cluster, operationId?: string) => void;
}

export default function ClusterRow({ cluster, columns, mode, nowColumn, onEdit }: Props) {
  const [expanded, setExpanded] = useState(false);
  const operations = cluster.operations ?? [];

  if (operations.length === 0) {
    // Fallback: legacy cluster with no operations
    const cells = resolveClusterCells(cluster.phases ?? [], columns, mode);
    return (
      <div
        className="grid gap-px items-center py-0.5 border-b border-gray-100"
        style={{ gridTemplateColumns: `180px repeat(${columns.length}, 1fr)` }}
      >
        <div className="pl-6 pr-2 flex items-center">
          <div className="text-[11px] text-gray-700 font-medium">{cluster.name}</div>
        </div>
        {cells.map((cell, i) => (
          <PhaseCell key={columns[i]} cell={cell} isNowColumn={columns[i] === nowColumn} />
        ))}
      </div>
    );
  }

  const initOp = operations.find(op => op.type === 'init') ?? operations[0];

  if (operations.length === 1) {
    // Single operation: show as flat row (no expand toggle)
    return (
      <OperationRow
        operation={initOp}
        label={cluster.name}
        columns={columns}
        mode={mode}
        nowColumn={nowColumn}
        onEdit={onEdit ? () => onEdit(cluster, initOp.id) : undefined}
      />
    );
  }

  // Multiple operations: collapsible parent
  return (
    <>
      {/* Parent summary row — always shows init operation phases */}
      <div
        className="grid gap-px items-center py-0.5 border-b border-gray-100 cursor-pointer hover:bg-indigo-50/30"
        style={{ gridTemplateColumns: `180px repeat(${columns.length}, 1fr)` }}
        onClick={() => setExpanded(e => !e)}
      >
        <div className="pl-3 pr-2 flex items-center gap-1">
          <span className="text-gray-400 flex-shrink-0">
            {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </span>
          <div>
            <div className="text-[11px] text-gray-700 font-medium">{cluster.name}</div>
            <div className="text-[9px] text-gray-400">{operations.length} ops</div>
          </div>
        </div>
        {resolveClusterCells(initOp.phases, columns, mode).map((cell, i) => (
          <PhaseCell key={columns[i]} cell={cell} isNowColumn={columns[i] === nowColumn} />
        ))}
      </div>

      {/* Child operation rows */}
      {expanded && operations.map((op, idx) => (
        <OperationRow
          key={op.id}
          operation={op}
          label={op.type === 'init' ? 'Init' : op.label ?? `Expansion #${idx}`}
          columns={columns}
          mode={mode}
          nowColumn={nowColumn}
          isChild
          onEdit={onEdit ? () => onEdit(cluster, op.id) : undefined}
        />
      ))}
    </>
  );
}
