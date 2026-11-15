# Incident response runbook

## Detection
- Forward audit events to a SIEM (`audit.forwardUrl` in the console Config tab, or
  `CONFIG.audit.forwardUrl`); Aegis POSTs each event best-effort.
- Monitor `/metrics` (Prometheus): `aegis_audit_events_total`, `aegis_sessions_active`,
  `aegis_uptime_seconds`.

## Triage (first 1 hour)
1. Identify the event from the audit trail (console → Audit, or `/audit` query).
2. If a credential is suspected compromised: rotate the issuer secret
   (RUNBOOK-KEY-ROTATION) and revoke the operator session (console → Sessions).
3. If a data subject is affected: use the Data subjects tab to export (DSAR) and, if
   required, erase (Art.17) — the operator/system trail stays intact (B-04).

## Breach notification (GDPR Art.33/34)
- Use the console Config tab → "Send incident test" to validate the notification
  channel, then trigger the real notification to your DPO + supervisory authority
  within 72h of awareness (Art.33) / without undue delay for high-risk (Art.34).
- Keep the Aegis audit log as the evidence of containment actions.

## Recovery
- Restore the database from a backup if corrupted: `scripts/restore.sh <backup.db>`,
  or download via the console (Config → Download DB backup).
- Re-run the delivery gate (`npm run verify:delivery`) after any rebuild.

## Post-incident
- Update RUNBOOK-KEY-ROTATION and THREAT-MODEL; add detections for the failure mode.
- Record the timeline in the audit trail (it is append-only by design).
