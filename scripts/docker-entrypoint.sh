#!/bin/sh
set -e

cd /app

echo "[entrypoint] Waiting for PostgreSQL..."
until pg_isready -h "${PGHOST:-postgres}" -p "${PGPORT:-5432}" -U "${PGUSER:-linqi}" -d "${PGDATABASE:-linqi}" >/dev/null 2>&1; do
  sleep 2
done
echo "[entrypoint] PostgreSQL is ready"

if [ -n "${DATABASE_URL}" ]; then
  echo "[entrypoint] Applying database schema (drizzle push)..."
  pnpm --filter @workspace/db run push
fi

echo "[entrypoint] Starting API + frontend server..."
cd /app/artifacts/api-server
exec node --enable-source-maps dist/index.mjs
