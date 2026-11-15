#!/usr/bin/env bash
# Aegis online database backup. Uses sqlite3 ".backup" when available (consistent
# snapshot), else a file copy. Backups land in data/backups/ with a timestamp.
# Usage: scripts/backup.sh [path-to-aegis.db]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB="${1:-$ROOT/data/aegis.db}"
DEST_DIR="$ROOT/data/backups"
mkdir -p "$DEST_DIR"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="$DEST_DIR/aegis-$TS.db"

if [ ! -f "$DB" ]; then echo "no database at $DB"; exit 1; fi

if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DB" ".backup '$DEST'" && echo "backup: $DEST (sqlite3 .backup)"
else
  cp -f "$DB" "$DEST" && echo "backup: $DEST (file copy — stop the service first for consistency)"
fi
