<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/SOC2-EVIDENCE.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# SOC 2 Bereitschaft — Control Mapping & Beweis

**Status:** Bereitschaft Beweis (self-assessment) · **Version:** 1.0 · **Letzte aktualisiert:** 2026-11-14
**Produkt:** Aegis — Privacy-first Lokal Daten Bereinigung Engine

> Dies Dokument ist **nicht** ein SOC 2 Bericht oder certification. Es ist ein Bereitschaft
> Karte showing, für jeder Vertrauen Services Criterion (TSC), was ist implementiert und
> wo ein auditor würde find Beweis. Lücken sind called außer ausdrücklich.

## Common Kriterien (Sicherheit — CC)

| TSC | Control theme | Implementiert | Beweis |
|-----|--------------|-----------|----------|
| CC1 | Control Umgebung / governance | Partial | `docs/compliance/` (policies), `README` Gate Tabelle |
| CC2 | Communication & Information | Ja | Bediener Konsole; Audit Export |
| CC3 | Risiko assessment | Partial | `docs/compliance/THREAT-MODEL.md`, `CRA-NIS2.md` |
| CC4 | Überwachung | Ja | Hash-verkettet Audit Protokoll; `GET /healthz` liveness Sonde |
| CC5 | Control activities | Ja | Bearer auth + TTL; Anmeldung throttling; manipulationserkennbar Audit; path-traversal guards |
| CC6 | Logical Zugriff | Ja | Hashed Zugangsdaten; operator/issuer scopes; Sitzung TTL; failed-login throttle |
| CC7 | System Betrieb | Ja | Backup/restore (`sqlite3 .backup`); freshness-checked Lieferung packer |
| CC8 | Änderung management | Partial | Feature-flag gating; ff-only merges; Release Checkliste |
| CC9 | Risiko mitigation | Partial | Bedrohung Modell; kein Standard Ausgang |

## Additional TSC

- **Verfügbarkeit (Ein):** `GET /healthz` Bereitschaft; dokumentiert backup/restore;
  port-collision fail-fast Start. _Gap:_ kein dokumentiert RTO/RPO SLA noch.
- **Confidentiality (C):** Verschlüsselung bei Rest (Tresor); Zero-Knowledge Identität;
  kein Drittanbieter Ausgang durch Standard.
- **Verarbeitung Integrität (PI):** Hash-verkettet Audit; RFC3161 Adapter mit
  fail-open Rückfallebene zu lokal Zeit. _Gap:_ formal PI Test Suite pending.
- **Privatsphäre (P):** `PRIVACY-POLICY.md`, `DPA.md`, `ROPA.md` (dies Ordner);
  GDPR Daten-subject Löschung implementiert.

## Auditor pointers

- Audit chain Prüfung: `GET /audit` + `GET /audit/export`; Integrität über
  in-repo `verifyAuditChain`.
- Anmeldung throttle: `server.js` pro IP + per-(IP,Benutzer) limiter (429 + lockout).
- Manipulationserkennbar Bediener Audit: `server/store.js` `eraseSubject` refuses protected
  Betroffene (HTTP 403).
- Lieferung Integrität: `scripts/package-delivery.mjs` SHA256 + source-freshness.

## Lücken geschlossen (dies Runde)

| # | Gap | Status | Beweis |
|---|-----|--------|----------|
| 1 | Formal access-review Verfahren & recertification | **Geschlossen** | `ACCESS-REVIEW.md` (JML, quarterly recert, issuer-Geheimnis Rotation) |
| 2 | Dokumentiert incident-response runbook | **Geschlossen** | `INCIDENT-RESPONSE.md` (phases, SEV classes, GDPR 72h, manipulationserkennbar Audit forensics) |
| 3 | DR/backup RTO-RPO SLA + getestet wiederherstellen drill | **Geschlossen** | `DR-BACKUP.md` (`sqlite3 .backup` Methode, RTO/RPO defaults, wiederherstellen + jährlich drill) |
| 4 | Vendor / sub-Auftragsverarbeiter inventory | **Geschlossen** | `SUBCONTRACTOR-INVENTORY.md` (kein verpflichtend Laufzeit sub-Auftragsverarbeiter; 2 Opt-in Ausgang Punkte, aus durch Standard) |

Verbleibend für ein formal Audit (operational, nicht tooling): execute der erste
quarterly Zugriff Prüfung und der erste jährlich wiederherstellen drill, und haben Rechtsberatung
sign aus der rechtlich drafts (Privatsphäre Richtlinie / DPA / ROPA).
