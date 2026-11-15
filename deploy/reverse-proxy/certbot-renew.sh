#!/usr/bin/env bash
# Renew Let's Encrypt certs and reload nginx. Run from certbot's deploy hook or a
# daily cron. Requires certbot + the nginx config above (server_name matching).
set -euo pipefail
DOMAIN="${AEGIS_DOMAIN:-aegis.example}"
CERTBOT="${CERTBOT_BIN:-certbot}"
"$CERTBOT" renew --quiet --webroot -w /var/www/certbot
if "$CERTBOT" certificates 2>/dev/null | grep -q "$DOMAIN"; then
  nginx -s reload || systemctl reload nginx
  echo "renewed + reloaded for $DOMAIN"
else
  echo "no certificate yet for $DOMAIN — run: $CERTBOT certonly --webroot -w /var/www/certbot -d $DOMAIN"
fi
