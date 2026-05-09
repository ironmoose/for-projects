#!/usr/bin/env bash
# backup-postgres.sh — Back up Postgres via Docker with date-stamped filename.
# Usage: ./scripts/backup-postgres.sh

set -euo pipefail

CONTAINER="tab-projects-pg"
BACKUP_DIR="C:/Users/airet/workspaces/4lt7ab/projects/backups"
DATE=$(date +%Y-%m-%d)
BACKUP_FILE="${BACKUP_DIR}/pg-backup-${DATE}.sql"
KEEP=7

# Verify container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "ERROR: Container '${CONTAINER}' is not running."
  exit 1
fi

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Dump
echo "Dumping Postgres from ${CONTAINER}..."
docker exec "$CONTAINER" pg_dump -U tab_projects -d tab_projects --no-owner --no-acl > "$BACKUP_FILE"

echo "Backup created: ${BACKUP_FILE}"

# Prune old backups, keep only the most recent $KEEP
OLD_BACKUPS=$(ls -1t "${BACKUP_DIR}"/pg-backup-*.sql 2>/dev/null | tail -n +$((KEEP + 1)))
if [ -n "$OLD_BACKUPS" ]; then
  echo "Removing old backups:"
  echo "$OLD_BACKUPS" | while read -r f; do
    echo "  Deleting: $f"
    rm -f "$f"
  done
else
  echo "No old backups to prune (keeping last ${KEEP})."
fi

echo "Done."
