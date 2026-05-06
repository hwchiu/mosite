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

export const PHASE_ORDER: PhaseKey[] = ['PO', 'server_movein', 'infra', 'cpld', 'sipd'];

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

export function dateToWeekKey(date: string): string {
  const source = new Date(`${date}T00:00:00Z`);
  const thursday = new Date(source);
  thursday.setUTCDate(source.getUTCDate() - ((source.getUTCDay() + 6) % 7) + 3);
  const year = thursday.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week =
    Math.round(
      ((thursday.getTime() - jan4.getTime()) / 86400000 + ((jan4.getUTCDay() + 6) % 7) - 3) / 7,
    ) + 1;
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function dateToMonthKey(date: string): string {
  return date.slice(0, 7);
}

export function formatBusinessWeekLabel(weekKey: string): string {
  const { year, week } = parseISOWeek(weekKey);
  return `W${String(year).slice(-1)}${String(week).padStart(2, '0')}`;
}

export function deriveClusterStatus(phases: ClusterPhase[], today = new Date()): PhaseKey {
  const todayKey = today.toISOString().slice(0, 10);
  const sorted = [...phases].sort((a, b) => a.date.localeCompare(b.date));
  const current = [...sorted].reverse().find((phase) => phase.date <= todayKey) ?? sorted[0];
  return current?.phase ?? 'PO';
}

function formatPhaseName(phase: PhaseKey): string {
  if (phase === 'PO') return 'PO';
  if (phase === 'server_movein') return 'Move-In';
  return phase.toUpperCase();
}

export function validatePhaseDates(phases: ClusterPhase[]): Partial<Record<PhaseKey, string>> {
  const errors: Partial<Record<PhaseKey, string>> = {};
  const sorted = [...phases].sort(
    (a, b) => PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase),
  );

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].date < sorted[i - 1].date) {
      errors[sorted[i].phase] =
        `${formatPhaseName(sorted[i].phase)} date must be on or after ` +
        `${formatPhaseName(sorted[i - 1].phase)} date.`;
    }
  }

  return errors;
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
  mode: 'week' | 'month',
  today = new Date(),
): ResolvedPhaseCell[] {
  if (!phases.length) {
    return columns.map(() => ({ phases: [], status: 'empty', isCurrentPhase: false }));
  }

  const normalize = (date: string) => (mode === 'month' ? dateToMonthKey(date) : dateToWeekKey(date));
  const sorted = [...phases].sort((a, b) => a.date.localeCompare(b.date));
  const currentPhase = deriveClusterStatus(sorted, today);

  return columns.map((col) => {
    const matchingPhases: PhaseKey[] = [];
    let cellStatus: PhaseStatus | 'empty' = 'empty';
    let isCurrentPhase = false;

    for (let i = 0; i < sorted.length; i++) {
      const phase = sorted[i];
      const phaseColumn = normalize(phase.date);
      const prevColumn = i === 0 ? null : normalize(sorted[i - 1].date);
      const covered =
        i === 0
          ? col === phaseColumn
          : (compareColumns(prevColumn!, col) < 0 && compareColumns(col, phaseColumn) <= 0) ||
            (col === phaseColumn && prevColumn === phaseColumn);

      if (covered) {
        matchingPhases.push(phase.phase);
        const nextStatus =
          phase.status === 'blocked'
            ? 'blocked'
            : phase.date > today.toISOString().slice(0, 10)
              ? 'estimated'
              : phase.phase === currentPhase
                ? 'in_progress'
                : 'completed';
        cellStatus =
          cellStatus === 'in_progress' && nextStatus === 'estimated' ? cellStatus : nextStatus;
        if (phase.phase === currentPhase) {
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
