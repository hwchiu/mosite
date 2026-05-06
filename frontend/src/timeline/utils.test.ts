import { describe, it, expect } from 'vitest';
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

  it('derives the current cluster status from milestone dates', () => {
    const phases: ClusterPhase[] = [
      { phase: 'PO', date: '2026-05-01' },
      { phase: 'server_movein', date: '2026-05-05' },
      { phase: 'infra', date: '2026-05-09' },
    ];

    expect(deriveClusterStatus(phases, new Date('2026-05-06T00:00:00Z'))).toBe('server_movein');
  });

  it('returns field errors when a milestone moves backward', () => {
    const phases: ClusterPhase[] = [
      { phase: 'PO', date: '2026-05-06' },
      { phase: 'server_movein', date: '2026-05-05' },
    ];

    expect(validatePhaseDates(phases)).toEqual({
      server_movein: 'Move-In date must be on or after PO date.',
    });
  });

  it('validates milestone order even when phases are unsorted', () => {
    const phases: ClusterPhase[] = [
      { phase: 'server_movein', date: '2026-05-05' },
      { phase: 'PO', date: '2026-05-06' },
    ];

    expect(validatePhaseDates(phases)).toEqual({
      server_movein: 'Move-In date must be on or after PO date.',
    });
  });
});


describe('resolveClusterCells', () => {
  const phases: ClusterPhase[] = [
    { phase: 'PO', date: '2026-04-20', status: 'completed' },
    { phase: 'server_movein', date: '2026-05-04', status: 'in_progress' },
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
    // W17 = PO completion
    expect(cells[0].phases).toContain('PO');
    // W18 = span of server_movein (W17 < W18 <= W19)
    expect(cells[1].phases).toContain('server_movein');
    // W19 = server_movein completion
    expect(cells[2].phases).toContain('server_movein');
    // W20 = span of infra (W19 < W20 <= W22)
    expect(cells[3].phases).toContain('infra');
  });

  it('detects current in-progress phase', () => {
    const cols = ['2026-W19'];
    const cells = resolveClusterCells(phases, cols, 'week', new Date('2026-05-06T00:00:00Z'));
    expect(cells[0].isCurrentPhase).toBe(true);
  });

  it('returns empty cell for columns before any phase', () => {
    const cols = ['2026-W10'];
    const cells = resolveClusterCells(phases, cols, 'week');
    expect(cells[0].phases).toHaveLength(0);
  });

  it('handles same-week multi-phase (B1 gradient scenario)', () => {
    const samePhasesWeek: ClusterPhase[] = [
      { phase: 'PO', date: '2026-04-13', status: 'completed' },
      { phase: 'server_movein', date: '2026-04-14', status: 'completed' },
      { phase: 'infra', date: '2026-05-04', status: 'in_progress' },
    ];
    const cols = ['2026-W16'];
    const cells = resolveClusterCells(samePhasesWeek, cols, 'week');
    expect(cells[0].phases).toEqual(['PO', 'server_movein']);
  });

  it('keeps current phase marker for multi-phase cells', () => {
    const samePhasesWeek: ClusterPhase[] = [
      { phase: 'PO', date: '2026-04-13' },
      { phase: 'server_movein', date: '2026-04-14' },
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

  it('maps weeks to months in month mode', () => {
    // W17 is April 2026; W19 is May 2026.
    // In May column only server_movein (W19) should appear;
    // PO (W17=April) lands in '2026-04', not '2026-05'.
    const cols = ['2026-04', '2026-05'];
    const cells = resolveClusterCells(phases, cols, 'month');
    expect(cells[0].phases).toContain('PO');   // W17 → April
    expect(cells[0].phases).not.toContain('server_movein');
    expect(cells[1].phases).toContain('server_movein'); // W19 → May
    expect(cells[1].phases).not.toContain('PO');
  });

  it('uses blocked status for blocked phases', () => {
    const blockedPhases: ClusterPhase[] = [
      { phase: 'PO', date: '2026-04-20', status: 'completed' },
      { phase: 'server_movein', date: '2026-05-11', status: 'blocked' },
    ];
    const cols = ['2026-W18', '2026-W19', '2026-W20'];
    const cells = resolveClusterCells(blockedPhases, cols, 'week', new Date('2026-05-06T00:00:00Z'));
    expect(cells[0].status).toBe('blocked');
    expect(cells[1].status).toBe('blocked');
    expect(cells[2].status).toBe('blocked');
  });

  it('keeps blocked status when month cells also include later estimated phases', () => {
    const blockedPhases: ClusterPhase[] = [
      { phase: 'PO', date: '2026-04-20', status: 'completed' },
      { phase: 'server_movein', date: '2026-05-05', status: 'blocked' },
      { phase: 'infra', date: '2026-05-25', status: 'estimated' },
    ];

    const cells = resolveClusterCells(
      blockedPhases,
      ['2026-05'],
      'month',
      new Date('2026-05-06T00:00:00Z'),
    );

    expect(cells[0].phases).toEqual(['server_movein', 'infra']);
    expect(cells[0].status).toBe('blocked');
  });
});
