# MoSite — Bare-Metal Server Management System

A web-based platform for managing bare-metal servers across multiple factory sites (F1–F25), supporting k8s and VM service types with full lifecycle tracking and audit history.

## Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Backend    | FastAPI (Python 3.12) + SQLAlchemy 2.0  |
| Database   | PostgreSQL 16                           |
| Frontend   | React 19 + TypeScript + Tailwind CSS v4 |
| Deployment | Docker Compose                          |

## Quick Start

```bash
# Start all services (first run builds images)
docker compose up --build

# App runs at:
#   Frontend:  http://localhost
#   Backend API: http://localhost:8000
#   API Docs:  http://localhost:8000/docs
```

Database migrations run automatically on backend startup via `alembic upgrade head`.

## Server Lifecycle

```
purchased → waiting_infra → waiting_cluster_setup → waiting_platform → active → retired
```

Every status change requires an **operator name** and optionally a **comment**, which are recorded in the audit log.

## Features

- **Dashboard** — Real-time summary cards, factory × status matrix, cluster usage, model & service-type charts
- **Server List** — Multi-filter table (factory, status, model, service type, cluster, batch), bulk import via CSV/JSON, batch status changes
- **Server Detail** — Full edit form, status transition buttons, complete audit log timeline
- **Cluster Management** — Create/manage k8s and VM clusters per factory, view assigned servers
- **Purchase Batch Tracking** — Track procurement batches, bulk-create servers from a batch

## Development

### Backend (local)
```bash
cd backend
pip install -r requirements.txt

# Start postgres first (or use docker compose up postgres)
export DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/mosite
export APP_ENV=development

alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend (local)
```bash
cd frontend
npm install
npm run dev   # Proxies /api → http://localhost:8000
```

## Project Structure

```
mosite/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app entry point
│   │   ├── config.py        # Pydantic Settings
│   │   ├── database.py      # Async SQLAlchemy engine
│   │   ├── models/          # ORM models (5 tables)
│   │   ├── schemas/         # Pydantic V2 schemas
│   │   ├── routers/         # API route handlers
│   │   └── services/        # Business logic (dashboard aggregations)
│   ├── alembic/             # Database migrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/           # Dashboard, ServerList, ServerDetail, Clusters, Batches
│   │   ├── components/      # Layout, StatusBadge, ModelBadge, LoadingSpinner
│   │   ├── api/             # Typed axios API clients
│   │   └── types/           # Shared TypeScript types
│   └── nginx.conf
└── docker-compose.yml
```

## Data Model

| Table             | Key Fields                                                         |
|-------------------|--------------------------------------------------------------------|
| `factories`       | name (F1–F25)                                                      |
| `clusters`        | name, type (k8s/vm), factory                                       |
| `purchase_batches`| name, purchase_date, factory, notes                                |
| `servers`         | hostname, serial, IP, model (1/2/3), service_type, status, factory, cluster, batch |
| `audit_logs`      | server_id, operator, field, old_value, new_value, comment          |

## Server Models

- `model_1`, `model_2`, `model_3`

## Environment Variables (Backend)

| Variable       | Default                                              | Description          |
|----------------|------------------------------------------------------|----------------------|
| `DATABASE_URL` | `postgresql+asyncpg://postgres:postgres@postgres:5432/mosite` | Async DB URL |
| `APP_ENV`      | `development`                                        | `development` auto-creates tables |
| `CORS_ORIGINS` | `["http://localhost:3000","http://localhost:5173"]`  | Allowed CORS origins |
