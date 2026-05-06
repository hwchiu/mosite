import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SEED_CLUSTERS } from '../mock/seed';
import {
  parseISOWeek,
  compareWeeks,
  compareColumns,
  weekToMonth,
  buildWeekColumns,
  buildMonthColumns,
  dateToWeekKey,
  dateToMonthKey,
  formatBusinessWeekLabel,
  deriveClusterStatus,
  validatePhaseDates,
  resolveClusterCells,
  currentISOWeek,
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

describe('timezone alignment regression', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('keeps current-week helpers aligned with UTC date-driven helpers at a timezone boundary', () => {
    vi.stubEnv('TZ', 'America/Los_Angeles');
    const now = new Date('2026-01-05T00:30:00Z');
    vi.setSystemTime(now);

    const utcDate = now.toISOString().slice(0, 10);

    expect(currentISOWeek()).toBe(dateToWeekKey(utcDate));
    expect(buildWeekColumns(0, 1)).toEqual([dateToWeekKey(utcDate)]);
    expect(weekToMonth(currentISOWeek())).toBe(dateToMonthKey(utcDate));
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

describe('formatBusinessWeekLabel', () => {
  it('formats 2026 week labels as W6xx', () => {
    expect(formatBusinessWeekLabel('2026-W01')).toBe('W601');
    expect(formatBusinessWeekLabel('2026-W19')).toBe('W619');
  });
});

describe('date-derived schedule helpers', () => {
  it('maps an ISO date to week and month keys', () => {
    expect(dateToWeekKey('2026-01-01')).toBe('2026-W01');
    expect(dateToMonthKey('2026-05-05')).toBe('2026-05');
  });

  it('preserves legacy month mapping when seed data is backfilled from ISO weeks', () => {
    const boundaryCluster = SEED_CLUSTERS.find((cluster) => cluster.id === 'c4');
    if (!boundaryCluster) {
      throw new Error('Expected boundary seed cluster c4 to exist');
    }
    if (!boundaryCluster.phases) {
      throw new Error('Expected boundary seed cluster c4 to include phases');
    }

    const boundaryPhase = boundaryCluster.phases.find((phase) => phase.phase === 'purchase');
    if (!boundaryPhase) {
      throw new Error('Expected boundary seed cluster c4 to include a PO phase');
    }

    const migratedWeekBoundaryDate = boundaryPhase.date;

    expect(migratedWeekBoundaryDate).toBe('2026-04-02');
    expect(dateToMonthKey(migratedWeekBoundaryDate)).toBe('2026-04');
  });

  it('derives the current cluster status from milestone dates', () => {
    const phases: ClusterPhase[] = [
      { phase: 'purchase', date: '2026-05-01' },
      { phase: 'movein', date: '2026-05-05' },
      { phase: 'infra', date: '2026-05-09' },
    ];

    expect(deriveClusterStatus(phases, new Date('2026-05-06T00:00:00Z'))).toBe('movein');
  });

  it('uses PHASE_ORDER to break same-day ties for current status', () => {
    const sameDayPhases: ClusterPhase[] = [
      { phase: 'movein', date: '2026-05-05' },
      { phase: 'purchase', date: '2026-05-05' },
      { phase: 'infra', date: '2026-05-09' },
    ];

    expect(deriveClusterStatus(sameDayPhases, new Date('2026-05-06T00:00:00Z'))).toBe(
      'movein',
    );
  });

  it('returns field errors when a milestone moves backward', () => {
    const phases: ClusterPhase[] = [
      { phase: 'purchase', date: '2026-05-06' },
      { phase: 'movein', date: '2026-05-05' },
    ];

    expect(validatePhaseDates(phases)).toEqual({
      movein: 'Move-In date must be on or after Purchase date.',
    });
  });

  it('validates milestone order even when phases are unsorted', () => {
    const phases: ClusterPhase[] = [
      { phase: 'movein', date: '2026-05-05' },
      { phase: 'purchase', date: '2026-05-06' },
    ];

    expect(validatePhaseDates(phases)).toEqual({
      movein: 'Move-In date must be on or after Purchase date.',
    });
  });
});


describe('resolveClusterCells', () => {
  const phases: ClusterPhase[] = [
    { phase: 'purchase', date: '2026-04-20', status: 'completed' },
    { phase: 'movein', date: '2026-05-04', status: 'in_progress' },
    { phase: 'infra', date: '2026-05-25', status: 'estimated' },
  ];

  it('returns one cell per column', () => {
    const cols = buildWeekColumns(-3, 14);
    const cells = resolveClusterCells(phases, cols, 'week');
    expect(cells).toHaveLength(14);
  });

  it('marks the cell of completion week with that phase', () => {
    const cols = ['2026-W17', '2026-W18', '2026-W19', '2026-W20'];
    const cells = resolveClusterCells(phases, cols, 'week');
    // W17 = purchase completion
    expect(cells[0].phases).toContain('purchase');
    // W18 = span of movein (W17 < W18 <= W19)
    expect(cells[1].phases).toContain('movein');
    // W19 = movein completion
    expect(cells[2].phases).toContain('movein');
    // W20 = span of infra (W19 < W20 <= W22)
    expect(cells[3].phases).toContain('infra');
  });

  it('detects current in-progress phase', () => {
    const cols = ['2026-W19'];
    const cells = resolveClusterCells(phases, cols, 'week', new Date('2026-05-06T00:00:00Z'));
    expect(cells[0].isCurrentPhase).toBe(true);
  });

  it('does not mark a fully completed final phase as current', () => {
    const completedPhases: ClusterPhase[] = [
      { phase: 'purchase', date: '2026-04-20' },
      { phase: 'movein', date: '2026-05-04' },
    ];

    const cells = resolveClusterCells(
      completedPhases,
      ['2026-W19'],
      'week',
      new Date('2026-05-12T00:00:00Z'),
    );

    expect(cells[0]).toEqual({
      phases: ['movein'],
      status: 'completed',
      isCurrentPhase: false,
    });
  });

  it('keeps overdue blocked final phases marked as current', () => {
    const blockedPhases: ClusterPhase[] = [
      { phase: 'purchase', date: '2026-04-20', status: 'completed' },
      { phase: 'movein', date: '2026-05-05', status: 'blocked' },
    ];

    const cells = resolveClusterCells(
      blockedPhases,
      ['2026-W19'],
      'week',
      new Date('2026-05-06T00:00:00Z'),
    );

    expect(cells[0]).toEqual({
      phases: ['movein'],
      status: 'blocked',
      isCurrentPhase: true,
    });
  });

  it('returns empty cell for columns before any phase', () => {
    const cols = ['2026-W10'];
    const cells = resolveClusterCells(phases, cols, 'week');
    expect(cells[0].phases).toHaveLength(0);
  });

  it('handles same-week multi-phase (B1 gradient scenario)', () => {
    const samePhasesWeek: ClusterPhase[] = [
      { phase: 'purchase', date: '2026-04-13', status: 'completed' },
      { phase: 'movein', date: '2026-04-14', status: 'completed' },
      { phase: 'infra', date: '2026-05-04', status: 'in_progress' },
    ];
    const cols = ['2026-W16'];
    const cells = resolveClusterCells(samePhasesWeek, cols, 'week');
    expect(cells[0].phases).toEqual(['purchase', 'movein']);
  });

  it('keeps current phase marker for multi-phase cells', () => {
    const samePhasesWeek: ClusterPhase[] = [
      { phase: 'purchase', date: '2026-04-13' },
      { phase: 'movein', date: '2026-04-14' },
    ];

    const cells = resolveClusterCells(
      samePhasesWeek,
      ['2026-W16'],
      'week',
      new Date('2026-04-13T00:00:00Z'),
    );

    expect(cells[0].isCurrentPhase).toBe(true);
    expect(cells[0].status).toBe('in_progress');
  });

  it('normalizes same-day cells by PHASE_ORDER regardless of input order', () => {
    const sameDayPhases: ClusterPhase[] = [
      { phase: 'movein', date: '2026-05-05' },
      { phase: 'purchase', date: '2026-05-05' },
      { phase: 'infra', date: '2026-05-19' },
    ];

    const cells = resolveClusterCells(
      sameDayPhases,
      ['2026-W19'],
      'week',
      new Date('2026-05-06T00:00:00Z'),
    );

    expect(cells[0]).toEqual({
      phases: ['purchase', 'movein'],
      status: 'in_progress',
      isCurrentPhase: true,
    });
  });

  it('keeps same-day highlighting stable when input order changes in month mode', () => {
    const ordered: ClusterPhase[] = [
      { phase: 'purchase', date: '2026-05-05' },
      { phase: 'movein', date: '2026-05-05' },
      { phase: 'infra', date: '2026-05-19' },
    ];
    const reversed = [...ordered].reverse();

    expect(
      resolveClusterCells(ordered, ['2026-05'], 'month', new Date('2026-05-06T00:00:00Z')),
    ).toEqual(
      resolveClusterCells(reversed, ['2026-05'], 'month', new Date('2026-05-06T00:00:00Z')),
    );
  });

  it('maps weeks to months in month mode', () => {
    // W17 is April 2026; W19 is May 2026.
    // In May column only movein (W19) should appear;
    // purchase (W17=April) lands in '2026-04', not '2026-05'.
    const cols = ['2026-04', '2026-05'];
    const cells = resolveClusterCells(phases, cols, 'month');
    expect(cells[0].phases).toContain('purchase');   // W17 → April
    expect(cells[0].phases).not.toContain('movein');
    expect(cells[1].phases).toContain('movein'); // W19 → May
    expect(cells[1].phases).not.toContain('purchase');
  });

  it('uses blocked status for blocked phases', () => {
    const blockedPhases: ClusterPhase[] = [
      { phase: 'purchase', date: '2026-04-20', status: 'completed' },
      { phase: 'movein', date: '2026-05-11', status: 'blocked' },
    ];
    const cols = ['2026-W18', '2026-W19', '2026-W20'];
    const cells = resolveClusterCells(blockedPhases, cols, 'week', new Date('2026-05-06T00:00:00Z'));
    expect(cells[0].status).toBe('blocked');
    expect(cells[1].status).toBe('blocked');
    expect(cells[2].status).toBe('blocked');
  });

  it('keeps blocked status when month cells also include later estimated phases', () => {
    const blockedPhases: ClusterPhase[] = [
      { phase: 'purchase', date: '2026-04-20', status: 'completed' },
      { phase: 'movein', date: '2026-05-05', status: 'blocked' },
      { phase: 'infra', date: '2026-05-25', status: 'estimated' },
    ];

    const cells = resolveClusterCells(
      blockedPhases,
      ['2026-05'],
      'month',
      new Date('2026-05-06T00:00:00Z'),
    );

    expect(cells[0].phases).toEqual(['movein', 'infra']);
    expect(cells[0].status).toBe('blocked');
  });
});
