#!/bin/sh
set -e


if [ -z "$DB_HOST" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_USER" ] || [ -z "$DB_NAME" ]; then
  echo "One or more required DB environment variables are not set"
  exit 1
fi

export DATABASE_URL="$(node -e '
  const u = encodeURIComponent(process.env.DB_USER || "");
  const p = encodeURIComponent(process.env.DB_PASSWORD || "");
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || "5432";
  const db = process.env.DB_NAME;
  process.stdout.write(`postgresql://${u}:${p}@${host}:${port}/${db}`);
')"

# If using RDS/Aurora TLS (recommended), enable:
export DATABASE_URL="${DATABASE_URL}?sslmode=require"

echo "Waiting for database to be ready..."

# Retry logic for database connection (important for Aurora Serverless v2 which takes time to wake up)
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  echo "Attempting database connection (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)..."

  if ./node_modules/.bin/prisma migrate deploy --schema=prisma/schema/schema.prisma 2>&1; then
    echo "✅ Migrations completed successfully."
    break
  fi

RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ "$RETRY_COUNT" -lt "$MAX_RETRIES" ]; then
    # small jitter to reduce stampede on deploy
    JITTER=$(node -e 'process.stdout.write(String(8 + Math.floor(Math.random()*5)))')
    echo "⏳ Not ready yet. Retrying in ${JITTER}s..."
    sleep "$JITTER"
  else
    echo "❌ ERROR: Failed after $MAX_RETRIES attempts."
    exit 1
  fi
done

exec node dist/src/main