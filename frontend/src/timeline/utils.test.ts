import { describe, it, expect } from 'vitest';
import {
  parseISOWeek,
  compareWeeks,
  compareColumns,
  weekToMonth,
  buildWeekColumns,
  buildMonthColumns,
  resolveClusterCells,
} from './utils';
import type { ClusterPhase } from '../types';

describe('parseISOWeek', () => {
  it('parses year and week', () => {
    expect(parseISOWeek('2026-W19')).toEqual({ year: 2026, week: 19 });
    expect(parseISOWeek('2025-W01')).toEqual({ year: 2025, week: 1 });
  });
});

describe('compareWeeks', () => {
  it('returns 0 for equal weeks', () => {
    expect(compareWeeks('2026-W19', '2026-W19')).toBe(0);
  });
  it('returns -1 when a is earlier', () => {
    expect(compareWeeks('2026-W18', '2026-W19')).toBe(-1);
    expect(compareWeeks('2025-W52', '2026-W01')).toBe(-1);
  });
  it('returns 1 when a is later', () => {
    expect(compareWeeks('2026-W20', '2026-W19')).toBe(1);
  });
});

describe('weekToMonth', () => {
  it('converts week to YYYY-MM', () => {
    // 2026-W01 is in January 2026
    expect(weekToMonth('2026-W01')).toBe('2026-01');
    // 2026-W19 is in May 2026
    expect(weekToMonth('2026-W19')).toBe('2026-05');
  });
});

describe('buildWeekColumns', () => {
  it('builds correct number of columns', () => {
    const cols = buildWeekColumns(-3, 14);
    expect(cols).toHaveLength(14);
  });
  it('columns are in ascending order', () => {
    const cols = buildWeekColumns(-3, 5);
    for (let i = 1; i < cols.length; i++) {
      expect(compareWeeks(cols[i - 1], cols[i])).toBe(-1);
    }
  });
});

describe('buildMonthColumns', () => {
  it('returns 12 months for a year', () => {
    const cols = buildMonthColumns(2026);
    expect(cols).toHaveLength(12);
    expect(cols[0]).toBe('2026-01');
    expect(cols[11]).toBe('2026-12');
  });
});

describe('compareColumns', () => {
  it('compares week strings correctly', () => {
    expect(compareColumns('2026-W18', '2026-W19')).toBe(-1);
    expect(compareColumns('2026-W19', '2026-W19')).toBe(0);
    expect(compareColumns('2026-W20', '2026-W19')).toBe(1);
  });
  it('compares month strings correctly', () => {
    expect(compareColumns('2026-04', '2026-05')).toBe(-1);
    expect(compareColumns('2026-05', '2026-05')).toBe(0);
    expect(compareColumns('2026-06', '2026-05')).toBe(1);
    expect(compareColumns('2025-12', '2026-01')).toBe(-1);
  });
});


describe('resolveClusterCells', () => {
  const phases: ClusterPhase[] = [
    { phase: 'purchased',     completionWeek: '2026-W17', status: 'completed' },
    { phase: 'waiting_infra', completionWeek: '2026-W19', status: 'in_progress' },
    { phase: 'waiting_build', completionWeek: '2026-W22', status: 'estimated' },
  ];

  it('returns one cell per column', () => {
    const cols = buildWeekColumns(-3, 14);
    const cells = resolveClusterCells(phases, cols, 'week');
    expect(cells).toHaveLength(14);
  });

  it('marks the cell of completion week with that phase', () => {
    const cols = ['2026-W17', '2026-W18', '2026-W19', '2026-W20'];
    const cells = resolveClusterCells(phases, cols, 'week');
    // W17 = purchased completion
    expect(cells[0].phases).toContain('purchased');
    // W18 = span of waiting_infra (W17 < W18 <= W19)
    expect(cells[1].phases).toContain('waiting_infra');
    // W19 = waiting_infra completion
    expect(cells[2].phases).toContain('waiting_infra');
    // W20 = span of waiting_build (W19 < W20 <= W22)
    expect(cells[3].phases).toContain('waiting_build');
  });

  it('detects current in-progress phase', () => {
    const cols = ['2026-W19'];
    const cells = resolveClusterCells(phases, cols, 'week');
    expect(cells[0].isCurrentPhase).toBe(true);
  });

  it('returns empty cell for columns before any phase', () => {
    const cols = ['2026-W10'];
    const cells = resolveClusterCells(phases, cols, 'week');
    expect(cells[0].phases).toHaveLength(0);
  });

  it('handles same-week multi-phase (B1 gradient scenario)', () => {
    const samePhasesWeek: ClusterPhase[] = [
      { phase: 'purchased',     completionWeek: '2026-W16', status: 'completed' },
      { phase: 'waiting_infra', completionWeek: '2026-W16', status: 'completed' },
      { phase: 'waiting_build', completionWeek: '2026-W19', status: 'in_progress' },
    ];
    const cols = ['2026-W16'];
    const cells = resolveClusterCells(samePhasesWeek, cols, 'week');
    expect(cells[0].phases).toEqual(['purchased', 'waiting_infra']);
  });

  it('maps weeks to months in month mode', () => {
    // W17 is April 2026; W19 is May 2026.
    // In May column only waiting_infra (W19) should appear;
    // purchased (W17=April) lands in '2026-04', not '2026-05'.
    const cols = ['2026-04', '2026-05'];
    const cells = resolveClusterCells(phases, cols, 'month');
    expect(cells[0].phases).toContain('purchased');   // W17 → April
    expect(cells[0].phases).not.toContain('waiting_infra');
    expect(cells[1].phases).toContain('waiting_infra'); // W19 → May
    expect(cells[1].phases).not.toContain('purchased');
  });

  it('uses blocked status for blocked phases', () => {
    const blockedPhases: ClusterPhase[] = [
      { phase: 'purchased',     completionWeek: '2026-W17', status: 'completed' },
      { phase: 'waiting_infra', completionWeek: '2026-W20', status: 'blocked' },
    ];
    const cols = ['2026-W18', '2026-W19', '2026-W20'];
    const cells = resolveClusterCells(blockedPhases, cols, 'week');
    expect(cells[0].status).toBe('blocked');
    expect(cells[1].status).toBe('blocked');
    expect(cells[2].status).toBe('blocked');
  });
});
