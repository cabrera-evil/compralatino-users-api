#!/bin/sh
# Apply pending migrations and seed (idempotent upserts) before starting the app.
set -e
export PATH="$PWD/node_modules/.bin:$PATH"
export TS_NODE_TRANSPILE_ONLY=true
prisma migrate deploy
prisma db seed
exec "$@"
