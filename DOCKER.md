# Development and Production Docker Workflows

This project supports two distinct Docker workflows:

## 🚀 Development Mode (Default)

Development mode uses hot reload for both frontend and backend. Code changes are reflected immediately without rebuilding Docker images.

### Quick Start

```bash
# Start everything in development mode
docker compose up

# Or with detached mode
docker compose up -d
```

### What Happens in Dev Mode

- **Backend (Next.js)**: Runs `npm run dev` with Fast Refresh enabled
- **Frontend (Vite)**: Runs `npm run dev` with HMR enabled
- **Source Code**: Mounted as bind mounts from your host
- **node_modules**: Preserved in named Docker volumes (not from host)
- **No Rebuilds**: Change code and see updates instantly

### Development URLs

- Frontend: http://localhost:5174 (Vite dev server)
- Backend: http://localhost:3000
- MinIO Console: http://localhost:9003
- PostgreSQL: localhost:5432

> **Note:** The frontend uses port 5174 in development to avoid conflicts with the base production config which maps port 5173 to nginx (port 80).

**Container Names:** All dev containers have `-dev` suffix (e.g., `surveyflow-backend-dev`, `surveyflow-frontend-dev`)

### Stopping

```bash
docker compose down
```

### Rebuilding (Only if dependencies change)

```bash
# Rebuild images (e.g., after changing package.json)
docker compose build

# Or rebuild and start
docker compose up --build
```

## 📦 Production Mode

Production mode builds optimized, immutable Docker images suitable for deployment.

### Building for Production

```bash
# Build production images
docker compose -f docker-compose.yml build

# Or start production containers
docker compose -f docker-compose.yml up
```

### What Happens in Prod Mode

- **Backend**: Built with `npm run build`, runs `next start`
- **Frontend**: Built with `npm run build`, served via nginx
- **Source Code**: Copied into image at build time
- **Immutable**: Images contain everything, no external mounts
- **Optimized**: Production builds with minification, etc.

### Production URLs

- Frontend: http://localhost:8080 (nginx serves on port 80, mapped to 8080)
- Backend: http://localhost:3001
- MinIO Console: http://localhost:9005
- PostgreSQL: localhost:5433

**Container Names:** All prod containers have `-prod` suffix (e.g., `surveyflow-backend-prod`, `surveyflow-frontend-prod`)

> **Note:** Production uses different ports than development, allowing both to run simultaneously.

## 🛠️ How It Works

### File Structure

```
├── docker-compose.yml              # Base configuration (production)
├── docker-compose.override.yml     # Development overrides (auto-applied)
├── Dockerfile.backend              # Production backend build
├── Dockerfile.backend.dev          # Development backend (dependencies only)
├── Dockerfile.frontend             # Production frontend build
└── Dockerfile.frontend.dev         # Development frontend (dependencies only)
```

### Development Override Behavior

Docker Compose automatically merges `docker-compose.override.yml` with `docker-compose.yml`.

The override file:
- Uses `*.dev` Dockerfiles
- Mounts source code as volumes
- Preserves `node_modules` in named volumes
- Runs dev servers instead of production servers

### To Disable Development Mode

```bash
# Option 1: Use only the base compose file
docker compose -f docker-compose.yml up

# Option 2: Rename the override file
mv docker-compose.override.yml docker-compose.override.yml.disabled
docker compose up
```

### Running Both Dev and Production Simultaneously

You can run both development and production environments at the same time! They use different container names, ports, and project names:

**Development (with override):**
```bash
docker compose up -d
```
- Project: `surveyflow-dev`
- Containers: `surveyflow-*-dev`
- Frontend: http://localhost:5174
- Backend: http://localhost:3000
- Postgres: localhost:5432
- MinIO: localhost:9002, console at 9003

**Production (without override, using .env.prod):**
```bash
docker compose -p surveyflow-prod --env-file .env.prod -f docker-compose.yml up -d
```
- Project: `surveyflow-prod`  
- Containers: `surveyflow-*-prod`
- Frontend: http://localhost:8080
- Backend: http://localhost:3001
- Postgres: localhost:5433
- MinIO: localhost:9004, console at 9005

Both environments use separate Docker Compose projects, containers, and ports, so they won't conflict!

**VS Code Tasks**: Use "Docker: Start Dev Mode" and "Docker: Start Production" tasks to start both environments.

## 🔧 Troubleshooting

### Hot Reload Not Working on Windows/WSL?

Enable polling in `.env`:

```env
CHOKIDAR_USEPOLLING=true
WATCHPACK_POLLING=true
```

Then restart:

```bash
docker compose restart frontend backend
```

### Port Conflicts

If ports 3000 or 5173 are already in use, override them in `.env`:

```env
FRONTEND_PORT=5174
BACKEND_PORT=3001
```

### Node Modules Conflicts

If you have `node_modules` on your host and experience issues:

```bash
# Remove host node_modules
rm -rf frontend/node_modules backend/node_modules

# Rebuild containers
docker compose build
docker compose up
```

### Prisma Schema Changes

After changing `backend/prisma/schema.prisma`:

```bash
# Regenerate client
docker compose exec backend npx prisma generate

# Apply migrations
docker compose exec backend npx prisma db push
```

Or restart the backend (it runs `prisma generate` on startup in dev mode).

## 📋 Common Commands

```bash
# Development mode (default)
docker compose up                    # Start dev servers
docker compose up -d                 # Start in background
docker compose logs -f backend       # View backend logs
docker compose logs -f frontend      # View frontend logs
docker compose restart backend       # Restart backend only
docker compose down                  # Stop all containers

# Production mode
docker compose -f docker-compose.yml up --build

# Database operations
docker compose exec backend npx prisma db push
docker compose exec backend npm run seed

# Clean up
docker compose down -v              # Stop and remove volumes
docker system prune -a              # Remove all unused Docker resources
```

## 🎯 VS Code Integration

Use the provided tasks in `.vscode/tasks.json`:

- **Docker: Compose Up (Dev)** - Start development mode
- **Docker: Compose Up Frontend** - Start frontend only
- **Docker: Compose Up Backend** - Start backend only
- **Docker: Compose Down** - Stop all containers
- **Docker: Rebuild Dev** - Rebuild development images

Access tasks: `Ctrl+Shift+P` → "Tasks: Run Task"
