interface Props {
  columns: string[];   // e.g. ["2026-W16", "2026-W17", ...]
  nowColumn: string;
}

export default function WeekHeader({ columns, nowColumn }: Props) {
  return (
    <div
      className="grid gap-px bg-[#1e1e2e] sticky top-0 z-10 border-b border-[#313244]"
      style={{ gridTemplateColumns: `180px repeat(${columns.length}, 1fr)` }}
    >
      <div className="px-2 py-1.5 text-[10px] font-bold text-[#6c7086]">Cluster</div>
      {columns.map(col => {
        const isNow = col === nowColumn;
        const [, weekPart] = col.split('-');
        return (
          <div
            key={col}
            className={`py-1.5 text-center text-[9px] border-l border-[#1e1e2e] ${
              isNow ? 'text-[#cba6f7] font-bold bg-[#cba6f710]' : 'text-[#6c7086]'
            }`}
          >
            <div>{isNow ? 'NOW' : weekPart}</div>
          </div>
        );
      })}
    </div>
  );
}
