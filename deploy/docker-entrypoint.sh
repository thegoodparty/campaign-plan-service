#!/bin/sh
set -e


if [ -z "$DB_HOST" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_USER" ] || [ -z "$DB_NAME" ]; then
  echo "One or more required DB environment variables are not set"
  exit 1
fi

export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:${DB_PORT:-5432}/$DB_NAME"

echo "Waiting for database to be ready..."

# Retry logic for database connection (important for Aurora Serverless v2 which takes time to wake up)
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  echo "Attempting database connection (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)..."

  if ./node_modules/.bin/prisma migrate deploy --schema=prisma/schema/schema.prisma 2>&1; then
    echo "✅ Migrations completed successfully."
    break
  else
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
      echo "⏳ Database not ready yet. Retrying in 10s..."
      sleep 10
    else
      echo "❌ ERROR: Failed to connect to database after $MAX_RETRIES attempts."
      exit 1
    fi
  fi
done

exec node -r ./newrelic.js dist/src/main