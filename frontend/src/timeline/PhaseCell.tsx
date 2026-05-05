import type { PhaseKey } from '../types';
import type { ResolvedPhaseCell } from './utils';

const PHASE_COLORS: Record<PhaseKey, string> = {
  purchased:        '#6c7086',
  waiting_infra:    '#fab387',
  waiting_build:    '#89b4fa',
  waiting_platform: '#cba6f7',
  active:           '#a6e3a1',
  retired:          '#45475a',
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
        className="h-5 rounded-sm"
        style={{ background: isNowColumn ? 'rgba(203,166,247,0.05)' : 'transparent' }}
      />
    );
  }

  if (cell.status === 'blocked') {
    return (
      <div
        className="h-5 rounded-sm"
        style={{
          background: '#f38ba840',
          border: '2px dashed #f38ba8',
          outline: cell.isCurrentPhase ? '2px solid #cba6f7' : undefined,
          outlineOffset: '-1px',
        }}
        title="BLOCKED"
      />
    );
  }

  if (cell.status === 'estimated') {
    const color = PHASE_COLORS[cell.phases[cell.phases.length - 1]];
    return (
      <div
        className="h-5 rounded-sm"
        style={{
          background: 'transparent',
          border: `1px dashed ${color}`,
          outline: cell.isCurrentPhase ? '2px solid #cba6f7' : undefined,
          outlineOffset: '-1px',
        }}
      />
    );
  }

  return (
    <div
      className="h-5 rounded-sm"
      style={{
        background: buildGradient(cell.phases),
        outline: cell.isCurrentPhase ? '2px solid #cba6f7' : undefined,
        outlineOffset: '-1px',
        boxSizing: 'border-box',
      }}
    />
  );
}
