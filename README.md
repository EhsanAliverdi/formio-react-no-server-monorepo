# FormIO React No Server (Monorepo)

Monorepo containing:
- `frontend/`: Vite + React + Tailwind admin UI
- `backend/`: Next.js (App Router) API (SQLite)
- Docker compose wiring for local development

## Run with Docker

```bash
docker compose up -d --build
```

- Backend: http://localhost:3000
- Frontend: http://localhost (nginx)

## Seed admin user

```bash
docker compose exec backend npm run seed
```

Default admin credentials (from seed):
- Email: `admin@example.com`
- Password: `admin12345`

## Notes

- SQLite DB path in containers is controlled by `SQLITE_DB_PATH` (see `docker-compose.yml`).
