const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface Props {
  columns: string[];   // e.g. ["2026-01", "2026-02", ...]
  nowColumn: string;   // e.g. "2026-05"
}

export default function MonthHeader({ columns, nowColumn }: Props) {
  return (
    <div
      className="grid gap-px bg-white sticky top-0 z-10 border-b border-gray-200"
      style={{ gridTemplateColumns: `180px repeat(${columns.length}, 1fr)` }}
    >
      <div className="px-2 py-1.5 text-[10px] font-bold text-gray-700">Cluster</div>
      {columns.map(col => {
        const isNow = col === nowColumn;
        const monthIndex = parseInt(col.split('-')[1]) - 1;
        return (
          <div
            key={col}
            className={`py-1.5 text-center text-[9px] border-l border-gray-100 ${
              isNow ? 'text-indigo-700 font-bold bg-indigo-50' : 'text-gray-700 font-semibold'
            }`}
          >
            {MONTH_NAMES[monthIndex]}
          </div>
        );
      })}
    </div>
  );
}
