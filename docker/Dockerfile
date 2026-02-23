FROM node:22-alpine3.23

RUN apk add --no-cache \
  libc6-compat \
  openssl \
  ca-certificates \
  curl

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps \
  && npm cache clean --force

COPY node_modules/.prisma ./node_modules/.prisma
COPY dist ./dist
COPY prisma ./prisma

# Copy seed and src for tsx runtime seeding (preview environments only)
ARG INCLUDE_SEED=false
COPY seed ./seed
COPY src ./src
COPY tsconfig.json .
RUN if [ "$INCLUDE_SEED" != "true" ]; then rm -rf ./seed ./src ./tsconfig.json; fi

ENV NODE_ENV=production

COPY deploy/docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

# Run as non-root (recommended)
USER node

ENTRYPOINT ["./docker-entrypoint.sh"]