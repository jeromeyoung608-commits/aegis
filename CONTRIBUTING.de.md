<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: `CONTRIBUTING.md`
> Übersetzung zur besseren Lesbarkeit. Bei Abweichungen gilt der englische Text.

# Mitwirken an Aegis

Danke für Ihr Interesse. Aegis ist **Open Source** unter der **Apache License
2.0** (SPDX `Apache-2.0`; siehe `LICENSE`). Beiträge werden unter derselben
Lizenz angenommen.

## Wege der Mitwirkung

- **Fehler melden** mit einer minimalen Reproduktion und der genauen
  Build-Version.
- **Änderungen vorschlagen** per Pull Request gegen `main`. Bei allem, was die
  Sicherheitsgrenze berührt (server.js, Authentisierung, Compliance-Gates,
  Kryptografie), zuerst ein Issue eröffnen.
- **Übersetzungen** — die Sprachkataloge liegen in
  `aegis-shell/src/i18n.js` (en/de). Ein Schlüssel wird in beide Kataloge und in
  die Referenzliste von `aegis-shell/src/i18n-keys.test.js` eingetragen.

## Entwicklungsumgebung

```bash
npm run setup        # Ein-Klick-Installation / Entwicklungsstart
npm test             # alle Modultests + Repository-Gates
npm run verify:all   # TSA- und p4/p5-Prüfungen
npm run doctor       # 9 Vorabprüfungen
npm run pack:delivery && npm run verify:delivery   # reproduzierbares Lieferarchiv
```

## Coderegeln

- **Keine Laufzeitabhängigkeiten** für Oberfläche, Server und 11 von 13 Modulen.
  Nur `doc-redactor` (pdf.js, pdf-lib, tesseract.js, tessdata) und
  `e2e-signed-delivery` (pdf-lib) führen Fremdcode mit. Siehe
  `docs/DEPENDENCY_AUDIT.md`.
- **Kennzeichnungen werden durch Gates erzwungen.** Jede ausgelieferte Datei
  (`.js/.mjs/.ts/.css/.html`) muss den Copyright-Kopf tragen
  (`scripts/verify-headers.mjs`, eingebunden in `npm test`). Fußzeilen
  „ENGINE BY JEROME YOUNG" und die Felder `producer`/`provenance` nicht entfernen.
- **Keine privaten Pfade, keine Geheimnisse im Baum.** `scripts/package-delivery.mjs`
  bricht ab, wenn `data/`, `config/local.json` oder Schlüsselmaterial mitgeliefert
  würden.

## Lizenz Ihres Beitrags

Aegis steht unter Apache-2.0. Mit der Einreichung eines Beitrags stimmen Sie zu,
dass er unter Apache-2.0 lizenziert wird (inbound = outbound). Eine
Urheberrechtsübertragung und ein CLA sind nicht erforderlich.

Jeder Commit muss eine Sign-off-Zeile des Developer Certificate of Origin tragen:

    Signed-off-by: Your Name <you@example.com>

Verwenden Sie `git commit -s`. Pull Requests ohne Sign-off werden nicht
zusammengeführt.
