# HPA SurveyFlow

Enterprise survey and form management platform built with Angular, ASP.NET Core, PostgreSQL, and MinIO.

## Solution Structure

The repository root is the solution boundary. Each top-level `HPA.*` directory is a project.

| Project | Purpose |
|---------|---------|
| `HPA.SurveyFlow.Web` | Angular application |
| `HPA.SurveyFlow.Api` | ASP.NET Core HTTP API |
| `HPA.SurveyFlow.Domain` | Entities, enums, and DTO contracts |
| `HPA.SurveyFlow.Infrastructure` | EF Core, persistence, storage, PDF, and application services |
| `HPA.SurveyFlow.Docker` | Compose files, Dockerfiles, and Nginx config |

Solution file: `HPA.SurveyFlow.slnx`

## Development

```bash
docker compose --env-file .env.development -f HPA.SurveyFlow.Docker/docker-compose.yml -f HPA.SurveyFlow.Docker/docker-compose.override.yml up --build
```

- Web: http://localhost:4200
- API: http://localhost:5000
- MinIO console: http://localhost:9003
- PostgreSQL: localhost:5432

## Production-style Docker

```bash
docker compose -p hpa-surveyflow-prod --env-file .env.production -f HPA.SurveyFlow.Docker/docker-compose.yml up --build -d
```

- Web: http://localhost:4201
- API: http://localhost:5000

## Build Locally

```bash
dotnet build HPA.SurveyFlow.slnx
npm.cmd --prefix HPA.SurveyFlow.Web run build
```
