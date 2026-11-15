<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: `docs/compliance/CRA-NIS2.md`
> Übersetzung zur besseren Lesbarkeit. Bei Abweichungen gilt der englische Text.

# Aegis — Bereitschaft für CRA und NIS2

Zuordnung der Anforderungen des EU **Cyber Resilience Act (CRA)** und der
**NIS2-Richtlinie** zu konkreten Aegis-Kontrollen. ✅ = umgesetzt,
🟡 = teilweise / konstruktiv vorbereitet, ⏳ = geplant.

## Sicher durch Konstruktion und Voreinstellung (CRA Anhang I.1)

- ✅ **Keine npm-Laufzeitabhängigkeiten.** Der Kern besteht ausschließlich aus
  Erstdarteien und `node:*`. Die Browser-Module führen Fremdbibliotheken
  (PDF.js, pdf-lib, Tesseract.js) in `vendor/`-Verzeichnissen mit, die
  Testumgebung nutzt `playwright` — alle **vollständig** in der CycloneDX-SBOM
  gelistet (`scripts/gen-sbom.mjs`). Keine nicht unterstützten oder
  aufgegebenen Komponenten.
- ✅ **Lokal zuerst, offline** — keine zwingende Cloud; Daten werden im Browser
  verarbeitet.
- ✅ **Server-blind:** das Relay sieht weder Dateibytes noch Schlüssel.

## Umgang mit Schwachstellen (CRA Anhang I.2 / NIS2-Vorfall)

- ✅ **Audit-Trail** dauerhaft in SQLite, betreiberseitig und fortlaufend (P1).
- 🟡 **Widerruf** — lokale Sperrliste bei der Sitzungszulassung (P5); ein
  koordiniertes Offenlegungsverfahren bzw. ein PSIRT ist **noch nicht
  veröffentlicht** (geplant).
- ⏳ **Unabhängiger Penetrationstest** — erforderlich vor jeder
  Produktivzusicherung.

## Dokumentation und Transparenz (CRA Anhang I.3)

- ✅ **SBOM** über `npm run` / `scripts/gen-sbom.mjs` erzeugt.
- ✅ **Threat Model** (`docs/compliance/THREAT-MODEL.md`).
- 🟡 **Sicherheitsrichtlinie** (`SECURITY.md`); **noch kein** externes
  Bug-Bounty-Programm.

## NIS2-Governance / Lieferkette

- 🟡 Open Source mit einem Maintainer (Apache-2.0); die Lieferkette besteht nur
  aus Node.js (LTS empfohlen).
- ⏳ Formale Prüfung auf **Konformität / EN 301 549 (Barrierefreiheit)** — P7
  (Grundlagen zu WCAG 2.1 AA wurden über Designsystem und i18n begonnen).

## Offene Punkte (keine Überzeichnung)

1. Noch kein Penetrationstest durch Dritte.
2. Kein veröffentlichtes PSIRT / keine SLA für Schwachstellenmeldung.
3. Die Barrierefreiheit ist *grundlegend*, nicht *zertifiziert*.
4. Das Audit-Protokoll belegt, dass der Server ein Ereignis *gesehen* hat; es
   belegt nicht die clientseitige Korrektheit — dafür steht die Hash-Kette
   im Browser.

## Sprache der Nutzerinformationen

Sicherheitsrelevante Nutzerinformationen werden über die Produktoberfläche auf
Englisch und Deutsch bereitgestellt. Formelle Mitteilungen an Kunden ergehen
auf Englisch und Deutsch.

## Rolle

Aegis wird als Open-Source-Software unter Apache-2.0 veröffentlicht; der
Maintainer erbringt bezahlte Support-Leistungen. Ob eine bestimmte
Distribution den Maintainer zum „Hersteller" im Sinne des CRA macht, hängt
von der jeweiligen Geschäftstätigkeit ab und wird pro Beauftragung bewertet,
nicht hier behauptet.
