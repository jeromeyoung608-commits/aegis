<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/doc-redactor/tests/README.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Pruebas

Solo desarrollo verificación scripts. El entregado aplicación él mismo tiene **ningún dependencias**; estos
scripts instalar nada en el aplicación y son nunca cargado por `index.html`.

## Prerequisites

```bash
cd tests
npm install --no-save playwright-core@1.55.0 pdf-lib@1.17.1
```

`playwright-core` impulsa un already-installed Chrome/Chromium. Resolution order:

1. `CHROME_PATH` entorno variable, si conjunto.
2. El primero `chromium-*` compilación en el Playwright caché (`~/Library/Caches/ms-playwright`).
3. El installed `chrome` canal.

## Ejecutar

```bash
# terminal 1 — from the project root
python3 -m http.server 8010

# terminal 2 — from this folder
node generate-sample-pii.cjs
node e2e.cjs
```

Entorno variables:

| Variable | Predeterminado | Finalidad |
|----------|---------|---------|
| `BASE_URL` | `http://127.0.0.1:8010/` | Donde el aplicación es servido |
| `CHROME_PATH` | auto | Explícito navegador executable |

Artefactos (`sample-pii.pdf`, el exportado redacted PDF, `ui.png`) son escrito a
`tests/artifacts/` y son deliberadamente git-ignorable.

## Qué `e2e.cjs` afirma

1. Intake produces uno página y OCR finishes (`status === 'done'`).
2. En al menos uno sensible detección existe.
3. El exportado PDF tiene **cero** texto elementos cuando re-parsed por pdf.JS.
4. Cada redacción centre genera as near-black (`RGB < 40` en todos channels); el página margin
   permanece white.
5. Un deliberate sonda a `https://example.com` es bloqueado y counted por el sin conexión guarda.
6. Ningún consola errores y ningún non-local red solicitudes (todos non-local solicitudes son aborted por un
   route interceptor, simulating un disconnected red).

Exit código es `0` solo cuando todos aserciones aprobado (`E2E_PASS`); fallos print un reason lista.
Véase `../TEST_REPORT.md` para el registrado resultados y methodology.
