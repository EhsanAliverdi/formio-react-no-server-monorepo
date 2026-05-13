# HPA SurveyFlow Octopus Deployment

This repository keeps deployment inputs under `HPA.SurveyFlow.Docker` so Docker, VM, and environment concerns stay outside the application projects.

## Environments

| Environment | Compose overlay | Environment file |
|-------------|-----------------|------------------|
| Development | `compose/docker-compose.development.yml` | `env/development.env` |
| UAT | `compose/docker-compose.uat.yml` | `env/uat.env` |
| Production | `compose/docker-compose.production.yml` | `env/production.env` |

## Octopus Variables

Use Octopus variables to replace values from `env/uat.env` and `env/production.env` during deployment.

Required sensitive variables:

- `POSTGRES_PASSWORD`
- `MINIO_ROOT_PASSWORD`
- `MINIO_SECRET_KEY`
- `ADMIN_PASSWORD`

Required seed variables:

- `SEED_ADMIN_USER`
- `SEED_FORMS`
- `ADMIN_EMAIL`

Required environment routing variables:

- `WEB_HOST`
- `API_HOST`
- `TRAEFIK_HTTP_PORT`
- `TRAEFIK_HTTPS_PORT`

## VM Deployment Shape

1. TeamCity builds and validates the solution.
2. TeamCity publishes versioned Docker images or a deployment package.
3. Octopus deploys to the target VM.
4. Octopus writes the environment-specific `.env` file from variables.
5. Octopus runs the relevant compose command:

```bash
docker compose --env-file HPA.SurveyFlow.Docker/env/uat.env \
  -f HPA.SurveyFlow.Docker/compose/docker-compose.yml \
  -f HPA.SurveyFlow.Docker/compose/docker-compose.uat.yml \
  up -d
```

Production uses `env/production.env` and `compose/docker-compose.production.yml`.
