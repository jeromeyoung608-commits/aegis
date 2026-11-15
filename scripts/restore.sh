#!/usr/bin/env bash
# Aegis database restore. Stops the service, replaces data/aegis.db with the chosen
# backup, then restarts. Usage: scripts/restore.sh <backup.db> [path-to-aegis.db]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP="${1:?usage: restore.sh <backup.db>}"
DB="${2:-$ROOT/data/aegis.db}"
if [ ! -f "$BACKUP" ]; then echo "backup not found: $BACKUP"; exit 1; fi

# Stop the service if running (systemd / docker / foreground).
if systemctl is-active --quiet aegis 2>/dev/null; then systemctl stop aegis; fi
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^aegis$'; then docker stop aegis; fi

mkdir -p "$(dirname "$DB")"
cp -f "$BACKUP" "$DB" && echo "restored $DB from $BACKUP"

if systemctl is-enabled --quiet aegis 2>/dev/null; then systemctl start aegis; fi
if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q '^aegis$'; then docker start aegis; fi
echo "done — verify with: curl -fsS http://127.0.0.1:8080/healthz"
