import type { RescheduleNote } from '../types';

interface Props {
  notes: RescheduleNote[];
}

export default function RescheduleTooltip({ notes }: Props) {
  if (notes.length === 0) return null;

  return (
    <div className="relative group/tooltip inline-flex items-center">
      <span
        className="inline-flex items-center gap-0.5 text-[9px] text-indigo-500 cursor-default select-none"
        title=""
      >
        💬 <span className="font-medium">{notes.length}</span>
      </span>

      {/* Tooltip — appears on hover */}
      <div
        className="absolute left-full top-0 ml-2 z-50 hidden group-hover/tooltip:block"
        style={{ minWidth: '220px', maxWidth: '280px' }}
      >
        <div className="bg-slate-800 text-slate-100 rounded-lg shadow-xl p-3 text-[10px] leading-relaxed">
          <div className="text-slate-400 uppercase tracking-wide font-semibold text-[8px] mb-2">
            Reschedule History
          </div>
          {notes.map((n, idx) => {
            const isLatest = idx === notes.length - 1;
            return (
              <div
                key={n.id}
                className={`pl-2 mb-2 last:mb-0 ${isLatest ? 'border-l-2 border-violet-500' : 'border-l-2 border-slate-600 opacity-70'}`}
              >
                <div className={`text-[8px] mb-0.5 ${isLatest ? 'text-violet-400' : 'text-slate-400'}`}>
                  {n.date}{isLatest ? ' · latest' : ''}
                </div>
                <div>{n.note}</div>
              </div>
            );
          })}
          {/* Tooltip arrow */}
          <div
            className="absolute -left-1.5 top-3 w-3 h-3 bg-slate-800 rotate-45"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}
