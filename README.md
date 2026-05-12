# SurveyFlow

A Docker-first survey and form management platform built with Angular 19 and .NET 10.

## Stack

| Layer | Technology | Directory |
|-------|-----------|-----------|
| Frontend | Angular 19 + Tailwind CSS + Form.io | `angular-frontend/` |
| Backend | .NET 10 ASP.NET Core Web API | `dotnet-backend/` |
| Database | PostgreSQL 16 | — |
| Object storage | MinIO (S3-compatible) | — |

## Quick Start

**Development (hot reload):**

```bash
docker compose up --build
```

- Angular frontend: http://localhost:4200
- .NET API: http://localhost:5000
- MinIO console: http://localhost:9003
- PostgreSQL: localhost:5432

**Production:**

```bash
docker compose -f docker-compose.yml up --build -d
```

- Angular frontend: http://localhost:4201
- .NET API: http://localhost:5000

For detailed Docker docs see [DOCKER.md](DOCKER.md).

## Seed the database

```bash
docker compose exec dotnet-backend dotnet run --seed
```

Default admin credentials: `admin@example.com` / `admin12345`

## Environment variables

### .NET backend (`dotnet-backend/`)

| Variable | Description |
|----------|-------------|
| `ConnectionStrings__Default` | PostgreSQL connection string |
| `Minio__Endpoint` | MinIO S3 endpoint URL |
| `Minio__AccessKey`, `Minio__SecretKey` | MinIO credentials |
| `Minio__Bucket` | Upload bucket name |
| `Superuser__Email`, `Superuser__Password` | Seed admin credentials |

### Angular frontend

No server-side env vars required in production — all API calls are relative URLs proxied by nginx.

In dev mode `proxy.conf.json` forwards `/api` to `http://dotnet-backend:5000`.

## MinIO

- Console: http://localhost:9003
- S3 API: http://localhost:9002

## VS Code Tasks

`Ctrl+Shift+P` → **Tasks: Run Task**:

- **Docker: Start Dev Mode** — `docker compose up -d`
- **Docker: Rebuild Dev Mode** — `docker compose up --build -d`
- **Docker: Stop Dev Mode** — `docker compose down`
- **Docker: Prisma DB Push** — push schema changes
- **Docker: View Backend Logs** / **Docker: View Frontend Logs**
