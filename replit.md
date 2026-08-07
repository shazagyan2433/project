# سیستەمی فرۆشتن و قەرزەکان (LinQi POS)

A Kurdish-language Point of Sale and debt-management platform. Supports Kurdish, Arabic, and English. Built as a pnpm monorepo.

## Stack

- **Frontend**: React + Vite + Tailwind CSS (`artifacts/kurdish-pos`)
- **API**: Express + Socket.io (`artifacts/api-server`)
- **Database**: PostgreSQL via Drizzle ORM (`lib/db`)
- **Shared libs**: `lib/api-spec`, `lib/api-zod`, `lib/api-client-react`

## Running the project

Two workflows must be running:

| Workflow | Command |
|---|---|
| `artifacts/kurdish-pos: web` | `pnpm --filter @workspace/kurdish-pos run dev` |
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` |

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes (production) | PostgreSQL connection string from your Replit database |
| `DATABASE_SSL` | No | Set to `true` for Supabase/Render/Railway/Replit Postgres |
| `SESSION_SECRET` | Yes | JWT/session signing secret (any long random string) |
| `PORT` | Yes | Set automatically by Replit |
| `USE_LOCAL_DB` | No | Local dev only — enables PGlite file DB when `DATABASE_URL` is unset |
| `PGLITE_DATA_DIR` | No | Local dev — directory for PGlite files (default: `.data/linqi-pglite`) |

### Replit Secrets (Tools → Secrets)

1. **Provision PostgreSQL** in Replit (Database tool) if you have not already.
2. Open **Secrets** and add:
   - **`DATABASE_URL`** — copy the Postgres connection string from Replit’s Database panel (often named `DATABASE_URL` when you connect the database to the repl).
   - **`SESSION_SECRET`** — e.g. a 32+ character random string.
3. Optional: **`DATABASE_SSL`** = `true` if your provider requires SSL (most hosted Postgres on Replit do).
4. Restart the **API Server** workflow after saving secrets.

The API seeds a default admin on first boot:
- **Username**: `admin`
- **Password**: `admin123`

### Local development (no Postgres installed)

From the repo root, `pnpm dev` runs the API with **`USE_LOCAL_DB=true`**, which creates a file-based PGlite database in `.data/linqi-pglite` and syncs the schema automatically. You do **not** need to set `DATABASE_URL` locally unless you want to use a real Postgres instance.

## Database setup

Run schema push once after provisioning the database:

```bash
cd lib/db && pnpm run push
```

The API server auto-seeds a default admin on first boot:
- **Username**: `admin`
- **Password**: `admin123`

## Project structure

```
artifacts/
  kurdish-pos/     # React frontend
  api-server/      # Express API + Socket.io
  mockup-sandbox/  # Design/component preview server
lib/
  db/              # Drizzle schema + migrations
  api-spec/        # Shared API type definitions
  api-zod/         # Zod validators
  api-client-react/# React query hooks
```

## User preferences

- Keep the project's existing monorepo structure.
- Use `pnpm` for all package management.
