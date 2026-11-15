<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/DATA-RESIDENCY.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Daten Residency & Übertragung Position — Aegis

**Status:** Ausgestellt · **Version:** 1.0 · **Letzte aktualisiert:** 2026-11-14
**Produkt:** Aegis — Privacy-first Lokal Daten Bereinigung Engine

---

## 1. Principle: Daten bleibt wo Sie ausführen es

Aegis ist **local-first**. Durch Standard **alle** persönlich Daten — Dokumente, abgeleitet
hasht, manifests, Bediener Konten und Audit Ereignisse — ist speichert auf der
Kunde's eigen Laufzeit Lautstärke (`data/aegis.db`, der encrypted-archive Tresor, und
`~/.aegis/tls`). Der vendor niemals receives es.

## 2. Standard Netzwerk posture — null Ausgang

Der shipping Build macht **kein outbound Netzwerk Aufrufe** sofern ein optional
Integration ist ausdrücklich aktiviert. Dies ist geprüft durch der project's
null Abhängigkeiten Gate, welche schlägt fehl Build wenn irgendein Modul führt durch outbound I/O.
Kein telemetry, kein analytics, kein SaaS callbacks.

## 3. Optional Integrationen (Kunde-controlled, aus durch Standard)

| Integration | Wenn aktiv | Daten gesendet | Cross-border consideration |
|-------------|-----------|----------|---------------------------|
| RFC3161 Zeitstempel Authority | nur wenn `gateway.externalTsa.enabled=true` | ein **Hash nur** (niemals Dokument Bytes) | Kunde's chosen TSA Endpunkt; Kunde besitzt Übertragung Mechanismus (e.g. SCCs) |

Dort ist **kein andere** extern Ausgang. SCIM/OIDC (wenn aktiviert) talks nur zu der
Kunde's eigen Identität Anbieter.

## 4. International Übertragungen (GDPR Chapter V)

- **Standard:** keiner. Verarbeitung ist lokal zu der jurisdiction wo Instanz
  läuft.
- **Optional TSA:** nur ein Hash lässt Instanz. Weil ein kryptografisch Hash
  von ein Dokument ist generally nicht persönlich Daten in klar, und Endpunkt ist
  Kunde-selected, Übertragung Mechanismus (SCCs / adequacy) ist Kunde's
  Verantwortung. Dokument TSA Endpunkt und seiner Ort in der ROPA.
- **Vendor Support channels:** irgendein Support interaction ist governed durch Support
  Vereinbarung; kein Produkt Daten ist transmitted zu der vendor sofern Kunde
  chooses zu teilen es.

## 5. Residency Attestierung für Kunden

Kunden subject zu Daten-residency requirements kann attestieren, mit dies Dokument
und der `verify:zero-deps` Beweis, das kein persönlich Daten lässt ihrer perimeter
in Standard Konfiguration. Enable nur Integrationen whose Übertragung Basis
Sie haben authorised.

Bereitstellung region und irgendein mandated local-Auftragsverarbeiter clauses sind specified in der
Bestellformular für jeder Mandat.
