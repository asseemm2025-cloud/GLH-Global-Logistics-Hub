#!/usr/bin/env sh
set -eu
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${1:?Usage: scripts/restore-postgres.sh backup.sql.gz}"
echo "WARNING: this replaces database contents. Press Ctrl+C within 5 seconds to cancel."
sleep 5
gunzip -c "$1" | psql "$DATABASE_URL"
echo "Restore completed."
