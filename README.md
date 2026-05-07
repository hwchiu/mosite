# MoSite — Bare-Metal Server Management System

A web-based platform for managing bare-metal server clusters across multiple factory sites (F1–F10), supporting k8s and VM service types with full lifecycle tracking.

## Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | React 19 + TypeScript + Tailwind CSS v4 |
| Deployment | GitHub Pages (static)                   |

## Quick Start

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # production build
npm test         # run tests
npm run lint     # ESLint
```

## Features

- **Dashboard** — Status summary, factory × phase matrix
- **Cluster Management** — Create/manage k8s and VM clusters per factory with full phase lifecycle
- **Timeline** — Visual Gantt-style view of cluster phases across factories

## Cluster Lifecycle

Every cluster operation (init or expansion) goes through phases in order:

```
purchase → movein → infra → cluster → platform → release
```

Expansion operations omit the `platform` phase.

## Project Structure

```
mosite/
├── src/
│   ├── pages/        # Dashboard, Clusters, Timeline
│   ├── components/   # Layout
│   ├── api/          # Mock API clients
│   ├── mock/         # In-memory store (localStorage-backed)
│   ├── timeline/     # Timeline components and utils
│   └── types/        # Shared TypeScript types
├── public/           # Static assets (incl. GitHub Pages 404 redirect)
└── docs/             # Design specs and documentation
```

## Deployment

GitHub Actions deploys to `https://www.hwchiu.com/mosite/` on every push to `main`.
