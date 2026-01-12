# Corporate CA certificates (optional)

If your network does TLS interception (common on corporate Wi‑Fi/VPN), Docker builds may fail during `npm ci` with:

- `unable to get local issuer certificate`

To fix this securely, add your corporate root CA certificate(s) here and rebuild:

1. Export your corporate root CA as a PEM/CRT file (e.g. `corp-root-ca.crt`).
2. Put it in this folder: `backend/certs/corp-root-ca.crt`
3. Rebuild: `docker compose build backend`

The backend image copies `backend/certs/` into the system trust store and runs `update-ca-certificates`.

Temporary workaround (less secure): set `INSECURE_TLS=true` for the build (see `docker-compose.yml`).
