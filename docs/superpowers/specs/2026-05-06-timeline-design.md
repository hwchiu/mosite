# Timeline Page Design

## Overview

The Timeline page gives server administrators a unified Gantt-style view of every cluster's lifecycle phases across all factory sites. It is the primary tool for understanding deployment progress, identifying blockers, and planning upcoming work.

---

## Data Model

### ClusterPhase

Each cluster has an ordered sequence of phases. Each phase records only the **completion week** (ISO week string, e.g. `"2025-W23"`), not an exact date. Future/planned phases store an estimated completion week marked as `estimated: true`.

```ts
type PhaseKey =
  | 'purchased'       // 採購完畢
  | 'waiting_infra'   // 等待 Infra Team
  | 'waiting_build'   // 等待 Cluster Buildup
  | 'waiting_platform'// 等待 Platform Team
  | 'active'          // Active
  | 'retired'         // Retired (terminal)

type PhaseStatus = 'completed' | 'in_progress' | 'blocked' | 'estimated'

interface ClusterPhase {
  phase: PhaseKey
  completionWeek: string   // ISO week, e.g. "2025-W23"
  status: PhaseStatus
  note?: string            // e.g. block reason
}

interface Cluster {
  id: string
  name: string
  factoryId: string
  serviceType: 'k8s' | 'vm'
  serverCount: number
  phases: ClusterPhase[]   // ordered, earliest first
}
```

**Key constraint:** `completionWeek` is the single source of truth. No start dates are stored. The start week of phase N is inferred as the completion week of phase N−1.

---

## Timeline Rendering Rules

### Cell assignment

For a given time column (week or month), a cluster row renders a colored cell if any phase's span covers that column.

- Phase span = from previous phase's completion week (exclusive) → this phase's completion week (inclusive)
- First phase span: the first phase occupies exactly its own completion week as a single-column span (no prior phase to extend from)

### Single-phase cell
Solid fill using the phase color:

| Phase | Color |
|---|---|
| purchased | `#6c7086` (grey) |
| waiting_infra | `#fab387` (peach) |
| waiting_build | `#89b4fa` (blue) |
| waiting_platform | `#cba6f7` (purple) |
| active | `#a6e3a1` (green) |
| retired | `#45475a` (dark grey) |

### Multi-phase cell (B1 — linear gradient)
When 2 or more phases complete in the same week/month column, use a **left-to-right linear gradient** dividing the cell into equal-width color bands in phase order:

- 2 phases → 50% / 50%
- 3 phases → 33% / 33% / 33%
- 4 phases → 25% each

### Current phase highlight
The cell containing the cluster's current in-progress phase gets a `2px solid #cba6f7` outline.

### Blocked phase
Blocked phases use `background: #f38ba840` with `border: 2px dashed #f38ba8`. Blocked cells extend across future weeks until unblocked.

### Estimated future phases
Dashed border (`border: 1px dashed <phase-color>`), transparent or faded fill.

---

## Week ↔ Month Conversion

When the user switches to **month view**, each cluster's phases are re-mapped: a phase's completion week becomes the month that week falls in. Multi-phase-per-month cells follow the same B1 gradient rule.

---

## Navigation

### Week view
- Default window: W−3 to W+10 (14 columns total)
- "◀ 上3週" / "下3週 ▶" shift the window by 3 weeks
- "回今天" anchors the window back to W−3 / W+10

### Month view
- Shows 12 columns = Jan–Dec of the **calendar year containing today** (default)
- "◀" / "▶" navigate year by year (e.g. 2025 → 2026)

---

## Multi-Factory Layout

### Structure

```
┌──────────┬─────────────────────────────────────┐
│ Sidebar  │ Toolbar (week/month toggle, nav)     │
│ (filter) ├─────────────────────────────────────┤
│          │ Week header (sticky)                 │
│ Factory  ├─────────────────────────────────────┤
│ checkboxes│ Factory group header (sticky, click)│
│          │   Cluster row                        │
│ [全部]   │   Cluster row                        │
│ [⚠異常] │ Factory group header                 │
│          │   Cluster row                        │
│ ☑ F1    └─────────────────────────────────────┘
│ ☑ F2     Legend bar (sticky bottom)
│ ☑ F3
│ ☐ F4 …
└──────────
```

### Factory group header
Each factory occupies a sticky sub-header row showing:
- Factory name + color dot
- Cluster count badge
- Phase summary (e.g. `🟢 Active×2  🔨 Building×1`)
- `⚠ BLOCKED` warning badge if any cluster is blocked
- Click to collapse/expand all clusters in that factory

### Default state
- All factories visible and **expanded**
- Any factory with a BLOCKED cluster is auto-expanded on page load

### Left sidebar
- **全部廠區** button — show all
- **⚠ 只看異常** button — hide factories with no issues
- Per-factory checkboxes (F1–F25) — show/hide individual factories

---

## UI Components

### `<TimelinePage>`
Top-level page. Owns view mode state (`week|month`), current window offset, and factory filter state.

### `<FactorySidebar>`
Checkbox list of all factories. Emits filter changes to parent.

### `<TimelineToolbar>`
View toggle, navigation buttons, "回今天" button.

### `<WeekHeader>` / `<MonthHeader>`
Sticky column labels. Highlights current week/month.

### `<FactoryGroup>`
Collapsible section for one factory. Contains factory header + list of `<ClusterRow>`.

### `<ClusterRow>`
Renders one cluster across all time columns. Each cell computed from `ClusterPhase[]` + current window. Produces a `ResolvedPhaseCell[]` array passed to `<PhaseCell>`.

### `<PhaseCell>`
Single time-column cell. Accepts `ResolvedPhaseCell`:
```ts
interface ResolvedPhaseCell {
  phases: PhaseKey[]       // 1 = solid, 2+ = B1 gradient
  status: PhaseStatus      // drives blocked/estimated style
  isCurrentPhase: boolean  // drives purple outline
}
```

---

## Mock Data Requirements

The existing `seed.ts` needs extension:
- Each cluster must have a `phases: ClusterPhase[]` array with realistic completion weeks
- At least one cluster should have multi-phase-same-week scenario (to validate B1 rendering)
- At least one cluster should be `blocked`
- At least one cluster should have future `estimated` phases (to validate dashed rendering)
- Factories F1–F5 should each have 2–4 clusters with overlapping timelines

---

## Out of Scope (v1)

- Drag-to-edit phases on the timeline
- Per-cluster drill-down page from timeline (may link to existing cluster detail)
- Export to PDF/PNG
- Real-time collaborative editing
