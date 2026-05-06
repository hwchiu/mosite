interface Props {
  mode: 'week' | 'month';
  onModeChange: (m: 'week' | 'month') => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  typeFilter: 'all' | 'k8s' | 'vm';
  onTypeFilterChange: (t: 'all' | 'k8s' | 'vm') => void;
  nameFilter: string;
  onNameFilterChange: (n: string) => void;
}

export default function TimelineToolbar({
  mode, onModeChange, onPrev, onNext, onToday,
  typeFilter, onTypeFilterChange, nameFilter, onNameFilterChange,
}: Props) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-200 flex-shrink-0 flex-wrap">
      <span className="text-indigo-600 font-bold text-[13px]">📅 Timeline</span>

      {/* Type filter */}
      <div className="flex bg-gray-100 rounded overflow-hidden">
        {(['all', 'k8s', 'vm'] as const).map(t => (
          <button
            key={t}
            onClick={() => onTypeFilterChange(t)}
            className={`px-2.5 py-1 text-[11px] border-none cursor-pointer ${
              typeFilter === t ? 'bg-indigo-600 text-white font-bold' : 'bg-transparent text-gray-600'
            }`}
          >
            {t === 'all' ? 'All' : t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Name filter */}
      <input
        type="text"
        value={nameFilter}
        onChange={e => onNameFilterChange(e.target.value)}
        placeholder="Filter name…"
        className="px-2 py-1 text-[11px] border border-gray-300 rounded outline-none focus:border-indigo-400 w-32"
      />

      <div className="flex-1" />
      <button onClick={onPrev}
        className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded text-[11px] hover:bg-gray-200">
        {mode === 'week' ? '◀ 上3週' : '◀'}
      </button>
      <button onClick={onToday}
        className="bg-indigo-50 border border-indigo-600 text-indigo-600 px-2.5 py-1 rounded text-[11px] hover:bg-indigo-100">
        {mode === 'week' ? '回今天' : '今年'}
      </button>
      <button onClick={onNext}
        className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded text-[11px] hover:bg-gray-200">
        {mode === 'week' ? '下3週 ▶' : '▶'}
      </button>
      <div className="w-3" />
      <div className="flex bg-gray-100 rounded overflow-hidden">
        {(['week', 'month'] as const).map(m => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={`px-3 py-1 text-[11px] border-none cursor-pointer ${
              mode === m ? 'bg-indigo-600 text-white font-bold' : 'bg-transparent text-gray-600'
            }`}
          >
            {m === 'week' ? '週' : '月'}
          </button>
        ))}
      </div>
    </div>
  );
}
