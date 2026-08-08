# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.33.4 --activate
WORKDIR /app

# ── Install dependencies ──────────────────────────────────────────────────────
FROM base AS deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY artifacts/api-server/package.json artifacts/api-server/
COPY artifacts/kurdish-pos/package.json artifacts/kurdish-pos/
COPY artifacts/mockup-sandbox/package.json artifacts/mockup-sandbox/
COPY lib/db/package.json lib/db/
COPY lib/api-zod/package.json lib/api-zod/
COPY lib/api-client-react/package.json lib/api-client-react/
COPY lib/api-spec/package.json lib/api-spec/
RUN pnpm install --frozen-lockfile

# ── Build frontend + backend ────────────────────────────────────────────────
FROM deps AS build
COPY . .
# Same-origin production: no VITE_API_URL (relative /api and Socket.io)
RUN pnpm --filter @workspace/kurdish-pos run build \
  && pnpm --filter @workspace/api-server run build

# ── Production image ────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production
# Render / cloud inject PORT at runtime — default matches common platform default
ENV PORT=10000

RUN corepack enable && corepack prepare pnpm@10.33.4 --activate \
  && apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=build /app/artifacts/api-server/package.json ./artifacts/api-server/package.json
COPY --from=build /app/artifacts/kurdish-pos/dist/public ./artifacts/kurdish-pos/dist/public
COPY --from=build /app/lib/db ./lib/db
COPY --from=build /app/lib/api-zod ./lib/api-zod
COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Document the default listen port; runtime always uses process.env.PORT
EXPOSE 10000

ENTRYPOINT ["docker-entrypoint.sh"]
# Explicit CMD so platforms that override ENTRYPOINT still know how to start
CMD []
