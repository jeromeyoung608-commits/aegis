<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/SUBCONTRACTOR-INVENTORY.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Sub-Auftragsverarbeiter & Drittanbieter Inventory

**Status:** Ausgestellt · **Version:** 1.0 · **Letzte aktualisiert:** 2026-11-14
**Produkt:** Aegis — Privacy-first Lokal Daten Bereinigung Engine
**Basis:** GDPR Art. 28(2) / SOC 2 CC9 — know und Dokument jeder extern Partei
das kann touch persönlich Daten.

---

## 1. Laufzeit sub-processors: Keiner (durch Entwurf)

Aegis läuft **vollständig lokal** mit **null verpflichtend Netzwerk Ausgang**. Außer von der
box es:

- macht **kein outbound Aufrufe** zu irgendein vendor;
- embeds **kein Drittanbieter analytics, telemetry, oder SaaS SDK**;
- liefert aus seiner Abhängigkeiten as **vendiert, hashed libraries** innen Paket
  (siehe `dist/sbom.cdx.json` und `verify:delivery` Integrität prüfen) — diese sind
  compiled-in, nicht entfernt Services.

Daher dort ist **kein Laufzeit sub-Auftragsverarbeiter** requiring ein separat DPA über hinaus
Aegis DPA selbst.

## 2. Optional Integrationen (Kunde-configured, Kunde-controlled)

| Integration | Wenn aktiv | Daten gesendet | Partei |
|-------------|-------------|-----------|-------|
| RFC3161 Zeitstempel Authority | nur wenn `gateway.externalTsa.enabled=true` | ein **Hash nur** (niemals Dokument Bytes) | Kunde-chosen TSA Endpunkt |
| SCIM / OIDC IdP | nur wenn SCIM/OIDC konfiguriert | Konto attributes | Kunde's IdP |

Jeder ist **Opt-in und aus durch Standard**. Der Kunde ist Verantwortlicher von irgendein
Übertragung und ist verantwortlich für Übertragung Mechanismus (e.g. SCCs) für TSA.

## 3. Vendiert libraries (bundled, nicht sub-processors)

Der few Drittanbieter libs (e.g. `pdf-lib`) sind **vendiert unter
`modules/*/vendor/`**, byte-identisch über copies, und aufgezeichnet in der SBOM mit
ihrer licenses und SHA-256. Sie execute in-process; sie sind **nicht** extern
Services und do nicht erhalten Daten.

## 4. Prüfung cadence

Re-confirm dies inventory auf jeder Release und bei jeder Kunde onboarding: der
Set von optional Ausgang Punkte muss bleiben genau der two oben, und beide aus durch
Standard.
