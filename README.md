# HPA SurveyFlow

Enterprise survey and form management platform built with Angular, ASP.NET Core, PostgreSQL, and MinIO.

## Structure

| Area | Project | Purpose |
|------|---------|---------|
| Web | `src/HPA.SurveyFlow.Web` | Angular application |
| API | `src/HPA.SurveyFlow.Api` | ASP.NET Core HTTP API |
| Domain | `src/HPA.SurveyFlow.Domain` | Entities, enums, and DTO contracts |
| Infrastructure | `src/HPA.SurveyFlow.Infrastructure` | EF Core, persistence, storage, PDF, and application services |
| Docker | `Docker/` | Compose files, image definitions, and Nginx config |

## Development

```bash
docker compose --env-file .env.development -f Docker/docker-compose.yml -f Docker/docker-compose.override.yml up --build
```

- Web: http://localhost:4200
- API: http://localhost:5000
- MinIO console: http://localhost:9003
- PostgreSQL: localhost:5432

## Production-style Docker

```bash
docker compose -p hpa-surveyflow-prod --env-file .env.production -f Docker/docker-compose.yml up --build -d
```

- Web: http://localhost:4201
- API: http://localhost:5000

## Database

```bash
docker compose --env-file .env.development -f Docker/docker-compose.yml -f Docker/docker-compose.override.yml exec api dotnet run --project HPA.SurveyFlow.Api -- --seed
```

Default admin credentials: `admin@example.com` / `admin12345`.

## VS Code Tasks

Use `Tasks: Run Task` and choose from:

- `Docker: Dev Up`
- `Docker: Dev Rebuild`
- `Docker: Dev Down`
- `Docker: API Logs`
- `Docker: Web Logs`
- `EF: Add Migration`
- `EF: Update Database`

See [DOCKER.md](DOCKER.md) for Docker details.
