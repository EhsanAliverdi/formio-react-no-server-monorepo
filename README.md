# SurveyFlow

A modern, Docker-first survey and form management platform.

## Stack

| Layer | Technology | Directory |
|-------|-----------|-----------|
| Frontend | Angular 19 + Tailwind CSS + Form.io | `angular-frontend/` |
| Backend | .NET 10 ASP.NET Core Web API | `dotnet-backend/` |
| Database | PostgreSQL 16 | -- |
| Object storage | MinIO (S3-compatible) | -- |
| Legacy backend | Next.js (App Router) -- kept for rollback | `backend/` |

> **Note:** The legacy Next.js backend (`backend/`) is retained for rollback purposes only. It will be removed after the .NET backend is verified in production.

## Quick Start

**Development mode (with hot reload):**

```bash
docker compose build
docker compose up
```

Services in dev mode:

- Angular frontend: http://localhost:4200
- .NET backend API: http://localhost:5000
- MinIO console: http://localhost:9003
- PostgreSQL: localhost:5432

**Production mode:**

```bash
docker compose -f docker-compose.yml up --build -d
```

Production ports:

- Angular frontend: http://localhost:4201
- .NET backend API: http://localhost:5000

**For detailed Docker documentation, see [DOCKER.md](DOCKER.md)**

## Seed the database

```bash
docker compose exec backend npm run seed
```

Default admin credentials:

- Email: `admin@example.com`
- Password: `admin12345`

## Environment variables

### .NET backend (`dotnet-backend/`)

| Variable | Description |
|----------|-------------|
| `ConnectionStrings__Default` | PostgreSQL connection string |
| `Minio__Endpoint` | MinIO S3 endpoint URL |
| `Minio__AccessKey`, `Minio__SecretKey` | MinIO credentials |
| `Minio__Bucket` | Bucket name for uploads |
| `Superuser__Email`, `Superuser__Password` | Seed admin credentials |

### Angular frontend

No server-side env vars required in production -- all API calls are relative URLs proxied by nginx.

In dev mode, the Angular dev server uses `proxy.conf.json` to forward `/api` to `http://dotnet-backend:5000`.

## MinIO (object storage)

- Console: http://localhost:9003
- S3 API: http://localhost:9002

## VS Code Tasks

Press `Ctrl+Shift+P` -> **Tasks: Run Task** to access Docker tasks:

- **Docker: Start Dev Mode** -- `docker compose up -d`
- **Docker: Rebuild Dev Mode** -- `docker compose up --build -d`
- **Docker: Stop Dev Mode** -- `docker compose down`
- **Docker: Seed Database** -- runs seed script in the backend container
- **Docker: Prisma DB Push** -- applies schema changes
- **Docker: View Backend Logs** / **Docker: View Frontend Logs** -- follow logs
