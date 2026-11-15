<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/INCIDENT-RUNBOOK.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Vorfall Antwort runbook

## Erkennung
- Forward Audit Ereignisse zu ein SIEM (`audit.forwardUrl` in Konsole Konfiguration Registerkarte, oder
  `CONFIG.audit.forwardUrl`); Aegis POSTs jeder Ereignis best-effort.
- Monitor `/metrics` (Prometheus): `aegis_audit_events_total`, `aegis_sessions_active`,
  `aegis_uptime_seconds`.

## Triage (erste 1 Stunde)
1. Identify Ereignis von Audit-Trail (Konsole → Audit, oder `/audit` query).
2. Wenn ein credential ist suspected kompromittiert: rotieren Aussteller Geheimnis
   (RUNBOOK-Schlüssel-ROTATION) und revoke Bediener Sitzung (Konsole → Sitzungen).
3. Wenn ein betroffene Person ist affected: verwenden Daten Betroffene Registerkarte zu Export (DSAR) und, wenn
   erforderlich, erase (Art.17) — der operator/system trail bleibt unversehrt (B-04).

## Verstoß Benachrichtigung (GDPR Art.33/34)
- Verwenden Konsole Konfiguration Registerkarte → "Senden Vorfall Test" zu validate Benachrichtigung
  Kanal, dann Auslöser der echt Benachrichtigung zu Ihr DPO + Aufsichtsbehörde
  innerhalb 72h von awareness (Art.33) / ohne undue delay für high-risk (Art.34).
- Behalten Aegis Audit Protokoll as Beweis von containment Aktionen.

## Wiederherstellung
- Wiederherstellen Datenbank von ein Sicherung wenn corrupted: `scripts/restore.sh <backup.db>`,
  oder Herunterladen über Konsole (Konfiguration → Herunterladen DB Sicherung).
- Re-run Lieferung Gate (`npm run verify:delivery`) nach irgendein rebuild.

## Post-incident
- Aktualisierung RUNBOOK-Schlüssel-ROTATION und THREAT-MODEL; hinzufügen detections für Fehler Modus.
- Datensatz Zeitleiste in Audit-Trail (es ist nur-appendierbar durch Entwurf).
