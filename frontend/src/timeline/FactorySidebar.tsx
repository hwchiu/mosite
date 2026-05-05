import type { Factory } from '../types';

interface Props {
  factories: Factory[];
  visibleIds: Set<string>;
  onToggle: (id: string) => void;
  onShowAll: () => void;
  onShowProblems: () => void;
}

const FACTORY_COLORS = ['#f38ba8','#fab387','#f9e2af','#a6e3a1','#89dceb','#89b4fa','#cba6f7'];

export default function FactorySidebar({ factories, visibleIds, onToggle, onShowAll, onShowProblems }: Props) {
  return (
    <div className="w-36 flex-shrink-0 bg-white border-r border-gray-200 p-2 flex flex-col gap-2 overflow-y-auto">
      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">廠區篩選</div>
      <button onClick={onShowAll}
        className="w-full text-left bg-indigo-50 border border-indigo-600 text-indigo-600 px-2 py-1 rounded text-[10px] hover:bg-indigo-100">
        全部廠區
      </button>
      <button onClick={onShowProblems}
        className="w-full text-left bg-gray-100 text-gray-700 px-2 py-1 rounded text-[10px] hover:bg-gray-200">
        ⚠ 只看異常
      </button>
      <div className="border-t border-gray-200 my-1" />
      {factories.map((f, i) => {
        const color = FACTORY_COLORS[i % FACTORY_COLORS.length];
        return (
          <label key={f.id} className="flex items-center gap-1.5 px-1.5 py-1 rounded cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={visibleIds.has(f.id)}
              onChange={() => onToggle(f.id)}
              className="accent-indigo-600 w-3 h-3"
            />
            <span style={{ background: color }} className="w-2 h-2 rounded-full flex-shrink-0" />
            <span className="text-[11px] text-gray-700">{f.name}</span>
          </label>
        );
      })}
    </div>
  );
}
