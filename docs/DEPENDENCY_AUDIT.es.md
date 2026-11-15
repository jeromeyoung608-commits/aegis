<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/DEPENDENCY_AUDIT.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Aegis dependencia y "hand-written" auditoríun (2026-11-12)

Alcance: `~/Documents/Aegis` (aegis-shell + 11 modules)
One-line conclusion: **el núcleo es hand-written, pero "100% cero dependencia" hace no hold** — 3 tercero libraries (5 componentes) son incorporado en el repositorio, y 1 Node proceso se ejecuta.

---

## 1. Hechos (seguro a quote externally)

| Elemento | Fact | Cómo esto era verificado |
|---|---|---|
| Hand-written código volumen | **19,554 líneas** (.js/.mjs/.html/.css, excluding vendor, node_modules, pruebas); de cuál plano JS **15,221 líneas**, WGSL shaders **119 líneas** | `find … \| xargs wc -l` |
| Structure | 1 shell + **11 modules** (webgpu-topologíun / doc-redactor / zero-knowledge-identity / p2p-crypto-transfer / encrypted-archive / auditoría-timeline / token-gate / blind-relé / detached-hash-firmante / sync-canvas / e2e-signed-delivery) | `ls modules` |
| Raíz paquete.json | **0 tiempo de ejecución dependencias**; el solo script es `npm test` | archivo contenido |
| Shell paquete.json | **0 dependencias** | archivo contenido |
| Tercero libraries (documento redacción módulo) | `pdf.js 3.11.174` (Apache-2.0), `pdf-lib 1.17.1` (MIT), `tesseract.js 5.1.1` (Apache-2.0), `tesseract.js-core 5.1.1` (Apache-2.0), `tessdata deu+eng` (Apache-2.0) | `modules/doc-redactor/vendor/MANIFEST.json` + `THIRD_PARTY_NOTICES.md` |
| Vendor tamaño | `doc-redactor/vendor` **35 MB**; `e2e-signed-delivery/vendor/pdf-lib` 524 KB | `du -sh` |
| Tiempo de ejecución red solicitudes | **0** (todo loads localmente: `./vendor/pdfjs/pdf.min.js`, `./vendor/tesseract/worker.min.js`, `langPath=./vendor/tessdata`) | `grep -rn "vendor/"` más un registrado DevTools recuento de `0 'external requests'` |
| Test-only (no entregado con el tiempo de ejecución) | `playwright-core 1.55.0`, `playwright ^1.65.0`, `pdf-lib 1.17.1` (e2e repo) | devDependencies de el respective modules |
| Backend | **1 Node proceso**, `server.js`: cero dependencia (`node:http/https/fs/path/url` + el in-repo token-gate), responsable para ① estático archivo servicio ② sending COOP/COEP así páginas son cross-origin aislado (obligatorio para SharedArrayBuffer) ③ WebRTC signalling relé (ve SDP/ICE solo, nunca bytes o claves) | encabezado comment en `server.js` |

## 2. Qué es genuinely hand-written

- **Hand-written**: WebGPU topologíun renderizado (device/pipelines/camera/physics worker + 119 líneas de WGSL), el event-bus shell y su siete etapas estado máquina, AES-GCM chunked cifrado con PBKDF2 derivation, ECDSA firma y verificación, WebRTC DataChannel transporte, OPFS cifrado archivo, cadena de hash auditoríun, token-gate sala tokens.
- **No hand-written (incorporado)**: PDF **parsing** (pdf.JS), PDF **writing** (pdf-lib), el **OCR motor** (Tesseract + language models). El destructive overwrite lógica de el redacción paso (`fillRect` sobre el original pixels) es hand-written, pero renderizado el PDF a un lienzo primero depende en pdf.JS.
- **No hand-written (proceso)**: `server.js` es self-written, pero esto es genuinely un backend proceso que tiene a ejecutar.

## 3. Desactualizado redacción en el video script

| Actual línea | Problem | Recommendation |
|---|---|---|
| "ningún framework, ningún dependencias, nada pulled de un registry en ejecutar tiempo" | el primero half es verdadero, `no dependencies` es no | cambio a "ningún framework, ningún npm instalar" y estado plainly que el tres libraries son incorporado en el repositorio |
| "Ningún relé, ningún backend, ningún cola en el middle" | el bytes indeed bypass un relé, pero establishing el conexión necesita un signalling servidor | "ningún relé para el bytes", más un nota que signalling solo exchanges addresses |
| "cero backend" (fin tarjeta) | allí es un `server.js` | cambio a "uno signalling relé", o "uno estático servidor" |
| "0 externo solicitudes" | **verdadero** (DevTools recuento de el actual recording) | conservar |

## 4. Suspicious findings de el auditoríun (código untouched, registrado solo)

- `modules/doc-redactor/vendor/MANIFEST.json` declares un SHA-256 manifest, pero `tessdata` es almacenado as `.gz` en el repositorio; si esto es unpacked en despliegue tiempo su hash será no match el manifest — re-verify contra el MANIFEST aintes lanzamiento.
- `e2e-signed-delivery` también vendors un copia de `pdf-lib` (para prueba fixtures). Esto es el mismo versión as el doc-redactor copia pero maintained independently, así esto recuentos as un duplicated dependencia.
- El raíz `package.json` says "cero tiempo de ejecución dependencias". Strictly esto debería decir "cero npm dependencias", del contrario esto conflicts con el incorporado hechos.
- **El shell depende en pdf-lib indirectly a través de el SDK**: `aegis-shell/src/app.js:46` y `src/identity.js:40` ambos `import` de `/modules/e2e-signed-delivery/src/sdk/pdf.js`, cuál usa `window.PDFLib` internally; pero `aegis-shell/index.html` solo loads `./src/app.js` y nunca loads el `vendor/pdf-lib` script. Two consequences: ① el shell es no "0 vendor"; ② en el `buildPdf()` ruta `window.PDFLib` es `undefined` en el shell página, cuál es un tiempo de ejecución riesgo. Recommendation: carga pdf-lib expresamente en el shell, o mover PDF construction down en el doc-redactor módulo.
- El `fetch('https://example.com/redaktor-probe')` en `doc-redactor/src/js/core/offline-guard.js` es un **deliberate** self-test sonda que `guardedFetch` bloquea cross-origin. Esto es no un real outbound llamada y hace no violate "0 externo solicitudes".

## 5. Público redacción (usar este conjunto en marketing material y video)

- ✅ Seguro a decir: **ningún framework, ningún npm instalar, ningún CDN, 0 outbound solicitudes en ejecutar tiempo, 19,554 líneas de hand-written código, y un núcleo (topologíun / cryptography / identidad / transporte / archivo / auditoríun) escrito de scratch**.
- ❌ No seguro a decir: **ningún dependencias / cero dependencias / cero vendor / cero backend**.
- ✅ Accurate redacción: **tres libraries son incorporado en el repositorio (pdf.JS, pdf-lib, tesseract.JS — Apache-2.0 / MIT, 35 MB, cargado localmente); más uno sin dependencias Node servidor que sirve estático archivos, conjuntos COOP/COEP y relays WebRTC signalling (exchanging SDP/ICE solo, nunca bytes o claves)**.
