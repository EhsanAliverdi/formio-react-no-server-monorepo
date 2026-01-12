# FormIO React No Server (Monorepo)

A Docker-first monorepo for building and running Form.io forms with a React admin/public UI and a Next.js backend API.

## What’s inside

- `frontend/` — Vite + React + TypeScript UI (admin + public)
- `backend/` — Next.js (App Router) API server
- `docker-compose.yml` — local dev stack (frontend, backend, MinIO)

## Features

- Form management (create/edit/view forms)
- Form rendering + submissions
- Notifications (read/unread + mark-as-read)
- Role-based access control (admin-only sections)
- React Icons picker (search icons across packs; icons served as SVG from backend)
- File uploads backed by MinIO (S3-compatible storage)
- SQLite persistence (path configurable via `SQLITE_DB_PATH`)
- Optional PDF draft export endpoints (admin)

## Quick start (Docker)

Build and run everything:

```bash
docker compose up -d --build
```

Services (default):

- Frontend (nginx): http://localhost
- Backend API: http://localhost:3000
- MinIO Console: http://localhost:9001
- MinIO S3 API: http://localhost:9000

View logs:

```bash
docker compose logs -f --tail=200 backend
```

Stop:

```bash
docker compose down
```

## Seed the database (admin user + sample forms)

Run the seed script inside the backend container:

```bash
docker compose exec backend npm run seed
```

Default admin credentials (from seed):

- Email: `admin@example.com`
- Password: `admin12345`

If you changed the DB location, the seed script uses the same DB as the backend via `SQLITE_DB_PATH`.

## Environment configuration

This repo expects environment variables to be supplied via Docker Compose or your shell.

### Backend

Common variables:

- `SQLITE_DB_PATH`
	- Path to the SQLite file used by the backend.
	- In Docker this is typically set to something like `/app/backend/var/forms.db` and backed by a named volume.

- `SUPERUSER_EMAIL`, `SUPERUSER_PASSWORD`
	- Used by the seed script to create/update the admin account.

- `MINIO_ENDPOINT`
	- S3 endpoint URL.
	- In Docker this typically points to the MinIO service, e.g. `http://minio:9000`.

- `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`
	- Credentials used by the backend to access MinIO.

- `MINIO_BUCKET`
	- Bucket used for file uploads.

Exact values are defined in `docker-compose.yml` for local usage.

### Frontend

- `VITE_API_BASE_URL`
	- Base URL for the backend API.
	- When running behind nginx at `http://localhost`, this usually points to `http://localhost:3000`.

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
- SQLite database files are ignored (runtime data).

## Troubleshooting

- Icons not showing in the picker:
	- Ensure backend is reachable at `VITE_API_BASE_URL`.
	- The backend icon endpoints handle CORS and `OPTIONS` preflight.

- Login fails after changing Docker volumes/DB path:
	- Re-run `docker compose exec backend npm run seed` to recreate the admin user in the active DB.

- MinIO upload errors:
	- Confirm MinIO is running and the bucket exists.
	- Verify `MINIO_*` variables match your local stack.
