interface Props {
  mode: 'week' | 'month';
  onModeChange: (m: 'week' | 'month') => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export default function TimelineToolbar({ mode, onModeChange, onPrev, onNext, onToday }: Props) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[#1e1e2e] border-b border-[#313244] flex-shrink-0">
      <span className="text-[#cba6f7] font-bold text-[13px]">📅 Timeline</span>
      <div className="flex-1" />
      <button onClick={onPrev}
        className="bg-[#313244] text-[#cdd6f4] px-2.5 py-1 rounded text-[11px] hover:bg-[#45475a]">
        {mode === 'week' ? '◀ 上3週' : '◀'}
      </button>
      <button onClick={onToday}
        className="bg-[#cba6f720] border border-[#cba6f7] text-[#cba6f7] px-2.5 py-1 rounded text-[11px]">
        {mode === 'week' ? '回今天' : '今年'}
      </button>
      <button onClick={onNext}
        className="bg-[#313244] text-[#cdd6f4] px-2.5 py-1 rounded text-[11px] hover:bg-[#45475a]">
        {mode === 'week' ? '下3週 ▶' : '▶'}
      </button>
      <div className="w-3" />
      <div className="flex bg-[#313244] rounded overflow-hidden">
        {(['week', 'month'] as const).map(m => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={`px-3 py-1 text-[11px] border-none cursor-pointer ${
              mode === m ? 'bg-[#cba6f7] text-[#1e1e2e] font-bold' : 'bg-transparent text-[#6c7086]'
            }`}
          >
            {m === 'week' ? '週' : '月'}
          </button>
        ))}
      </div>
    </div>
  );
}
