# Render — Web Service (API backend)

Deploy the LinQi **Express + Socket.io** API to Render as a Web Service, using your Render PostgreSQL database.

## What Render runs

| Setting | Value |
|---------|--------|
| **Root directory** | Repository root (monorepo) |
| **Build command** | `pnpm run render:build` (frontend SPA + API) |
| **Start command** | `pnpm run render:start` |
| **Listen** | `0.0.0.0` on `process.env.PORT` (Render sets `PORT` automatically; fallback `3000`) |

The API exposes:

- REST: `/api/*`
- Socket.io: `/socket.io` (live driver GPS)
- Health: `/api/healthz`

---

## 1. Push code to GitHub

Ensure your repo is on GitHub with these files:

- `package.json` (`render:build`, `render:start`)
- `pnpm-lock.yaml`
- `artifacts/api-server/`

---

## 2. Create a Web Service on Render

1. Log in to [Render](https://render.com).
2. Click **New +** → **Web Service**.
3. Connect your **GitHub** account and select the **LinQi repository**.
4. Configure the service:

| Field | Value |
|-------|--------|
| **Name** | `linqi-api` (or any name) |
| **Region** | Same region as your Postgres DB (e.g. Oregon) |
| **Branch** | `main` (or your deploy branch) |
| **Root directory** | *(leave empty — repo root)* |
| **Runtime** | **Node** |
| **Build command** | `pnpm run render:build` (frontend SPA + API) |
| **Start command** | `pnpm run render:start` |
| **Instance type** | Free or Starter (free tier sleeps; WebSockets may disconnect when idle) |

Render detects `packageManager: pnpm@10.33.4` in `package.json` and uses pnpm.

---

## 3. Environment variables

In the Web Service → **Environment** tab, add:

| Key | Value | Notes |
|-----|--------|--------|
| `NODE_ENV` | `production` | Required for production mode |
| `DATABASE_URL` | Your Render Postgres **External** URL | From Render Postgres → **Connections** |
| `DATABASE_SSL` | `true` | If SSL errors occur without `sslmode` in URL |
| `SESSION_SECRET` | Long random string | JWT signing — **required** |
| `ALLOWED_ORIGINS` | `https://your-frontend.com` | Frontend URL(s), comma-separated (CORS + Socket.io) |
| `SKIP_DB_PUSH` | `true` (optional) | Skip background schema push entirely |
| `RUN_DB_PUSH` | `true` (optional) | On Render only: enable one background `drizzle-kit push` after listen |

**Do not set** `USE_LOCAL_DB` on Render.

### Link Postgres from the dashboard (optional)

Instead of pasting the URL manually:

1. Web Service → **Environment**
2. **Add from Render** → select your `linqi_db` PostgreSQL instance
3. Choose **External Database URL** (or Internal if API and DB are in the same Render project/region)

Use the **Internal** URL when both services are on Render (lower latency, no public egress).

---

## 4. Deploy

Click **Create Web Service** (or **Manual Deploy** → **Deploy latest commit**).

Watch **Logs**:

- `Server listening (HTTP + Socket.io)` with a port number
- No `DATABASE_URL must be set` errors

Test:

```bash
curl https://YOUR-SERVICE.onrender.com/api/healthz
```

Default admin (first boot, empty `users` table):

- Username: `admin`
- Password: `admin123` — **change immediately**

---

## 5. Connect the frontend

If the React app is hosted separately (Cloudflare Pages, Vercel, etc.):

**Build-time env:**

```env
VITE_API_URL=https://YOUR-SERVICE.onrender.com
```

Socket.io and `/api` calls will target the Render API.

If frontend and API share the same origin, leave `VITE_API_URL` unset and serve the SPA from the API (Docker / VPS setup).

---

## Optional: `render.yaml` (Blueprint)

This repo includes `render.yaml` for one-click Blueprint deploy. You can use **New +** → **Blueprint** and point at the repo, or create the Web Service manually as above.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| **drizzle-kit push failed on startup** | Push is **non-blocking**. On Render it is **skipped by default**. Set `RUN_DB_PUSH=true` only when you need a one-time schema sync, or run `pnpm --filter @workspace/db run push` from a shell with `DATABASE_URL` + `DATABASE_SSL=true`. |
| **No open ports / Port scan timeout** | Ensure Start command is `pnpm run render:start` (binds `0.0.0.0:$PORT`). Check logs for `Server listening`. Set `SESSION_SECRET` and `DATABASE_URL`. |
| Build fails on `pnpm` | Ensure `pnpm-lock.yaml` is committed; Render uses `packageManager` field |
| `DATABASE_URL must be set` | Add `DATABASE_URL` in Environment; redeploy |
| SSL / connection errors | Set `DATABASE_SSL=true` or use URL with `?sslmode=require` |
| CORS / Socket blocked | Set `ALLOWED_ORIGINS` to your exact frontend origin (no trailing slash) |
| Service sleeps (free tier) | Upgrade to Starter or use a uptime ping; WebSockets drop when instance sleeps |

### Port binding (Render)

Render injects `PORT` automatically. The API listens on:

```text
0.0.0.0:${PORT}
```

Health check path: `/api/healthz`

Do **not** hardcode port `5001` / `8080` in the Start command. Do **not** use the Docker entrypoint for Native Node deploys (`render:start` starts Node directly).

---

## Local parity

```bash
export DATABASE_URL="postgresql://..."
export SESSION_SECRET="local-dev-secret"
export NODE_ENV=production
export PORT=3000
pnpm run render:build
pnpm run render:start
```

Server listens on `http://0.0.0.0:3000` unless `PORT` is set (Render sets this automatically).
