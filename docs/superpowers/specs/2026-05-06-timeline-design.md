# Timeline Date-Driven Schedule Design

## Overview

The timeline page will move from a **week-first** model to a **date-first** model. Each cluster will store exact milestone dates for `PO`, `Move-In`, `Infra`, `CPLD`, and `SIPD`, and the application will derive the timeline placement, the displayed week text, and the cluster's current status from those dates.

This change also includes a small timeline UI cleanup:

- use the same color for every factory dot in the sidebar
- remove the `只看異常` button from the factory filter section
- change week labels to the preferred `W6xx` style for 2026 (for example, week 1 becomes `W601`)

## Goals

- Make milestone dates the single source of truth for cluster schedule data.
- Let users maintain milestone dates from the existing Clusters create/edit form.
- Keep the timeline display automatically synchronized with configured dates.
- Enforce a forward-only milestone sequence so later phases cannot be scheduled before earlier ones.
- Preserve week and month timeline views while changing the underlying source data.

## Non-Goals

- Adding inline editing to the timeline page
- Supporting yearless `MM/DD` storage
- Adding drag-and-drop timeline scheduling
- Redesigning the overall page layout beyond the requested sidebar and week-label adjustments

## Data Model

### Cluster milestone shape

Replace the current week-based milestone source with exact dates.

```ts
type ClusterStatus = 'PO' | 'server_movein' | 'infra' | 'cpld' | 'sipd';

type PhaseStatus = 'completed' | 'in_progress' | 'blocked' | 'estimated';

interface ClusterPhase {
  phase: ClusterStatus;
  date: string;          // YYYY-MM-DD
  status?: PhaseStatus;  // optional override for blocked / estimated / in_progress styling
  note?: string;
}
```

### Source-of-truth rules

- `date` is the canonical schedule value for each milestone.
- The UI may display `MM/DD`, but storage must keep the full year.
- Week columns and month columns are derived from `date`, not entered manually.
- The cluster's overall current status is derived from the latest milestone whose date is on or before today.
- `blocked` remains an exception style on a milestone, not a second scheduling model.

### Ordering rule

Milestones must remain in this order:

```text
PO -> server_movein -> infra -> cpld -> sipd
```

Validation rules:

- `server_movein` date cannot be earlier than `PO`
- `infra` date cannot be earlier than `server_movein`
- `cpld` date cannot be earlier than `infra`
- `sipd` date cannot be earlier than `cpld`

Equality is allowed if the business wants same-day transitions. The important constraint is that the sequence never moves backward.

## Derived Timeline Behavior

### Date conversion

Add shared timeline/date helpers that convert each milestone date into:

- `displayDate`: `MM/DD`
- `weekColumn`: week key used by the week timeline
- `monthColumn`: `YYYY-MM`
- derived cluster current status

### Week label format

The internal week key can remain stable and sortable, but the rendered header text must use the shortened business format:

- 2026 week 1 -> `W601`
- 2026 week 6 -> `W606`
- 2026 week 19 -> `W619`

This is a presentation rule for week labels, not a change to chronological ordering.

### Timeline cell resolution

The timeline still renders spans from one milestone to the next, but those spans are derived from ordered milestone dates:

- the first milestone occupies its own resolved week/month column
- each later milestone covers the span from the previous milestone date forward through its own milestone date
- month view groups those derived week placements into month columns
- multi-phase same-column rendering continues to work when multiple milestone dates resolve to the same week or month

### Current and future states

- Milestones dated before today are treated as completed unless explicitly marked blocked
- The latest milestone whose date is on or before today becomes the cluster's derived current status
- Milestones after today are treated as planned/estimated unless explicitly blocked

## UI Changes

### Timeline sidebar

In `FactorySidebar`:

- remove the `⚠ 只看異常` button
- keep the `全部廠區` action
- show the same dot color for every factory item instead of cycling through a palette

This keeps the sidebar visually neutral and avoids implying factory-specific meanings that are not used elsewhere.

### Week header

In `WeekHeader`:

- keep the current sticky header and current-week highlighting
- change the rendered text from `W06`-style fragments to the business format `W6xx`

### Cluster editing

The existing Clusters page create/edit form becomes the schedule editing surface.

Add date inputs for:

- `PO`
- `Move-In`
- `Infra`
- `CPLD`
- `SIPD`

The form remains the only editing UI for timeline schedule data in this phase.

## Component Responsibilities

### `frontend/src/pages/Clusters.tsx`

- render milestone date inputs in create/edit mode
- validate ordering before submit
- surface field-level validation errors when a milestone moves backward

### `frontend/src/types/index.ts`

- update `ClusterPhase` to use `date` instead of `completionWeek`
- keep phase ordering and shared types centralized here

### `frontend/src/mock/seed.ts`

- migrate seeded clusters to full `YYYY-MM-DD` milestone dates
- keep seed data realistic across factories so dashboard, clusters, and timeline stay consistent

### `frontend/src/mock/store.ts`

- persist the new date-driven phase shape in local storage
- continue exposing clusters through the existing mock API boundary

### `frontend/src/timeline/utils.ts`

- add date parsing/formatting helpers
- derive internal week keys from dates
- format rendered week labels as `W6xx`
- resolve timeline cells from date-driven milestones
- centralize forward-only validation so the rule is enforced outside the form as well

### `frontend/src/pages/Timeline.tsx` and timeline subcomponents

- consume derived schedule data
- remove dependency on manually-entered week strings
- preserve existing week/month navigation behavior

## Validation and Error Handling

- Reject cluster edits that violate milestone ordering.
- Show clear validation near the offending field rather than silently correcting values.
- Reject invalid or unparseable stored dates in shared helpers instead of silently dropping milestones.
- Keep blocked styling explicit: if a milestone is marked blocked, render it as blocked even though its date is still present.

## Testing

Update or add tests for:

- week label formatting (`W601`, `W619`, etc.)
- date-to-week conversion
- date-to-month conversion
- derived current cluster status from milestone dates
- same-column multi-phase rendering after date conversion
- forward-only validation failures
- seed/mock data compatibility with the updated `ClusterPhase` type

## Migration Notes

- Existing seed data currently stores `completionWeek`; it must be rewritten to exact dates.
- Existing local storage data may no longer match the new phase shape. During implementation, decide whether to bump the mock DB key or add a compatibility reset path so stale browser data does not break the UI.

## Implementation Summary

The implementation should keep the current page structure and navigation intact while replacing the timeline's scheduling source from week strings to exact milestone dates. The Clusters page becomes the schedule editor, the Timeline page becomes a pure derived view, and ordering validation ensures that milestone schedules always move forward in time.
