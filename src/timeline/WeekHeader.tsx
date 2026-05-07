import type { CSSProperties } from 'react';
import { formatBusinessWeekLabel } from './utils';

interface Props {
  columns: string[];   // e.g. ["2026-W16", "2026-W17", ...]
  nowColumn: string;
}

const NOW_BORDER_STYLE: CSSProperties = { borderLeft: '2px dashed #a5b4fc' };

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
              isNow ? 'bg-indigo-50' : 'text-gray-700 font-semibold'
            }`}
            style={isNow ? NOW_BORDER_STYLE : undefined}
          >
            {isNow ? (
              <span className="inline-block bg-indigo-600 text-white rounded-full px-1.5 py-px text-[10px] font-black tracking-wide leading-tight">
                TODAY
              </span>
            ) : (
              formatBusinessWeekLabel(col)
            )}
          </div>
        );
      })}
    </div>
  );
}
