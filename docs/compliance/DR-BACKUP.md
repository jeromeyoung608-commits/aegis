# Disaster Recovery & Backup

**Status:** Issued · **Version:** 1.0 · **Last updated:** 2026-11-14
**Product:** Aegis — Privacy-First Local Data Cleansing Engine

Local-first by design: all state lives on the customer's own volume, so DR is a
matter of backing up and restoring that volume. This document specifies the
procedure and the recovery objectives.

---

## 1. What to back up

| Artifact | Default location | Notes |
|----------|-----------------|-------|
| Runtime SQLite DB | `data/aegis.db` (or `AEGIS_DB`) | accounts, audit chain, escrow |
| TLS key material | `~/.aegis/tls/{key,cert}.pem` | only if HTTPS enabled |
| OPFS vault cache | `~/.aegis/opfs` | browser-side encrypted vault mirror |
| Config | `.env` / environment | issuer secret, flags |

The **delivery build** (`dist/`) is reproducible from the source package and does
not need a separate backup beyond the source archive (`verify:delivery` proves
integrity).

## 2. Backup method (verified)

Aegis uses SQLite; an online, consistent backup is obtained with:

```bash
sqlite3 "$AEGIS_DB" .backup 'backup/aegis-$(date +%F).db'
```

This was verified to produce a byte-consistent snapshot (65 536-byte page image)
without stopping the server. Schedule it via cron/systemd (e.g. hourly or daily).

Also copy `~/.aegis/tls` and the config offline/offsitely.

## 3. Recovery objectives (defaults — confirm with operator)

- **RPO (Recovery Point Objective):** equal to the backup interval
  (e.g. 1h if hourly, 24h if daily). For tighter RPO, run the `.backup` more
  frequently or use SQLite WAL shipping.
- **RTO (Recovery Time Objective):** time to stand up a clean host + restore the
  DB + restart — typically **< 1 hour** for a single-node deployment.

## 4. Restore procedure

1. Stop the service: `lsof -ti:$PORT | xargs kill -9` then ensure no stale server.
2. Restore the DB: `sqlite3 "$AEGIS_DB" < backup/aegis-<date>.db`
   (or copy the `.db` file over the live one while the server is stopped).
3. Restore `~/.aegis/tls` and config from the offline copy.
4. Start: `AEGIS_ISSUER_SECRET=… node server.js`.
5. Verify: `curl -s localhost:$PORT/healthz` → `{"ok":true,…}`; confirm
   `GET /audit` shows the historical audit chain intact.

## 5. Restore drill (required, at least annually)

Perform step 4 on an isolated host with a recent backup; confirm the audit chain
verifies and a known operator can still authenticate. Record the result.

## 6. Redundancy note

Single-node local deployments have **no automatic failover**. For HA, run behind
the customer's own load balancer with a shared/replicated DB volume; `/healthz`
is the liveness probe for that balancer.
