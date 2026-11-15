<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/ROPA.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Datensätze von Verarbeitung Activities (ROPA)

**Status:** Ausgestellt · **Version:** 1.0 · **Letzte aktualisiert:** 2026-11-14
**Basis:** GDPR Article 30 · **Verantwortlicher:** {{CONTROLLER_Rechtlich_Name}} — {{CONTROLLER_Adresse}} — {{CONTROLLER_REG_Kein}}

Dies Datensatz deckt ab Verarbeitung durchgeführt durch Aegis lokal Daten-cleansing
Service. Eine row pro Verarbeitung activity.

---

## Verarbeitung activity register (Art. 30 — strukturiert)

| Verarbeitung activity | Zweck | Aufbewahrung | Empfänger | Rechtlich Basis |
| --- | --- | --- | --- | --- |
| Aegis Kern Service | {{ROPA_Zweck}} | {{ROPA_Aufbewahrung}} | {{ROPA_Empfänger}} | {{ROPA_Rechtlich_Basis}} |

> Der vier columns oben sind der strukturiert minimum Aufsichtsbehörde
> expects. Fill sie über Bediener Konsole (Compliance → ROPA Abschnitt); bis
> sie sind Set, Fabrik Gate blockiert issuing der ausgefüllt ROPA (HTTP 409 +
> `X-Aegis-Compliance: not-ready`).

---

## Activity Ein — Dokument Bereinigung & Hash-Bildung

- **Purposes:** entfernen vertraulich attributes von Dokumente; compute Integrität
  hashes/manifests.
- **Kategorien von Daten Betroffene:** individuals appearing in Kunde Dokumente.
- **Kategorien von persönlich Daten:** Dokument contents; abgeleitet hashes/manifests.
- **Empfänger:** keiner durch Standard (lokal Verarbeitung).
- **Übertragungen:** keiner (Opt-in TSA sendet Hash nur).
- **Aufbewahrung:** pro Verantwortlicher Richtlinie; erasable auf Anfrage.
- **Übertragung Basis:** keiner — lokal Verarbeitung; der nur optional cross-border Ablauf ist TSA Hash (Verantwortlicher Verantwortung, SCCs).
- **Sicherheit:** Verschlüsselung bei Rest; null Standard Ausgang.

## Activity B — Bediener authentication & Zugriff

- **Purposes:** authenticate operators/issuers; authorise Aktionen.
- **Kategorien von Daten Betroffene:** Kunde staff (Bediener).
- **Kategorien von persönlich Daten:** Konto identifiers; hashed Zugangsdaten;
  Sitzung Token.
- **Empfänger:** keiner extern.
- **Übertragungen:** keiner.
- **Aufbewahrung:** Konten beibehalten pro Richtlinie; Sitzungen TTL-bound.
- **Übertragung Basis:** keiner — lokal Verarbeitung.
- **Sicherheit:** credential Hash-Bildung; bearer auth mit TTL; Anmeldung throttling.

## Activity C — Audit & Rechenschaftspflicht logging

- **Purposes:** maintain ein manipulationserkennbar, Hash-verkettet Rechenschaftspflicht trail.
- **Kategorien von Daten Betroffene:** Bediener (as actors in Audit Ereignisse).
- **Kategorien von persönlich Daten:** action Metadaten, entfernt Adresse, subject.
- **Empfänger:** Verantwortlicher (über `/audit/export`).
- **Übertragungen:** keiner.
- **Aufbewahrung:** rolling; **operator/system Ereignisse sind manipulationserkennbar und
  nur-appendierbar, und nicht erasable** (forensic-integrity control).
- **Übertragung Basis:** keiner — lokal Verarbeitung.
- **Sicherheit:** Hash-verkettet Protokoll; Export geschützt durch Bediener Umfang.

## Activity D — Optional RFC3161 timestamping (Opt-in)

- **Purposes:** binden cleansed Artefakte zu ein trusted Zeitstempel.
- **Kategorien von persönlich Daten:** keiner in klar — nur ein **Hash** ist gesendet.
- **Empfänger:** Kunde-configured TSA Endpunkt.
- **Übertragungen:** zu der konfiguriert TSA (Kunde Verantwortung für SCCs).
- **Aufbewahrung:** Zeitstempel receipt speichert mit Artefakt.
- **Übertragung Basis:** zu der konfiguriert TSA nur (Kunde Verantwortung, SCCs).
- **Sicherheit:** outbound deaktiviert durch Standard (`gateway.externalTsa.enabled=false`).

---

_Abgeschlossen ROPA zu sein signiert durch Verantwortlicher's DPO und kept available zu der
Aufsichtsbehörde._
