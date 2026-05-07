# Timeline Visual Enhancements — Design Spec

**Date:** 2026-05-07  
**Status:** Approved

---

## Problem

The timeline grid currently treats all phase cells identically regardless of whether they are past, active, or future. Users cannot quickly identify:
- Where "today" is on the timeline
- Which clusters have a phase that is running late
- Which phases are already done and can be ignored

---

## Goals

1. Add a prominent **Today marker** so the current point in time is always immediately visible.
2. **Highlight delayed phases** with a red warning treatment so at-risk clusters stand out.
3. **De-emphasize completed phases** so the eye focuses on active and future work.

---

## Design Decisions

### 1 — Today Line

**Chosen style: dashed left-border + "TODAY" pill badge**

- The NOW column header cell replaces its current `NOW` text with a pill badge: `bg-indigo-500 text-white rounded-full px-1.5 text-[8px]` reading **"TODAY"**.
- Every cell in the NOW column (header, phase cells, and empty cells) gets `border-left: 2px dashed #a5b4fc` (Tailwind `indigo-300`).
- The dashed line runs the full height of the grid, acting as a vertical rule.
- The existing `isNowColumn` prop already flows from `Timeline.tsx` → `FactoryGroup` → `ClusterRow` → `PhaseCell`, so no new prop threading is needed.
- Applies to both week mode (`WeekHeader`) and month mode (`MonthHeader`).

### 2 — Delayed Phase Highlight

**Chosen style: solid red cells + full-row pink tint + ⚠ label prefix**

**Definition of "delayed":** A cell is delayed when:
- Its `status` resolves to `in_progress` (it is the current active phase), AND
- The phase's scheduled date is strictly before today's date (the deadline has passed).

**Visual treatment:**
- Delayed phase cells render with `background: #ef4444` (red-500) and `box-shadow: inset 0 0 0 2px #fca5a5` (red-300 inner glow).
- The `OperationRow` label column gets `background: #fff5f5` (red-50 row tint) when any cell in that row is delayed.
- A `⚠` character is prepended to the cluster/operation label text.

**Data model change:**
- `ResolvedPhaseCell` in `utils.ts` gains `isDelayed: boolean`.
- `resolveClusterCells` sets `isDelayed = true` when `status === 'in_progress'` and `phase.date < todayKey`.
- `PhaseCell` reads `cell.isDelayed` to apply the red style.
- `OperationRow` in `ClusterRow.tsx` checks `cells.some(c => c.isDelayed)` to apply row tint and ⚠ prefix.

### 3 — Completed Phase De-emphasis

**Chosen style: opacity 0.3, color preserved**

- Cells with `status === 'completed'` render at `opacity: 0.3`.
- Phase color (purchase=slate, movein=amber, infra=indigo, etc.) is preserved — users can still identify what phase it was.
- Applied entirely in `PhaseCell` with a single conditional `opacity` style.
- No change to `in_progress`, `estimated`, `blocked`, or `empty` cells.

---

## Files Changed

| File | Change |
|---|---|
| `src/timeline/utils.ts` | Add `isDelayed: boolean` to `ResolvedPhaseCell`; compute in `resolveClusterCells` |
| `src/timeline/PhaseCell.tsx` | Apply `opacity: 0.3` for completed; red style for delayed; dashed left-border for now-column |
| `src/timeline/WeekHeader.tsx` | Replace `NOW` text with TODAY pill badge; add dashed left-border to NOW column cell |
| `src/timeline/MonthHeader.tsx` | Same TODAY pill + dashed border treatment as WeekHeader |
| `src/timeline/ClusterRow.tsx` | Pass `cells` result to row; apply pink row tint + ⚠ prefix when `cells.some(c => c.isDelayed)` |

---

## Testing

- `src/timeline/utils.test.ts`: add cases for `isDelayed = true` (in_progress + past date) and `isDelayed = false` (in_progress + future date, completed + past date).
- Existing `PhaseCell`, `WeekHeader`, `ClusterRow` snapshot/render tests updated to cover the new visual states.

---

## Out of Scope

- No changes to the `MonthHeader` column-count or date logic.
- No changes to blocked phase styling (already handled separately).
- No backend changes.
- No new components.
