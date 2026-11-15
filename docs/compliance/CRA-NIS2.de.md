<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/CRA-NIS2.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Aegis — CRA / NIS2 Bereitschaft

Mapping von EU **Cyber Resilience Act (CRA)** und **NIS2 Directive** expectations
zu concrete Aegis Kontrollen. ✅ = implementiert, 🟡 = partial / design-ready,
⏳ = planned.

## Secure-by-design & Standard (CRA Anhang I.1)
- ✅ **Null npm Laufzeit Abhängigkeiten.** Der Kern Kernel ist Erstpartei + `node:*` nur.
  Browser modules vendor Drittanbieter libraries (PDF.JS, pdf-lib, Tesseract.JS) unter
  `vendor/` directories, und Test harnesses verwenden `playwright` — alle listed **honestly**
  in CycloneDX SBOM (`scripts/gen-sbom.mjs`). Kein unsupported/abandoned Komponenten.
- ✅ **Local-first, offline** — kein verpflichtend cloud; Daten verarbeitet in-Browser.
- ✅ **Serverblind Übertragung** — Relay niemals sieht Datei Bytes oder Schlüssel.

## Vulnerability handling (CRA Anhang I.2 / NIS2 Vorfall)
- ✅ **Audit-Trail** durable in SQLite; Bediener-facing und nur-appendierbar (P1).
- 🟡 **Widerruf** — lokal CRL-style deny-list bei Sitzung Zulassung (P5); ein
  coordinated disclosure Prozess / PSIRT ist **nicht noch published** (planned).
- ⏳ **Unabhängig Penetration Test** — erforderlich vor Produktion Behauptung.

## Dokumentation & transparency (CRA Anhang I.3)
- ✅ **SBOM** erzeugt über `npm run` / `scripts/gen-sbom.mjs`.
- ✅ **Bedrohung Modell** (`docs/compliance/THREAT-MODEL.md`).
- 🟡 **Sicherheit Richtlinie** (`SECURITY.md`); **nicht noch** ein extern bug-bounty.

## NIS2 governance / supply chain
- 🟡 Single-maintainer offen source (Apache-2.0); supply chain ist nur Node.js (LTS recommended).
- ⏳ Formal **conformance / EN 301 549 (accessibility)** testing — P7 (WCAG 2.1 AA
  foundations started über Entwurf System + i18n).

## Ehrlich Lücken (do nicht over-claim)
1. Kein Drittanbieter pen-test noch.
2. Kein published PSIRT / SLA für Schwachstellenmeldung.
3. Accessibility conformance ist *foundational*, nicht *certified*.
4. Der Audit Protokoll beweist Server *saw* ein Ereignis; es macht nicht durch selbst beweisen
   client-side correctness — pair mit der in-Browser Hash-Kette.

## Language von Benutzer Information

Sicherheit-relevant Benutzer Information ist bereitgestellt durch Produkt UI in
Englisch, Deutsch, French und Spanish. Formal notices zu Kunden sind ausgestellt in
Englisch und Deutsch.

## Rolle

Aegis ist published as open-source Software unter Apache-2.0; Maintainer
bietet bezahlt Support Services. Whether ein given distribution macht der
Maintainer ein "manufacturer" unter der CRA hängt ab auf der commercial activity
concerned und ist assessed pro Mandat, nicht asserted hier.
