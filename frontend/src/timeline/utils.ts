import type { ClusterPhase, PhaseKey, PhaseStatus } from '../types';

export interface ResolvedPhaseCell {
  phases: PhaseKey[];
  status: PhaseStatus | 'empty';
  isCurrentPhase: boolean;
}

export function parseISOWeek(w: string): { year: number; week: number } {
  const [yearStr, weekStr] = w.split('-W');
  return { year: parseInt(yearStr), week: parseInt(weekStr) };
}

export function compareWeeks(a: string, b: string): -1 | 0 | 1 {
  const pa = parseISOWeek(a);
  const pb = parseISOWeek(b);
  if (pa.year !== pb.year) return pa.year < pb.year ? -1 : 1;
  if (pa.week !== pb.week) return pa.week < pb.week ? -1 : 1;
  return 0;
}

// Compare two column strings (week "YYYY-Www" or month "YYYY-MM").
// Month strings are lexicographically ordered (YYYY-MM), so string comparison works.
export function compareColumns(a: string, b: string): -1 | 0 | 1 {
  if (a.includes('-W')) return compareWeeks(a, b);   // week mode
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function weekToMonth(w: string): string {
  // Find Thursday of ISO week (defines the year/month), then return its YYYY-MM
  const { year, week } = parseISOWeek(w);
  // Jan 4 is always in week 1
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7; // Mon=1..Sun=7
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - (dayOfWeek - 1) + (week - 1) * 7);
  // Use Thursday (Monday + 3 days) to determine the month
  const thursday = new Date(monday);
  thursday.setDate(monday.getDate() + 3);
  const m = String(thursday.getMonth() + 1).padStart(2, '0');
  return `${thursday.getFullYear()}-${m}`;
}

export function currentISOWeek(): string {
  const now = new Date();
  // ISO week: Thursday determines the year
  const thu = new Date(now);
  thu.setDate(now.getDate() - ((now.getDay() + 6) % 7) + 3);
  const year = thu.getFullYear();
  const jan4 = new Date(year, 0, 4);
  const week = Math.round(((thu.getTime() - jan4.getTime()) / 86400000 + ((jan4.getDay() + 6) % 7) - 3) / 7) + 1;
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function addWeeks(isoWeek: string, delta: number): string {
  const { year, week } = parseISOWeek(isoWeek);
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - (dayOfWeek - 1) + (week - 1) * 7);
  monday.setDate(monday.getDate() + delta * 7);
  // Compute ISO week of the resulting date
  const thu = new Date(monday);
  thu.setDate(monday.getDate() + 3);
  const newYear = thu.getFullYear();
  const newJan4 = new Date(newYear, 0, 4);
  const newWeek = Math.round(((thu.getTime() - newJan4.getTime()) / 86400000 + ((newJan4.getDay() + 6) % 7) - 3) / 7) + 1;
  return `${newYear}-W${String(newWeek).padStart(2, '0')}`;
}

export function buildWeekColumns(offsetStart: number, count: number): string[] {
  const base = currentISOWeek();
  const cols: string[] = [];
  for (let i = 0; i < count; i++) {
    cols.push(addWeeks(base, offsetStart + i));
  }
  return cols;
}

export function buildMonthColumns(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) =>
    `${year}-${String(i + 1).padStart(2, '0')}`
  );
}

export function resolveClusterCells(
  phases: ClusterPhase[],
  columns: string[],
  mode: 'week' | 'month'
): ResolvedPhaseCell[] {
  if (!phases.length) {
    return columns.map(() => ({ phases: [], status: 'empty', isCurrentPhase: false }));
  }

  // Normalize completion keys to the current mode
  const normalize = (w: string) => mode === 'month' ? weekToMonth(w) : w;

  // Find current in-progress phase key
  const currentPhase = phases.find(p => p.status === 'in_progress' || p.status === 'blocked');

  return columns.map(col => {
    const matchingPhases: PhaseKey[] = [];
    let cellStatus: PhaseStatus | 'empty' = 'empty';
    let isCurrentPhase = false;

    for (let i = 0; i < phases.length; i++) {
      const p = phases[i];
      const pCol = normalize(p.completionWeek);

      let covered = false;
      if (i === 0) {
        covered = col === pCol;
      } else {
        const prevCol = normalize(phases[i - 1].completionWeek);
        // col > prevCol AND col <= pCol
        // Special case: if prevCol === pCol (same-week completion), also include this column
        covered = (compareColumns(prevCol, col) < 0 && compareColumns(col, pCol) <= 0) ||
                  (col === pCol && compareColumns(prevCol, pCol) === 0);
      }

      if (covered) {
        matchingPhases.push(p.phase);
        cellStatus = p.status;
        if (currentPhase && p.phase === currentPhase.phase) {
          isCurrentPhase = true;
        }
      }
    }

    return {
      phases: matchingPhases,
      status: matchingPhases.length ? cellStatus : 'empty',
      isCurrentPhase,
    };
  });
}
