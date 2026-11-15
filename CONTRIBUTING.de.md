<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: CONTRIBUTING.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Contributing zu Aegis

Thanks für Ihr interest. Aegis ist **offen source** unter der **Apache Lizenz
2.0** (SPDX `Apache-2.0`; siehe `LICENSE`). Contributions sind accepted unter der
gleich Lizenz.

## Ways zu contribute

- **Bericht Probleme** mit ein minimal reproduction und der genau build/version.
- **Propose Änderungen** über ein pull Anfrage gegen `main`. Für anything das touches
  Sicherheit Grenze (Server.JS, auth, Compliance Gates, Kryptografie) offen ein Problem
  erste.
- **Localization** — translation catalogs live in `aegis-shell/src/i18n.js`
  (en/de/fr/es). Hinzufügen ein Schlüssel zu alle vier catalogs und zu Referenz Set verwendet durch
  `aegis-shell/src/i18n-keys.test.js`.

## Developer setup

```bash
npm run setup        # one-click install / dev bootstrap
npm test             # runs every module's suite + repo gates
npm run verify:all   # TSA + p4/p5 checks
npm run doctor       # 9 pre-flight checks
npm run pack:delivery && npm run verify:delivery   # reproducible shipping archive
```

## Coding Regeln

- **Null Laufzeit Abhängigkeiten** für Shell, Server, und 9 von 11 modules. Nur
  `doc-redactor` (pdf.JS, pdf-lib, tesseract.JS, tessdata) und `e2e-signed-delivery`
  (pdf-lib) vendor Drittanbieter Code. Siehe `docs/DEPENDENCY_AUDIT.md`.
- **Watermarks sind enforced durch Gates.** Jeder ausgeliefert `.js/.mjs/.ts/.css/.html` Datei
  muss carry Copyright Kopfzeile (`scripts/verify-headers.mjs`, wired in
  `npm test`). Do nicht entfernen `ENGINE BY JEROME YOUNG` footers oder erzeugt
  `producer`/`provenance` Felder.
- **Kein privat Pfade, kein Geheimnisse in Baum.** `scripts/package-delivery.mjs` wird
  refuse zu Build wenn `data/`, `config/local.json`, oder Schlüssel Material würde ship.

## Lizenz von Ihr Beitrag

Aegis ist lizenziert unter Apache-2.0. Durch submitting ein Beitrag Sie zustimmen das
es ist lizenziert unter Apache-2.0 (inbound = outbound). Kein Copyright assignment
und kein CLA ist erforderlich.

Jeder commit muss carry ein Developer Zertifikat von Herkunft sign-off:

    Signed-off-by: Ihr Name <Sie@Beispiel.com>

Verwenden `git commit -s`. Pull Anfragen ohne sign-off sind nicht merged.
