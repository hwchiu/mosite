# Capacity Page Design

**Date:** 2026-05-11
**Status:** Approved

## Problem

The app has no view for tracking server utilization and capacity planning across factory sites. Users need to see per-site, per-type (VM/K8S) utilization as gauge charts, backed by an editable data table.

## Approach

A new dedicated `/capacity` route with a sidebar nav link. Data lives in `localStorage` under `mosite_capacity_v1`. Gauge charts are built with recharts (already installed) as half-donut PieCharts with a custom SVG needle. An editable table below the gauges is the source of truth — edits update gauges live.

---

## Architecture

### Route & Navigation

- New route: `/capacity` → `src/pages/Capacity.tsx`
- New sidebar nav item added to `src/components/Layout.tsx`: label "Capacity", icon `BarChart2` from lucide-react

### Data Persistence

- Storage key: `mosite_capacity_v1` in `localStorage`
- On first load: seed data is written to localStorage
- On subsequent loads: data is read from localStorage
- No server calls, no React Query — plain `useState` + `useEffect`

### Data Model

```ts
interface CapacityRow {
  site: string;            // e.g. "F12" — identity key, read-only in table
  type: 'VM' | 'K8S';     // identity key, read-only in table
  serverTotal: number;
  pod_vmAvailability: number;
  pod_vmProvisioned: number;
  utilizationPct: number;  // drives the gauge needle
  serverUtilPct: number;
  capacityPlanPct: number;
  serverRequire: number;
}
```

### Seed Data (initial 8 rows)

| Site | Type | Server Total | Pod Availability | Pod Provisioned | Utilization% | Server Util% | Capacity Plan% | Server Require |
|------|------|-------------|-----------------|----------------|-------------|-------------|---------------|---------------|
| F12  | VM   | 800         | 11200           | 6500           | 58.04       | 58.04       | 80            | -219          |
| F18  | VM   | 1200        | 16800           | 15500          | 92.26       | 92.26       | 80            | 184           |
| F21  | VM   | 500         | 7000            | 1000           | 14.28       | 14.29       | 80            | -410          |
| F23  | VM   | 500         | 7000            | 5500           | 78.57       | 78.57       | 80            | -8            |
| F12  | K8S  | 800         | 11200           | 7000           | 62.50       | 62.50       | 80            | -175          |
| F18  | K8S  | 1200        | 16800           | 15800          | 94.05       | 94.05       | 80            | 211           |
| F21  | K8S  | 500         | 7000            | 5000           | 71.43       | 71.43       | 80            | -53           |
| F23  | K8S  | 500         | 7000            | 4000           | 57.14       | 57.14       | 80            | -142          |

---

## Components

### `Capacity.tsx` (page root)

- Holds all state (`CapacityRow[]`)
- Renders: type-filter toggle → gauge grid → editable table
- Type filter: "K8S & VM" / "K8S" / "VM" — same pill-style toggle as Dashboard
- Filter applies only to the gauge grid; the table always shows all 8 rows

### `GaugeChart` (inline component within Capacity.tsx)

Built with recharts `PieChart`:

- **Background arcs** (5 stacked `Pie` slices, each 20% of the 180° half-circle):
  - 0–20%: Green (`#22c55e`)
  - 20–40%: Yellow-Green (`#84cc16`)
  - 40–60%: Yellow (`#eab308`)
  - 60–80%: Orange (`#f97316`)
  - 80–100%: Red (`#ef4444`)
- **Needle**: custom SVG `<line>` overlaid via recharts `customized` prop or absolute positioning, rotated from -90° (0%) to +90° (100%) based on `utilizationPct`
- **Labels**: site + type as title above chart, utilization% value centered below the arc
- **Scale ticks**: 0%, 20%, 40%, 60%, 80%, 100% marked around the arc

### Editable Table

- Plain `<table>` with Tailwind styling matching the existing Clusters table aesthetic
- Columns: Site (read-only), Type (read-only), Server Total, Pod Availability, Pod Provisioned, Utilization%, Server Util%, Capacity Plan%, Server Require
- Each editable cell uses an `<input type="number">` (or `type="text"` for %)
- `onChange` updates the corresponding row in state → localStorage → gauges re-render immediately
- Invalid/empty values treated as `0`

---

## Error Handling

- Malformed localStorage data (e.g. corrupted JSON): catch parse errors, fall back to seed data
- Invalid table input: `parseFloat` with `|| 0` fallback — no crash, gauge stays at 0%
- `utilizationPct` clamped to `[0, 100]` before computing needle angle

---

## Testing

No unit tests for this page — it contains no business logic worth isolating. Consistent with `Dashboard.tsx` which also has no tests. Manual verification: edit a table cell → confirm gauge needle moves.

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Capacity.tsx` | New file |
| `src/components/Layout.tsx` | Add "Capacity" nav item |
| `src/App.tsx` | Add `/capacity` route |
