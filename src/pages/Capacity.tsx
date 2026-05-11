import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell } from 'recharts';

const LS_KEY = 'mosite_capacity_v1';

interface CapacityRow {
  site: string;
  type: 'VM' | 'K8S';
  serverTotal: number;
  pod_vmAvailability: number;
  pod_vmProvisioned: number;
  utilizationPct: number;
  serverUtilPct: number;
  capacityPlanPct: number;
  serverRequire: number;
}

const SEED_DATA: CapacityRow[] = [
  { site: 'F12', type: 'VM',  serverTotal: 800,  pod_vmAvailability: 11200, pod_vmProvisioned: 6500,  utilizationPct: 58.04, serverUtilPct: 58.04, capacityPlanPct: 80, serverRequire: -219 },
  { site: 'F18', type: 'VM',  serverTotal: 1200, pod_vmAvailability: 16800, pod_vmProvisioned: 15500, utilizationPct: 92.26, serverUtilPct: 92.26, capacityPlanPct: 80, serverRequire: 184  },
  { site: 'F21', type: 'VM',  serverTotal: 500,  pod_vmAvailability: 7000,  pod_vmProvisioned: 1000,  utilizationPct: 14.28, serverUtilPct: 14.29, capacityPlanPct: 80, serverRequire: -410 },
  { site: 'F23', type: 'VM',  serverTotal: 500,  pod_vmAvailability: 7000,  pod_vmProvisioned: 5500,  utilizationPct: 78.57, serverUtilPct: 78.57, capacityPlanPct: 80, serverRequire: -8   },
  { site: 'F12', type: 'K8S', serverTotal: 800,  pod_vmAvailability: 11200, pod_vmProvisioned: 7000,  utilizationPct: 62.50, serverUtilPct: 62.50, capacityPlanPct: 80, serverRequire: -175 },
  { site: 'F18', type: 'K8S', serverTotal: 1200, pod_vmAvailability: 16800, pod_vmProvisioned: 15800, utilizationPct: 94.05, serverUtilPct: 94.05, capacityPlanPct: 80, serverRequire: 211  },
  { site: 'F21', type: 'K8S', serverTotal: 500,  pod_vmAvailability: 7000,  pod_vmProvisioned: 5000,  utilizationPct: 71.43, serverUtilPct: 71.43, capacityPlanPct: 80, serverRequire: -53  },
  { site: 'F23', type: 'K8S', serverTotal: 500,  pod_vmAvailability: 7000,  pod_vmProvisioned: 4000,  utilizationPct: 57.14, serverUtilPct: 57.14, capacityPlanPct: 80, serverRequire: -142 },
];

function loadData(): CapacityRow[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as CapacityRow[];
  } catch { /* fall through */ }
  return SEED_DATA;
}

// ── Gauge constants ──────────────────────────────────────────────────────────
const GAUGE_W = 220;
const GAUGE_H = 140;
const GAUGE_CX = 110;
const GAUGE_CY = 120;
const GAUGE_INNER_R = 65;
const GAUGE_OUTER_R = 95;
const GAUGE_LABEL_R = 107;

const GAUGE_SEGMENTS = [
  { value: 20, fill: '#22c55e' }, // 0–20 %   green
  { value: 20, fill: '#84cc16' }, // 20–40 %  yellow-green
  { value: 20, fill: '#eab308' }, // 40–60 %  yellow
  { value: 20, fill: '#f97316' }, // 60–80 %  orange
  { value: 20, fill: '#ef4444' }, // 80–100 % red
];

const GAUGE_TICKS = [0, 20, 40, 60, 80, 100];

