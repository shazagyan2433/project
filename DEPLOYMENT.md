# DigitalOcean VPS deployment (single server)

Deploy the full LinQi stack — **React frontend**, **Express API + Socket.io**, and **PostgreSQL** — on one DigitalOcean Droplet using Docker Compose.

## What runs

| Service | Role |
|---------|------|
| `app` | Node.js: API (`/api`), Socket.io (`/socket.io`), and static SPA |
| `postgres` | PostgreSQL 16 with persistent volume |

One process serves everything on port **80** (configurable via `APP_PORT`).

---

## Prerequisites

- A DigitalOcean Droplet (Ubuntu 22.04/24.04, **2 GB RAM** minimum recommended)
- SSH access to the droplet
- This repository on the server (git clone or copy)

---

## 1. Prepare the Droplet

SSH into your droplet:

```bash
ssh root@YOUR_DROPLET_IP
```

Install Docker and Compose plugin:

```bash
apt-get update
apt-get install -y ca-certificates curl git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

---

## 2. Pull the project

```bash
cd /opt
git clone YOUR_REPO_URL linqi
cd linqi
```

Or upload/copy the project folder to `/opt/linqi`.

---

## 3. Configure environment

```bash
cp .env.docker.example .env
nano .env
```

Set at minimum:

- `POSTGRES_PASSWORD` — strong database password
- `SESSION_SECRET` — long random string (JWT signing)
- `APP_PORT` — `80` for public HTTP (or another port)

---

## 4. Build and start

```bash
docker compose up -d --build
```

First startup:

1. Waits for PostgreSQL
2. Runs `drizzle push` to create tables
3. Starts the Node server on port 8080 inside the container (mapped to `APP_PORT`)

Check status:

```bash
docker compose ps
docker compose logs -f app
```

You should see:

- `Serving frontend static files`
- `Server listening (HTTP + Socket.io)`

---

## 5. Open the app

Visit in your browser:

```
http://YOUR_DROPLET_IP/
```

Admin dashboard:

```
http://YOUR_DROPLET_IP/admin/dashboard
```

Default admin (created on first boot if no users exist):

- Username: `admin`
- Password: `admin123`

**Change this password immediately** after first login.

API health check:

```bash
curl http://YOUR_DROPLET_IP/api/healthz
```

---

## Useful commands

```bash
# Stop
docker compose down

# Rebuild after code changes
docker compose up -d --build

# View logs
docker compose logs -f

# Reset database (destructive)
docker compose down -v
docker compose up -d --build
```

---

## Firewall (recommended)

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw enable
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `connection refused` on port 80 | `docker compose ps` — ensure `app` is running; check `APP_PORT` in `.env` |
| Database errors on startup | `docker compose logs postgres` — verify credentials match `.env` |
| Blank page / old assets | Rebuild: `docker compose up -d --build` |
| Socket.io / GPS not connecting | App must be same-origin (no separate `VITE_API_URL` in Docker build); check browser console |

---

## Architecture notes

- Frontend is built into `artifacts/kurdish-pos/dist/public` and served by Express in production.
- API and Socket.io share one HTTP server — required for live driver GPS tracking.
- Do **not** set `USE_LOCAL_DB` in production; PostgreSQL is used via `DATABASE_URL`.
