---
name: Workspace Bootstrap
description: How to set up the pnpm monorepo so the artifact workflows can run.
---

The project is a pnpm monorepo. The canonical source lives in `zip-repl/`, but the artifact system runs workflows from the project root (`/home/runner/workspace/`).

**Why this matters:** Workflow commands like `pnpm --filter @workspace/api-server run dev` run from root, but `pnpm-workspace.yaml` is inside `zip-repl/`. On a fresh environment, pnpm and Node.js are not installed, and the root has no workspace config.

**How to apply (fresh environment):**
1. Install Node.js: `installProgrammingLanguage({ language: "nodejs-20" })`
2. Install pnpm: `npm install -g pnpm`
3. Create root `pnpm-workspace.yaml` (copy from `zip-repl/pnpm-workspace.yaml`, pointing to `artifacts/*`, `lib/*`, `lib/integrations/*`)
4. Create root `package.json` (minimal workspace root)
5. Create root `tsconfig.base.json` (copy content from `zip-repl/tsconfig.base.json` — must be a real file, not a symlink, as Vite's tsconfig parser does not follow symlinks)
6. Copy `zip-repl/lib/` to root `lib/` (not symlink — same reason)
7. Run `pnpm install` from root
8. Run drizzle push: `cd zip-repl && pnpm --filter @workspace/db run push`

**Database:** `DATABASE_URL` is already set in env. Replit's `checkDatabase()` returns `provisioned: false` because it's not a Replit-managed DB, but the connection works fine.

**Frontend PORT:** The artifact system injects `PORT` and `BASE_PATH` env vars automatically. Vite reads these; do not hardcode port 5000.
