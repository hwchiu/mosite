# Copilot Instructions

## Project Overview

**mosite** is a React static-site prototype for managing bare-metal server clusters across factory sites (F1–F10). It runs entirely in the browser with a mock in-memory/localStorage backend — there is no real API server yet. The end goal is to evolve this into a full FastAPI + React app, but currently all data lives in `frontend/src/mock/`.

Deployed at: `https://www.hwchiu.com/mosite/`

## Commands

All commands run from the `frontend/` directory:

```bash
npm run dev        # dev server at localhost:5175 (base path = '/')
npm run build      # TypeScript check + Vite production build
npm run lint       # ESLint
npm test           # run all tests once (Vitest)
npm run test:watch # watch mode

# Run a single test file
npm test -- --run src/pages/Clusters.test.tsx
npm test -- --run src/timeline/utils.test.ts
```

GitHub Actions deploys on push to `main` using `VITE_BASE_URL=/mosite/`.

## Architecture

### Mock data layer (no real backend)
`src/api/*.ts` files look like real API clients but call `src/mock/store.ts` directly:

```
src/api/clusters.ts → src/mock/store.ts (db_listClusters, db_createCluster, …)
src/api/timeline.ts → src/mock/store.ts (db_fetchTimelineClusters)
```

`store.ts` persists to `localStorage` under key `mosite_mock_db_v5`. When adding new seed data or changing the schema, bump the key (`v5 → v6`) and add a migration in `loadDB()`. The previous key is `LEGACY_LS_KEY`.

### Phase lifecycle (strict ordering)
Every cluster goes through 6 phases in order:

```
purchase → movein → infra → cluster → platform → release
```

- `PhaseKey = ClusterStatus` — both are the same union type in `src/types/index.ts`
- `PHASE_ORDER` is defined in both `src/mock/store.ts` and `src/timeline/utils.ts` — keep them in sync
- Phase dates must be non-decreasing; `validatePhaseDates()` in `utils.ts` enforces this
- `deriveClusterStatus()` computes the current active phase from today's date

### SPA routing for GitHub Pages
Direct URL access (e.g. `/mosite/clusters`) returns 404 from GitHub Pages. `public/404.html` encodes the path as `?p=/clusters`; `index.html` decodes it on load. `segmentCount = 1` in those files matches the `/mosite/` base path depth.

### React Query conventions
- `staleTime: 30_000` globally; most queries use key `['clusters']`, `['timeline']`, `['dashboard']`
- After mutations, call `queryClient.invalidateQueries({ queryKey: ['clusters'] })` (and `['timeline']`, `['dashboard']` if needed)

## Key Conventions

### Seed data (`src/mock/seed.ts`)
26 clusters across F1–F10, each with all 6 phases populated. When editing seed data programmatically, use Python to do bulk replacements — the file is generated. The `status` field on each cluster should reflect the expected derived status (e.g., `'release'` for fully past clusters).

### Test patterns
- Tests use `vitest` + `@testing-library/react` + `jsdom`
- `src/test-setup.ts` mocks `localStorage` and sets a fixed `Date` (2026-05-06)
- Tests that manipulate raw `localStorage` must use `mosite_mock_db_v5` (the current `LS_KEY`)
- The legacy migration tests write to `mosite_mock_db_v4` (the current `LEGACY_LS_KEY`)
- `renderClusters()` / `renderTimeline()` helpers wrap components in `QueryClientProvider`

### Status labels (display names)
Phase keys have display labels defined locally in each page component — not a shared constant. When adding/renaming a phase, update `PHASE_LABELS` in:
- `src/pages/Clusters.tsx`
- `src/pages/Timeline.tsx`
- `src/timeline/FactoryGroup.tsx` (PHASE_EMOJI)
- `src/pages/Dashboard.tsx` (STATUS_CONFIG)

### TypeScript
`tsc -b` (project references build) is used, not `tsc` alone. The build command is `tsc -b && vite build`.
