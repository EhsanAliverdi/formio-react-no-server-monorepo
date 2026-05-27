# HPA SurveyFlow

Enterprise survey and form management platform built with Angular, ASP.NET Core, PostgreSQL, MinIO, and Docker.

## Solution Structure

The repository root is the solution boundary. Each top-level `HPA.*` directory is a project.

| Project | Purpose |
|---------|---------|
| `HPA.SurveyFlow.Web` | Angular application |
| `HPA.SurveyFlow.Api` | ASP.NET Core HTTP API |
| `HPA.SurveyFlow.Domain` | Entities, enums, and DTO contracts |
| `HPA.SurveyFlow.Infrastructure` | EF Core, persistence, storage, PDF, and application services |
| `HPA.SurveyFlow.Docker` | Dockerfiles, compose files, environment files, Traefik overlays, and Octopus notes |

Solution file: `HPA.SurveyFlow.slnx`

## Docker Layout

Docker configuration lives under `HPA.SurveyFlow.Docker`:

| Path | Purpose |
|------|---------|
| `compose/docker-compose.yml` | Shared service definitions |
| `compose/docker-compose.development.yml` | Local development ports, bind mounts, and hot reload |
| `compose/docker-compose.uat.yml` | UAT VM overlay with Traefik routing |
| `compose/docker-compose.production.yml` | Production VM overlay with Traefik routing |
| `env/development.env` | Local development variables |
| `env/uat.env` | UAT variable template |
| `env/production.env` | Production variable template |
| `octopus/deployment-process.md` | Octopus deployment notes |

`.dockerignore` remains at the repository root because the Docker build context is the repository root.

## Development

```bash
docker compose --env-file HPA.SurveyFlow.Docker/env/development.env -f HPA.SurveyFlow.Docker/compose/docker-compose.yml -f HPA.SurveyFlow.Docker/compose/docker-compose.development.yml up --build
```

- Web: http://localhost:4200
- API: http://localhost:5000
- MinIO console: http://localhost:9003
- PostgreSQL: localhost:5432

## UAT

```bash
docker compose --env-file HPA.SurveyFlow.Docker/env/uat.env -f HPA.SurveyFlow.Docker/compose/docker-compose.yml -f HPA.SurveyFlow.Docker/compose/docker-compose.uat.yml up --build -d
```

## Production

```bash
docker compose --env-file HPA.SurveyFlow.Docker/env/production.env -f HPA.SurveyFlow.Docker/compose/docker-compose.yml -f HPA.SurveyFlow.Docker/compose/docker-compose.production.yml up --build -d
```

## Build Locally

```bash
dotnet build HPA.SurveyFlow.slnx
npm.cmd --prefix HPA.SurveyFlow.Web run build
```
