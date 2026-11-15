<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/doc-redactor/tests/README.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Tests

Nur-Entwicklung Prüfung scripts. Der ausgeliefert Anwendung selbst hat **kein Abhängigkeiten**; diese
scripts installieren nichts in App und sind niemals geladen durch `index.html`.

## Prerequisites

```bash
cd tests
npm install --no-save playwright-core@1.55.0 pdf-lib@1.17.1
```

`playwright-core` steuert ein already-installed Chrome/Chromium. Resolution order:

1. `CHROME_PATH` Umgebung variable, wenn Set.
2. Der erste `chromium-*` Build in der Playwright Cache (`~/Library/Caches/ms-playwright`).
3. Der installed `chrome` Kanal.

## Ausführen

```bash
# terminal 1 — from the project root
python3 -m http.server 8010

# terminal 2 — from this folder
node generate-sample-pii.cjs
node e2e.cjs
```

Umgebung variables:

| Variable | Standard | Zweck |
|----------|---------|---------|
| `BASE_URL` | `http://127.0.0.1:8010/` | Wo App ist ausgeliefert |
| `CHROME_PATH` | auto | Explizit Browser executable |

Artefakte (`sample-pii.pdf`, der exportiert redacted PDF, `ui.png`) sind geschrieben zu
`tests/artifacts/` und sind absichtlich git-ignorable.

## Was `e2e.cjs` bestätigt

1. Intake produces eine Seite und OCR finishes (`status === 'done'`).
2. Bei mindestens eine vertraulich Erkennung existiert.
3. Der exportiert PDF hat **null** Text Elemente wenn re-parsed durch pdf.JS.
4. Jeder Schwärzung centre zeichnet as near-black (`RGB < 40` auf alle channels); Seite margin
   bleibt white.
5. Ein deliberate Sonde zu `https://example.com` ist blockiert und counted durch der offline Wächter.
6. Kein Konsole Fehler und kein non-local Netzwerk Anfragen (alle non-local Anfragen sind aborted durch ein
   route interceptor, simulating ein disconnected Netzwerk).

Exit Code ist `0` nur wenn alle Assertions bestanden (`E2E_PASS`); Fehler print ein reason Liste.
Siehe `../TEST_REPORT.md` für der aufgezeichnet Ergebnisse und methodology.
