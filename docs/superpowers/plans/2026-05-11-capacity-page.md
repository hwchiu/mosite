# Capacity Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/capacity` page with per-site/type gauge charts driven by an editable data table persisted in localStorage.

**Architecture:** A single `src/pages/Capacity.tsx` holds everything — types, seed data, localStorage helpers, an inline `GaugeChart` component, and the page root. Routing and nav are wired in `App.tsx` and `Layout.tsx`. No React Query; data lives entirely in `useState` + `useEffect`.

**Tech Stack:** React 19, recharts (PieChart + Cell), lucide-react (BarChart2 icon), Tailwind CSS, localStorage

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/pages/Capacity.tsx` | Create | All capacity feature code: types, seed, GaugeChart, table, page |
| `src/components/Layout.tsx` | Modify | Add "Capacity" nav item with BarChart2 icon |
| `src/App.tsx` | Modify | Add `/capacity` route |

---

## Task 1: Data layer, routing, and nav scaffold

Wire up the route and nav, create the page file with types, seed data, and localStorage helpers. Render a placeholder heading so the route is testable immediately.

**Files:**
- Create: `src/pages/Capacity.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/Layout.tsx`

- [ ] **Step 1: Create `src/pages/Capacity.tsx` with types, seed data, localStorage helpers, and placeholder render**

```tsx
import { useState, useEffect } from 'react';

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

export default function Capacity() {
  const [rows, setRows] = useState<CapacityRow[]>(loadData);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(rows));
  }, [rows]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Capacity</h1>
      <p className="text-gray-500">Loaded {rows.length} rows.</p>
    </div>
  );
}
```

- [ ] **Step 2: Add the `/capacity` route in `src/App.tsx`**

Add the import and route. Final file:

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Clusters from './pages/Clusters';
import Timeline from './pages/Timeline';
import Capacity from './pages/Capacity';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clusters" element={<Clusters />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/capacity" element={<Capacity />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 3: Add the "Capacity" nav item in `src/components/Layout.tsx`**

Add `BarChart2` to the lucide import and insert the nav entry:

```tsx
// Change the import line from:
import { LayoutDashboard, Network, CalendarDays, Menu, X } from 'lucide-react';
// To:
import { LayoutDashboard, Network, CalendarDays, BarChart2, Menu, X } from 'lucide-react';

// Change the navItems array from:
const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/clusters', label: 'Clusters', icon: Network, end: false },
  { to: '/timeline', label: 'Timeline', icon: CalendarDays, end: false },
];
// To:
const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/clusters', label: 'Clusters', icon: Network, end: false },
  { to: '/timeline', label: 'Timeline', icon: CalendarDays, end: false },
  { to: '/capacity', label: 'Capacity', icon: BarChart2, end: false },
];
```

- [ ] **Step 4: Run the build to verify no TypeScript errors**

```bash
cd /home/ubuntu/mosite && npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
cd /home/ubuntu/mosite && git add src/pages/Capacity.tsx src/App.tsx src/components/Layout.tsx
git commit -m "feat: scaffold /capacity route with data layer and nav link

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 2: GaugeChart component

Add the `GaugeChart` inline component to `Capacity.tsx`. It uses a recharts `PieChart` half-donut for the color zone background and an absolute-positioned SVG for the needle and tick labels.

**Gauge geometry constants:**
- Chart size: 220 × 140 px
- Arc center: cx=110, cy=120
- Inner radius: 65, outer radius: 95
- Needle angle formula: `needleAngle = -90 + (pct / 100) * 180`
  - 0% → −90° (points left), 50% → 0° (points up), 100% → +90° (points right)
- Tick label radius: 107 (just outside outer radius=95)
- Tick math angle for percentage p: `(180 − p × 1.8) × π / 180`

**Files:**
- Modify: `src/pages/Capacity.tsx`

- [ ] **Step 1: Add recharts import and gauge constants at the top of `src/pages/Capacity.tsx`**

Insert after the existing `import { useState, useEffect } from 'react';` line:

```tsx
import { PieChart, Pie, Cell } from 'recharts';
```

Insert after the `loadData` function (before `export default function Capacity`):

```tsx
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

function GaugeChart({ row }: { row: CapacityRow }) {
  const pct = Math.min(100, Math.max(0, row.utilizationPct));
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
```

- [ ] **Step 2: Run the build to verify no TypeScript errors**

```bash
cd /home/ubuntu/mosite && npm run build
```

Expected: build succeeds. The `GaugeChart` function is defined but not yet used — TypeScript will not error on an unused function in a module.

- [ ] **Step 3: Commit**

```bash
cd /home/ubuntu/mosite && git add src/pages/Capacity.tsx
git commit -m "feat: add GaugeChart component with recharts half-donut and SVG needle

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 3: Page body — type filter, gauge grid, and editable table

Replace the placeholder render in `Capacity` with the full page: toggle, gauge grid (filtered), and editable table (always all 8 rows).

**Files:**
- Modify: `src/pages/Capacity.tsx`

- [ ] **Step 1: Add the `TypeFilter` type and `TYPE_FILTERS` / `TABLE_COLS` constants**

Insert after the `GaugeChart` function (before `export default function Capacity`):

```tsx
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
```

- [ ] **Step 2: Replace the `Capacity` function body with the full implementation**

Replace the entire `export default function Capacity()` function with:

```tsx
export default function Capacity() {
  const [rows, setRows] = useState<CapacityRow[]>(loadData);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(rows));
  }, [rows]);

  const visibleRows = typeFilter === 'all' ? rows : rows.filter(r => r.type === typeFilter);

  function updateCell(idx: number, key: keyof CapacityRow, value: string) {
    const numVal = parseFloat(value);
    setRows(prev =>
      prev.map((row, i) =>
        i !== idx ? row : { ...row, [key]: isNaN(numVal) ? 0 : numVal }
      )
    );
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
                          type="number"
                          value={String(row[col.key])}
                          onChange={e => updateCell(idx, col.key, e.target.value)}
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
```

- [ ] **Step 3: Run build and lint**

```bash
cd /home/ubuntu/mosite && npm run build && npm run lint
```

Expected: build succeeds, lint passes with no errors.

- [ ] **Step 4: Smoke-test manually**

Start the dev server (`npm run dev` from `/home/ubuntu/mosite`) and open `http://localhost:5173/capacity`. Verify:
- Sidebar shows "Capacity" nav link
- 8 gauge charts appear in a 4-column grid
- Each gauge needle reflects the correct utilization %
- Toggle filters gauges (K8S only, VM only, both)
- Editing a number in the table immediately moves the corresponding needle
- Refreshing the page restores the edited values (localStorage persisted)

- [ ] **Step 5: Commit**

```bash
cd /home/ubuntu/mosite && git add src/pages/Capacity.tsx
git commit -m "feat: implement capacity page with gauge charts, type filter, and editable table

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
