#!/usr/bin/env bash
# Start Postgres via Docker (same DB every time), wait for it, then run the backend.
# Usage: from repo root, ./backend/scripts/run-with-db.sh
# Or:    cd backend && ../backend/scripts/run-with-db.sh  (also works from backend)
set -e

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

echo "[qsme] Starting Postgres (Docker)..."
docker compose up -d db

echo "[qsme] Waiting for Postgres on localhost:5432..."
for i in {1..30}; do
  if (docker compose exec -T db pg_isready -U postgres -d qsme) >/dev/null 2>&1; then
    echo "[qsme] Postgres is ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "[qsme] Timeout waiting for Postgres." >&2
    exit 1
  fi
  sleep 1
done

# Backend runs with DATABASE_URL defaulting to postgresql+psycopg://postgres:postgres@localhost:5432/qsme
export DATABASE_URL="${DATABASE_URL:-postgresql+psycopg://postgres:postgres@localhost:5432/qsme}"
cd "$REPO_ROOT/backend"
export PYTHONPATH="$REPO_ROOT/backend${PYTHONPATH:+:$PYTHONPATH}"
echo "[qsme] Starting backend (uvicorn)..."
exec python -m uvicorn app.main:app --reload --host 0.0.0.0
