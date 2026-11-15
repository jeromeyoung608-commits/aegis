<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/doc-redactor/tests/README.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Tests

Développement uniquement vérification scripts. Le livré application lui-même a **aucun dépendances**; ces
scripts installer rien dans le application et sont jamais chargé par `index.html`.

## Prerequisites

```bash
cd tests
npm install --no-save playwright-core@1.55.0 pdf-lib@1.17.1
```

`playwright-core` pilote un already-installed Chrome/Chromium. Resolution order:

1. `CHROME_PATH` environnement variable, si ensemble.
2. Le premier `chromium-*` build dans le Playwright cache (`~/Library/Caches/ms-playwright`).
3. Le installed `chrome` canal.

## Exécuter

```bash
# terminal 1 — from the project root
python3 -m http.server 8010

# terminal 2 — from this folder
node generate-sample-pii.cjs
node e2e.cjs
```

Environnement variables:

| Variable | Par défaut | But |
|----------|---------|---------|
| `BASE_URL` | `http://127.0.0.1:8010/` | Où le application est servi |
| `CHROME_PATH` | auto | Explicite navigateur executable |

Artefacts (`sample-pii.pdf`, le exporté redacted PDF, `ui.png`) sont écrit à
`tests/artifacts/` et sont délibérément git-ignorable.

## Quoi `e2e.cjs` assure

1. Intake produces un page et OCR finishes (`status === 'done'`).
2. À au moins un sensible détection existe.
3. Le exporté PDF a **zéro** texte éléments quand re-parsed par pdf.JS.
4. Chaque caviardage centre rend as near-black (`RGB < 40` sur tous channels); le page margin
   reste white.
5. Un deliberate sonde à `https://example.com` est bloqué et counted par le hors ligne garde.
6. Aucun console erreurs et aucun non-local réseau requêtes (tous non-local requêtes sont aborted par un
   route interceptor, simulating un disconnected réseau).

Exit code est `0` uniquement quand tous assertions résumi (`E2E_PASS`); échecs print un reason liste.
Voir `../TEST_REPORT.md` pour le enregistré résultats et methodology.
