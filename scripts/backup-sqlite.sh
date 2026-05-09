#!/usr/bin/env bash
# backup-sqlite.sh — Back up the SQLite database with date-stamped filename.
# Usage: ./scripts/backup-sqlite.sh [path/to/sqlite.db]

set -euo pipefail

DB_PATH="${1:-./data/sqlite.db}"
BACKUP_DIR="C:/Users/airet/workspaces/4lt7ab/projects/backups"
DATE=$(date +%Y-%m-%d)
BACKUP_FILE="${BACKUP_DIR}/sqlite-backup-${DATE}.db"
KEEP=7

# Verify source exists
if [ ! -f "$DB_PATH" ]; then
  echo "ERROR: Database not found at ${DB_PATH}"
  exit 1
fi

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Back up using sqlite3 .backup if available, otherwise plain copy
if command -v sqlite3 &>/dev/null; then
  echo "Using sqlite3 .backup command..."
  sqlite3 "$DB_PATH" ".backup '${BACKUP_FILE}'"
else
  echo "sqlite3 not found, falling back to file copy..."
  cp "$DB_PATH" "$BACKUP_FILE"
fi

echo "Backup created: ${BACKUP_FILE}"

# Prune old backups, keep only the most recent $KEEP
OLD_BACKUPS=$(ls -1t "${BACKUP_DIR}"/sqlite-backup-*.db 2>/dev/null | tail -n +$((KEEP + 1)))
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