export function GaugeChart({ row }: { row: CapacityRow }) {
  const pct = Math.min(100, Math.max(0, row.serverUtilPct));
  const needleAngle = -90 + (pct / 100) * 180;

  return (
    <div className="flex flex-col items-center bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
      <div className="text-sm font-semibold text-gray-700 mb-1">
        {row.site} — {row.type}
      </div>
      <div style={{ position: 'relative', width: GAUGE_W, height: GAUGE_H }}>
        <PieChart width={GAUGE_W} height={GAUGE_H}>
          <Pie
            data={GAUGE_SEGMENTS}
            cx={GAUGE_CX}
            cy={GAUGE_CY}
            startAngle={180}
            endAngle={0}
            innerRadius={GAUGE_INNER_R}
            outerRadius={GAUGE_OUTER_R}
            dataKey="value"
            strokeWidth={0}
            isAnimationActive={false}
          >
            {GAUGE_SEGMENTS.map((s, i) => (
              <Cell key={i} fill={s.fill} />
            ))}
          </Pie>
        </PieChart>

        {/* Needle + tick labels overlay */}
        <svg
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          width={GAUGE_W}
          height={GAUGE_H}
        >
          {/* Tick labels around arc */}
          {GAUGE_TICKS.map(tick => {
            const mathAngle = ((180 - tick * 1.8) * Math.PI) / 180;
            const lx = GAUGE_CX + GAUGE_LABEL_R * Math.cos(mathAngle);
            const ly = GAUGE_CY - GAUGE_LABEL_R * Math.sin(mathAngle);
            const anchor = tick === 0 ? 'start' : tick === 100 ? 'end' : 'middle';
            return (
              <text key={tick} x={lx} y={ly} textAnchor={anchor} fontSize={8} fill="#9ca3af">
                {tick}%
              </text>
            );
          })}

          {/* Needle */}
          <g transform={`translate(${GAUGE_CX}, ${GAUGE_CY})`}>
            <line
              x1={0}
              y1={4}
              x2={0}
              y2={-(GAUGE_INNER_R - 10)}
              stroke="#1f2937"
              strokeWidth={2.5}
              strokeLinecap="round"
              transform={`rotate(${needleAngle})`}
            />
            <circle cx={0} cy={0} r={5} fill="#1f2937" />
          </g>
        </svg>
      </div>

      {/* Value label below arc */}
      <div className="text-xl font-bold text-gray-800 -mt-8">{pct.toFixed(1)}%</div>
      <div className="text-xs text-gray-500 mt-1">Server Utilization</div>
    </div>
  );
}

// ── Type filter & table columns ──────────────────────────────────────────────
type TypeFilter = 'VM' | 'K8S' | 'all';

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'K8S & VM' },
  { value: 'K8S', label: 'K8S' },
  { value: 'VM',  label: 'VM'  },
];

const TABLE_COLS: { key: keyof CapacityRow; label: string; readOnly?: boolean }[] = [
  { key: 'site',               label: 'Site',            readOnly: true },
  { key: 'type',               label: 'Type',            readOnly: true },
  { key: 'serverTotal',        label: 'Server Total'                    },
  { key: 'pod_vmAvailability', label: 'Pod M-VM Avail.'                },
  { key: 'pod_vmProvisioned',  label: 'Pod M-VM Prov.'                 },
  { key: 'utilizationPct',     label: 'Util %'                         },
  { key: 'serverUtilPct',      label: 'Server Util %'                  },
  { key: 'capacityPlanPct',    label: 'Capacity Plan %'                },
  { key: 'serverRequire',      label: 'Server Require'                 },
];

export default function Capacity() {
  const [rows, setRows] = useState<CapacityRow[]>(loadData);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(rows));
    } catch { /* ignore write errors */ }
  }, [rows]);

  const visibleRows = typeFilter === 'all' ? rows : rows.filter(r => r.type === typeFilter);

  function handleCellChange(idx: number, key: keyof CapacityRow, raw: string) {
    setDraftValues(prev => ({ ...prev, [`${idx}-${key}`]: raw }));
  }

  function handleCellBlur(idx: number, key: keyof CapacityRow) {
    const draftKey = `${idx}-${key}`;
    const raw = draftValues[draftKey];
    if (raw === undefined) return;
    const numVal = parseFloat(raw);
    setRows(prev =>
      prev.map((row, i) =>
        i !== idx ? row : { ...row, [key]: isNaN(numVal) ? 0 : numVal }
      )
    );
    setDraftValues(prev => {
      const next = { ...prev };
      delete next[draftKey];
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* Header + type toggle */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Capacity</h1>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 mt-2 w-fit">
          {TYPE_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTypeFilter(value)}
              aria-pressed={typeFilter === value}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                typeFilter === value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Gauge grid — filtered by type toggle */}
      <div className="grid grid-cols-4 gap-4">
        {visibleRows.map(row => (
          <GaugeChart key={`${row.site}-${row.type}`} row={row} />
        ))}
      </div>

      {/* Editable data table — always shows all 8 rows */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Capacity Data</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {TABLE_COLS.map(col => (
                  <th
                    key={col.key}
                    className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={`${row.site}-${row.type}`}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  {TABLE_COLS.map(col => (
                    <td key={col.key} className="px-3 py-2">
                      {col.readOnly ? (
                        <span className="font-medium text-gray-700">{String(row[col.key])}</span>
                      ) : (
                        <input
                          type="text"
                          value={draftValues[`${idx}-${col.key}`] ?? String(row[col.key])}
                          onChange={e => handleCellChange(idx, col.key, e.target.value)}
                          onBlur={() => handleCellBlur(idx, col.key)}
                          className="w-24 px-1.5 py-0.5 border border-gray-200 rounded text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
