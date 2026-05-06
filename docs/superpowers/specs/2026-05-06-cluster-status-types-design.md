# Cluster Status Type Redesign

## Problem

The current cluster timeline flow uses five legacy phases:

1. `PO`
2. `server_movein`
3. `infra`
4. `cpld`
5. `sipd`

The product direction is to replace that flow with six business-facing status types ordered by time:

1. `purchase`
2. `move_in`
3. `infra`
4. `cluster`
5. `platform`
6. `release`

The application should treat those six phases as the single source of truth for cluster progress, schedule validation, and timeline rendering.

## Goals

- Replace the existing cluster phase/status model with the new six ordered types.
- Keep cluster scheduling date-driven, with each phase represented by a required `YYYY-MM-DD` date.
- Preserve forward-only validation so each phase date must be on or after the previous phase date.
- Keep derived status behavior consistent across Clusters, Timeline, Dashboard, and storage layers.

## Non-Goals

- Adding optional phases or per-factory custom phase sets.
- Keeping the old and new phase models active at the same time.
- Changing the existing date-driven timeline behavior beyond the phase set replacement.

## Canonical Phase Model

The new canonical ordered phase list is:

1. `purchase`
2. `move_in`
3. `infra`
4. `cluster`
5. `platform`
6. `release`

These keys replace both `ClusterStatus` and `PhaseKey` usages in the frontend. Any logic that derives a cluster's current status must use this order when two milestones share the same date.

### Labels

The UI should display the phases with these labels:

| Key | Label |
| --- | ----- |
| `purchase` | Purchase |
| `move_in` | MoveIn |
| `infra` | Infra |
| `cluster` | Cluster |
| `platform` | Platform |
| `release` | Release |

## Data Flow and Validation

- Cluster create/edit forms require dates for all six phases.
- Timeline utilities derive the current phase from milestone dates ordered by the canonical phase list above.
- Validation rejects any schedule where a later phase date is earlier than a prior phase date.
- Existing blocked / estimated / completed / in-progress rendering semantics remain unchanged; only the phase keys and labels change.

## Storage and Migration

Persisted cluster phase data must be migrated to the new phase model so the application does not operate on mixed phase sets.

The migration should translate the old phase keys to the new ones using this mapping:

| Old key | New key |
| ------- | ------- |
| `PO` | `purchase` |
| `server_movein` | `move_in` |
| `infra` | `infra` |
| `cpld` | `cluster` |
| `sipd` | `platform` |

Because the new model adds `release`, migrated records should derive a `release` phase date from the previous final milestone so existing schedules remain complete and valid after upgrade. Freshly created or edited clusters must store an explicit `release` date.

## UI Surfaces

### Clusters Page

- Replace the existing five milestone inputs with six ordered date inputs.
- Update validation and error messages to use the new labels.
- Keep the form behavior the same otherwise, including create/edit reset logic and mutation error handling.

### Timeline Page

- Use the new phase keys for cell resolution, labels, legends, and current-phase detection.
- Keep the existing date-driven timeline rendering and solid-status visual treatment.

### Dashboard and Summaries

- Update any cluster status counts, badges, or summary labels to the new six-phase model.

## Testing

Update and extend existing tests to cover:

- Six-phase ordering in timeline derivation utilities.
- Date validation across the new canonical order.
- Cluster form submission and edit behavior with all six dates.
- Storage migration from the old five-phase model to the new six-phase model.
- Any summary/status surfaces that rely on the cluster status union.
