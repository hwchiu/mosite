import type { PhaseKey } from '../types';
import type { ResolvedPhaseCell } from './utils';

const PHASE_COLORS: Record<PhaseKey, string> = {
  purchase: '#94a3b8',  // slate-400
  movein:   '#f59e0b',  // amber-500
  infra:    '#6366f1',  // indigo-500
  cluster:  '#3b82f6',  // blue-500
  platform: '#8b5cf6',  // violet-500
  release:  '#10b981',  // emerald-500
};

function buildGradient(phases: PhaseKey[]): string {
  if (phases.length === 1) return PHASE_COLORS[phases[0]];
  const pct = 100 / phases.length;
  const stops = phases.flatMap((p, i) => {
    const color = PHASE_COLORS[p];
    return [`${color} ${(i * pct).toFixed(1)}%`, `${color} ${((i + 1) * pct).toFixed(1)}%`];
  });
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

interface Props {
  cell: ResolvedPhaseCell;
  isNowColumn?: boolean;
}

export default function PhaseCell({ cell, isNowColumn }: Props) {
  if (cell.phases.length === 0) {
    return (
      <div
        className="h-5"
        style={{ background: isNowColumn ? 'rgba(99,102,241,0.06)' : 'transparent' }}
      />
    );
  }

  return (
    <div
      className="h-5"
      style={{
        background: buildGradient(cell.phases),
        outline: cell.isCurrentPhase ? '2px solid #6366f1' : undefined,
        outlineOffset: '-1px',
        boxSizing: 'border-box',
      }}
      title={cell.status === 'blocked' ? 'BLOCKED' : undefined}
    />
  );
}
