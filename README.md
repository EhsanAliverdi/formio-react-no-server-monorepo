# SurveyFlow

A modern, Docker-first survey and form management platform with a React admin/public UI and a Next.js backend API.

## What’s inside

- `frontend/` — Vite + React + TypeScript UI (admin + public)
- `backend/` — Next.js (App Router) API server
- `docker-compose.yml` — Production Docker configuration
- `docker-compose.override.yml` — Development mode with hot reload

## ⚡ Quick Start

**Development mode (with hot reload):**

```bash
# First time: build the images
docker compose build

# Start development mode
docker compose up
```

This gives you:
- ✅ Hot reload for both frontend and backend
- ✅ No rebuilds needed when you change code
- ✅ Frontend: http://localhost:5174
- ✅ Backend: http://localhost:3000

**For detailed documentation, see [DOCKER.md](DOCKER.md)**

## Features

- Form management (create/edit/view forms)
- Form rendering + submissions
- Notifications (read/unread + mark-as-read)
- Role-based access control (admin-only sections)
- React Icons picker (search icons across packs; icons served as SVG from backend)
- File uploads backed by MinIO (S3-compatible storage)
- PostgreSQL database for persistence
- Optional PDF draft export endpoints (admin)

## Quick start (Docker)

**See [DOCKER.md](DOCKER.md) for comprehensive documentation.**

Development mode (with hot reload):

```bash
docker compose --env-file .env.development up
```

Production mode (optimized builds):

```bash
docker compose --env-file .env.production -f docker-compose.yml up --build
```

Stop containers:

```bash
docker compose --env-file .env.development down
```

## Seed the database (admin user + sample forms)

Run the seed script inside the backend container:

```bash
docker compose --env-file .env.development exec backend npm run seed
```

Default admin credentials (from seed):

- Email: `admin@example.com`
- Password: `admin12345`

The seed script uses the PostgreSQL database configured via `DATABASE_URL`.

## VS Code Tasks

This project includes VS Code tasks for common Docker operations. Press `Ctrl+Shift+P` → "Tasks: Run Task" to access them:

- **Docker: Compose Up Frontend** — Start the frontend service only
- **Docker: Compose Up Backend** — Start the backend service (includes MinIO dependency)
- **Docker: Compose Up Both** — Start all services
- **Docker: Recreate & Compose Up Frontend** — Force recreate and rebuild the frontend service
- **Docker: Recreate & Compose Up Backend** — Force recreate and rebuild the backend service
- **Docker: Recreate & Compose Up Both** — Force recreate and rebuild all services
- **Docker: Seed Database** — Run the database seed script in the running backend container

All tasks run in the background except for the seed task, which will show output when complete.

## Environment configuration

This repo expects environment variables to be supplied via Docker Compose or your shell. For convenience, you can use
the root `.env.development` and `.env.production` files and pass them to Docker Compose via `--env-file`. The frontend
and backend will also read these root env files when running locally, so you do not need separate `.env` files under
`frontend/` or `backend/`.

### Backend

Common variables:

- `DATABASE_URL`
	- PostgreSQL connection string.
	- Format: `postgresql://username:password@host:port/database`
	- In Docker this is automatically configured to connect to the postgres service.

- `SUPERUSER_EMAIL`, `SUPERUSER_PASSWORD`
	- Used by the seed script to create/update the admin account.

- `MINIO_ENDPOINT`
	- S3 endpoint URL.
	- In Docker this typically points to the MinIO service, e.g. `http://minio:9000`.

- `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`
	- Credentials used by the backend to access MinIO.

- `MINIO_BUCKET`
	- Bucket used for file uploads.

- `PUBLIC_API_BASE_URL`
	- Optional public base URL used by the backend when generating absolute upload URLs.
	- Set this to the URL reachable by your clients (ex: `http://localhost:3000`) so uploads resolve correctly.

Exact values are defined in `docker-compose.yml` for local usage.

### Frontend

- `VITE_API_BASE_URL`
	- Base URL for the backend API.
	- When running behind nginx at `http://localhost`, this usually points to `http://localhost:3000`.
	- If unset for web builds, the frontend falls back to the current browser origin.

## MinIO (S3 storage)

This project uses MinIO for file storage (S3-compatible).

### Accessing MinIO

- Console: http://localhost:9001
- S3 API: http://localhost:9000

Log in to the console using the credentials from `docker-compose.yml`.

### Bucket

The backend expects a bucket name in `MINIO_BUCKET`.

If the bucket doesn’t exist yet:

1. Open MinIO Console (http://localhost:9001)
2. Create the bucket matching `MINIO_BUCKET`

### Upload flow (high-level)

- Frontend requests upload via backend
- Backend stores files in MinIO and returns a URL/key
- Form submissions reference the stored object

## Architecture notes

### Backend

The backend is a Next.js App Router server that exposes API routes under `backend/src/app/api/**`.

Notable API areas:

- Auth: `backend/src/app/api/auth/**`
- Forms: `backend/src/app/api/forms/**`
- Admin: `backend/src/app/api/admin/**`
- Notifications: `backend/src/app/api/notifications/**`
- Uploads (MinIO): `backend/src/app/api/uploads/**`

### React Icons (picker)

The icon picker supports multiple `react-icons` packs without bundling thousands of icons into the frontend build.

- Frontend searches by calling backend endpoints
- Backend dynamically imports icon packs and returns:
	- `/api/icons/search` — icon names
	- `/api/icons/svg` — SVG markup for an icon

Icons are stored/identified as `pack:name` (example: `fa:FaBell`).

## Local development (without Docker)

If you prefer running services directly:

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Note: if you run without Docker, you still need an S3-compatible endpoint for uploads (MinIO recommended).

## Repository notes

- `_reference/` is intentionally ignored and not part of the repo history.

## Troubleshooting

- Docker build fails with `failed to receive status: rpc error: ... EOF`:
	- This is usually a Docker Desktop/BuildKit+Compose Bake issue (not a TypeScript/Vite error).
	- Workaround: set `COMPOSE_BAKE=false` and rebuild (see Quick start section above).
	- If it keeps happening, update Docker Desktop / Compose plugin and increase Docker resources.

- Icons not showing in the picker:
	- Ensure backend is reachable at `VITE_API_BASE_URL`.
	- The backend icon endpoints handle CORS and `OPTIONS` preflight.

- Login fails after changing Docker volumes/DB path:
	- Re-run `docker compose exec backend npm run seed` to recreate the admin user in the active DB.

- MinIO upload errors:
	- Confirm MinIO is running and the bucket exists.
	- Verify `MINIO_*` variables match your local stack.
