FROM node:22-alpine3.23

RUN apk add --no-cache \
  libc6-compat \
  openssl \
  ca-certificates \
  curl

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev --legacy-peer-deps \
  && npx prisma generate --schema=prisma/schema/schema.prisma \
  && npm cache clean --force

COPY dist ./dist

ENV NODE_ENV=production

COPY docker/docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

# Run as non-root (recommended)
USER node

ENTRYPOINT ["./docker-entrypoint.sh"]