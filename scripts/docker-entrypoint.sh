#!/bin/sh
# Production entrypoint (Docker / VPS). Must not block forever — Render/DO
# health checks require the HTTP process to bind process.env.PORT quickly.
set -e

cd /app

PORT="${PORT:-10000}"
export PORT

MAX_ATTEMPTS="${PG_WAIT_MAX_ATTEMPTS:-30}"
SKIP_WAIT="${SKIP_PG_WAIT:-false}"

resolve_pg_host() {
  if [ -n "${PGHOST}" ]; then
    echo "${PGHOST}"
    return
  fi
  if [ -n "${DATABASE_URL}" ]; then
    # postgresql://user:pass@host:port/db  or  postgresql://user:pass@host/db
    echo "${DATABASE_URL}" | sed -E 's|^[a-zA-Z0-9+.-]+://([^@/]+@)?([^:/?]+).*|\2|'
    return
  fi
  echo "postgres"
}

resolve_pg_port() {
  if [ -n "${PGPORT}" ]; then
    echo "${PGPORT}"
    return
  fi
  if [ -n "${DATABASE_URL}" ]; then
    parsed=$(echo "${DATABASE_URL}" | sed -nE 's|^[a-zA-Z0-9+.-]+://([^@/]+@)?[^:/?]+:([0-9]+).*|\2|p')
    if [ -n "${parsed}" ]; then
      echo "${parsed}"
      return
    fi
  fi
  echo "5432"
}

wait_for_postgres() {
  if [ "${SKIP_WAIT}" = "true" ] || [ "${RENDER}" = "true" ]; then
    echo "[entrypoint] Skipping Postgres wait (SKIP_PG_WAIT or RENDER)"
    return 0
  fi

  if [ -z "${DATABASE_URL}" ] && [ -z "${PGHOST}" ]; then
    echo "[entrypoint] No DATABASE_URL/PGHOST — skipping Postgres wait"
    return 0
  fi

  HOST="$(resolve_pg_host)"
  PG_PORT="$(resolve_pg_port)"
  USER="${PGUSER:-linqi}"
  DB="${PGDATABASE:-linqi}"

  echo "[entrypoint] Waiting for PostgreSQL at ${HOST}:${PG_PORT} (max ${MAX_ATTEMPTS} attempts)..."
  attempt=1
  while [ "${attempt}" -le "${MAX_ATTEMPTS}" ]; do
    if pg_isready -h "${HOST}" -p "${PG_PORT}" -U "${USER}" -d "${DB}" >/dev/null 2>&1; then
      echo "[entrypoint] PostgreSQL is ready"
      return 0
    fi
    echo "[entrypoint] Postgres not ready (attempt ${attempt}/${MAX_ATTEMPTS})..."
    attempt=$((attempt + 1))
    sleep 2
  done

  echo "[entrypoint] WARNING: PostgreSQL wait timed out after ${MAX_ATTEMPTS} attempts — starting HTTP server anyway"
  return 0
}

wait_for_postgres

if [ -n "${DATABASE_URL}" ] && [ "${SKIP_DB_PUSH}" != "true" ]; then
  echo "[entrypoint] Applying database schema (drizzle push)..."
  # Do not abort container start if push fails (DB may still be warming up)
  pnpm --filter @workspace/db run push \
    || echo "[entrypoint] WARNING: schema push failed — API will still start"
fi

echo "[entrypoint] Starting API on 0.0.0.0:${PORT}..."
cd /app/artifacts/api-server
exec node --enable-source-maps dist/index.mjs
