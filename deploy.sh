#!/usr/bin/env bash
set -euo pipefail
# Requires Docker Compose. Local-only binding; configure a TLS proxy separately.
cd -- "$(dirname -- "$0")"
docker compose up --build -d
docker compose ps
printf 'OceanTwin local preview: http://127.0.0.1:8080\n'
