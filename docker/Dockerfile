# ── Build stage ────────────────────────────────────────────────────────────────
FROM node:22-alpine3.23 AS builder

RUN apk add --no-cache \
  libc6-compat \
  openssl \
  ca-certificates \
  curl

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci --legacy-peer-deps \
  && npx prisma generate --schema=prisma/schema/schema.prisma \
  && npm prune --omit=dev \
  && npm cache clean --force

# ── Production stage ───────────────────────────────────────────────────────────
FROM node:22-alpine3.23 AS production

RUN apk add --no-cache \
  libc6-compat \
  openssl \
  ca-certificates \
  curl

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

COPY dist ./dist

ENV NODE_ENV=production

COPY docker/docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

USER node

ENTRYPOINT ["./docker-entrypoint.sh"]