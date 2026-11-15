<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/SLA.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Service Ebene Vereinbarung (SLA) — Aegis

**Status:** Ausgestellt · **Version:** 1.0 · **Letzte aktualisiert:** 2026-11-14
**Modell:** selbst gehostet / Kunde-operated (Kunde besitzt Laufzeit)

## 0. Operational Kontakt

- **SLA Kontakt mailbox:** {{SLA_MAILBOX}}
- **Bediener timezone:** {{SLA_TIMEZONE}}

---

## 1. Umfang & Verantwortung split

Aegis ist zugestellt as **Software Kunde operates auf seiner eigen infrastructure**.
Daher Verfügbarkeit, Sicherung und Vorfall handling sind der **Kunde's**
operational Verantwortung, supported durch der vendor as described unten.

| Area | Kunde | Vendor |
|------|----------|--------|
| Host Verfügbarkeit / uptime | besitzt (ihrer VM/hardware) | — |
| Sicherung & wiederherstellen von Laufzeit Lautstärke | besitzt (Verfahren bereitgestellt) | Dokumente `sqlite3 .backup` + wiederherstellen drill |
| Sicherheit patching von der OS/Laufzeit | besitzt | liefert aus Abhängigkeit aktualisiert + advisories |
| Produkt Fehler / Ausfall causality | diagnoses mit vendor | bietet fixes pro Support tier |
| Verfügbarkeit Überwachung | besitzt | offenlegt `GET /healthz` Sonde |

## 2. Verfügbarkeit Ziel (Referenz)

Für ein single-node selbst gehostet Bereitstellung mit der dokumentiert Sicherung in place, der
Referenz Verfügbarkeit Ziel ist **99.5%** von scheduled uptime pro Monat
(ausschließt planned maintenance und Kunde-side infrastructure faults). Dies ist ein
**Ziel**, nicht ein contractual penalty sofern der commercial Vereinbarung states eine.

## 3. Support Antwort times (Referenz)

| Priority | Beispiel | Antwort Ziel |
|----------|---------|-------------------|
| P1 — SEV1 (Daten Verlust / Verstoß / exploited vuln) | bestätigt Verstoß, Tresor corruption | **4 hours** acknowledgement, continuous bis resolved |
| P2 — SEV2 (major Funktion defekt, kein Daten Verlust) | ein Modul schlägt fehl zu Last | 1 Geschäft Tag |
| P3 — SEV3 (degraded) | slow Export | 3 Geschäft Tage |
| P4 — SEV4 (cosmetic/doc) | Formulierung | nächste Release |

## 4. Überwachung

Der vendor supplies ein **liveness/readiness Sonde**: `GET /healthz` gibt zurück
`{ ok, uptimeSeconds, db, version, ts }` und kann sit hinter ein Last balancer. Der
Kunde wires alerts zu es.

## 5. Änderung management

Releases sind tagged und reproduzierbar; Lieferung Paket ist integrity-checked
(`verify:delivery`). Der Kunde Kontrollen wenn zu anwenden aktualisiert.

## 6. Exclusions

Der vendor macht **nicht** warrant uptime von Kunde-owned infrastructure, nor
Verfügbarkeit von Kunde-configured optional Integrationen (e.g. ein Drittanbieter
TSA). Force majeure gilt.

> Hinweis: ersetzt Antwort times, penalties und bestimmend Bedingungen mit der signiert
> Vereinbarung; Rechtsberatung Prüfung vor publication.
