# Docker Workflows

All Docker assets live under `Docker/`.

## Files

```text
Docker/
  docker-compose.yml           production-style base services
  docker-compose.override.yml  development overrides
  Dockerfile.Api               HPA.SurveyFlow.Api image
  Dockerfile.Web               HPA.SurveyFlow.Web image
  nginx.web.conf               production web server and /api proxy
```

## Development

```bash
docker compose --env-file .env.development -f Docker/docker-compose.yml -f Docker/docker-compose.override.yml up --build
```

Services:

- `web`: Angular dev server on http://localhost:4200
- `api`: ASP.NET Core API on http://localhost:5000
- `postgres`: PostgreSQL on localhost:5432
- `minio`: S3-compatible storage, console on http://localhost:9003
- `chromium`: browserless Chrome for PDF rendering

The development override bind-mounts `src/` into the API container and `src/HPA.SurveyFlow.Web` into the web container.

## Production-style

```bash
docker compose -p hpa-surveyflow-prod --env-file .env.production -f Docker/docker-compose.yml up --build -d
```

Production-style services build immutable images. The web image builds Angular and serves the static output through Nginx. Nginx also proxies `/api/` to the `api` service.

## Common Commands

```bash
# Start dev
docker compose --env-file .env.development -f Docker/docker-compose.yml -f Docker/docker-compose.override.yml up -d

# Rebuild dev
docker compose --env-file .env.development -f Docker/docker-compose.yml -f Docker/docker-compose.override.yml up --build -d

# View logs
docker compose --env-file .env.development -f Docker/docker-compose.yml -f Docker/docker-compose.override.yml logs -f api
docker compose --env-file .env.development -f Docker/docker-compose.yml -f Docker/docker-compose.override.yml logs -f web

# Stop dev
docker compose --env-file .env.development -f Docker/docker-compose.yml -f Docker/docker-compose.override.yml down

# Add EF migration
docker compose --env-file .env.development -f Docker/docker-compose.yml -f Docker/docker-compose.override.yml exec api dotnet ef migrations add AddSomething --project HPA.SurveyFlow.Infrastructure --startup-project HPA.SurveyFlow.Api

# Update database
docker compose --env-file .env.development -f Docker/docker-compose.yml -f Docker/docker-compose.override.yml exec api dotnet ef database update --project HPA.SurveyFlow.Infrastructure --startup-project HPA.SurveyFlow.Api
```

## Ports

| Variable | Default | Purpose |
|----------|---------|---------|
| `WEB_DEV_PORT` | `4200` | Angular dev server |
| `WEB_PORT` | `4201` | Production-style Nginx web port |
| `API_PORT` | `5000` | ASP.NET Core API |
| `POSTGRES_PORT` | `5432` | PostgreSQL |
| `MINIO_PORT` | `9002` | MinIO S3 API |
| `MINIO_CONSOLE_PORT` | `9003` | MinIO console |
