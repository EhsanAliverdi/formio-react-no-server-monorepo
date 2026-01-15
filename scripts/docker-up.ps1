Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Set-Location -Path (Split-Path -Parent $PSScriptRoot)

# Workaround for occasional Docker Desktop/BuildKit EOF errors when Compose uses Bake.
# See README Troubleshooting for details.
$env:COMPOSE_BAKE = 'false'

Write-Host "Building + starting services..." -ForegroundColor Cyan

docker compose up -d --build

docker compose ps
