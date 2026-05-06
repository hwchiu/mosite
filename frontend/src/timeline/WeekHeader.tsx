import { formatBusinessWeekLabel } from './utils';

interface Props {
  columns: string[];   // e.g. ["2026-W16", "2026-W17", ...]
  nowColumn: string;
}

export default function WeekHeader({ columns, nowColumn }: Props) {
  return (
    <div
      className="grid gap-px bg-white sticky top-0 z-10 border-b border-gray-200"
      style={{ gridTemplateColumns: `180px repeat(${columns.length}, 1fr)` }}
    >
      <div className="px-2 py-1.5 text-[10px] font-bold text-gray-700">Cluster</div>
      {columns.map(col => {
        const isNow = col === nowColumn;
        return (
          <div
            key={col}
            className={`py-1.5 text-center text-[9px] border-l border-gray-100 ${
              isNow ? 'text-indigo-700 font-semibold bg-indigo-50' : 'text-gray-400'
            }`}
          >
            <div>{isNow ? 'NOW' : formatBusinessWeekLabel(col)}</div>
          </div>
        );
      })}
    </div>
  );
}
