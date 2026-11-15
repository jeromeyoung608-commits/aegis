<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/doc-redactor/TEST_REPORT.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Entrega & Engineering Prueba Informe — Redactor

**Proyecto**: `doc-redactor` — navegador-only, zero-upload PDF & imagen redacción motor
**Fecha**: 2026-11-09
**Type**: engineering verificación informe (functional, seguridad, exportación forensics, sin conexión)
**Constraint cumplimiento**: 100 % Inglés entregables, ningún backend, ningún tiempo de ejecución tercero código
más allá de el localmente incorporado pdf.JS / pdf-lib / tesseract.JS activos.

---

## 1 · Objectivo recap

Compilación un redacción tool para Alemán ley firms, clinics y HR equipos que debe work sin cualquiera
red acceso. Difícil requirements de el brief:

1. **Puro front-end OCR** vía WebAssembly (Tesseract.JS), nunca un remoto API.
2. **Lienzo procesamiento**: locate sensible strings con regex en OCR salida y paint negro
   cajas sobre su coordinates.
3. **pdf.JS renderizado + pdf-lib exportación** que produces un **non-recoverable** PDF.
4. **Completamente sin conexión**: demonstrable cero datos leakage con el red cut.
5. **Modular archivos** para long-term maintenance.
6. **English-only entregables** (UI copia, comments, documentación).

---

## 2 · Qué era entregado

| Archivo | Responsabilidad |
|------|----------------|
| `index.html` | Markup, CSP, classic UMD library tags, ES-módulo entrada, help modal. |
| `src/js/app.js` | Orchestration: intake, serial OCR cola, rescan, exportación, pestañas, shortcuts. |
| `src/js/core/*.js` | Estado + emitter, utilities, sin conexión solicitud guarda. |
| `src/js/ingest/*.js` | Archivo classification, 150 DPI página fábrica, previews, thumbnails. |
| `src/js/ocr/engine.js` | Tesseract worker lifecycle, PSM 3, normalised line/word cajas. |
| `src/js/pdf/render.js` | pdf.JS documento loading y página rasterisation. |
| `src/js/detect/*.js` | 15 reglas + validators, Alemán lexicon, scanner/dedupe. |
| `src/js/redact/geometry.js` | Normalised box math y overlap ratios. |
| `src/js/view/page-view.js` | Lienzo preview, negro cajas, hover reveal, drag-to-mark, zoom. |
| `src/js/export/pdf-builder.js` | Nuevo PDF construction, raster burning, vector overlay, auditoríun JSON. |
| `src/js/ui/*.js` | Toasts, documento lista, regle switches, findings, estado bar. |
| `src/css/app.css` | Diseño tokens y diseño (3-column workstation). |
| `README.md` | Usuario + mantenedor documentación. |
| `TEST_REPORT.md` | Este informe. |
| `tests/` | Solo desarrollo reproducible scripts (muestra generator + E2E suite). |
| `vendor/` | Pinned sin conexión activos: pdf.JS 3.11.174, pdf-lib 1.17.1, tesseract.JS 5.1.1, deu/eng models. |

Línea recuento de hand-written código: **3,885 líneas** a través de `index.html`, `app.css` y 19 JS modules;
incorporado activos son 36 MB y nunca cargado de un CDN.

---

## 3 · Requisito lista de verificación

| # | Requisito | Implementación | Estado |
|---|-------------|----------------|--------|
| 1 | Puro client-side WASM OCR | Tesseract.JS 5.1.1 worker + local `tesseract-core` WASM + local `deu`/`eng` models, ningún red | Cumplido |
| 2 | Lienzo + regex coordinate redacción | `scanner.js` maps regex character ranges a palabra cajas; `page-view.js` paints ellos | Cumplido |
| 3 | pdf.JS renderizar, pdf-lib exportación | `render.js` + `pdf-builder.js` rebuild cada página as un nuevo PDF | Cumplido |
| 4 | Non-recoverable salida | Raster re-render en exportación DPI + burned pixels + opcional vector rects; original objects, fonts, texto capa, annotations, XMP nunca copied | Cumplido — véase §5 |
| 5 | Sin conexión / cero leakage | CSP + tiempo de ejecución guarda + visible auditoríun counters + deliberate bloqueado sonda | Cumplido — véase §6 |
| 6 | Modular, maintainable | 19 single-responsibility modules, nativo ESM, ningún compilación paso, `window.REDAKTOR` debug superficie | Cumplido |
| 7 | 100 % Inglés entregables | Automatizado CJK escaneo a través de todos authored archivos | Cumplido — véase §8 |

---

## 4 · Prueba entorno & método

| Elemento | Valor |
|------|-------|
| OS | macOS (Apple silicon) |
| navegador | Chromium 1254 compilación de el Playwright caché (`Google Chrome for Testing`) |
| Automation | `playwright-core@1.55.0` (solo desarrollo, no entregado) |
| Muestra generator | `pdf-lib@1.17.1` (solo desarrollo) |
| PDF forensics | Python 3 + `pypdf 6.21.4` |
| servidor | `python3 -m http.server 8010` (local estático hosting solo) |
| Muestra | 1-página Un4 (595.28 × 841.89 pt), Helvetica 13–19 pt, 13 líneas de fictional PII |

Muestra contenido: `Klaus Mueller`, birth fecha `14.03.1972`, `Musterstrasse 12, 10115 Berlin`,
`klaus.mueller@kanzlei-beispiel.de`, `+49 30 12345678`, `DE89 3704 0044 0532 0130 00`,
`DE123456789`, `12.450,00 EUR`, `01.10.2026`, caso referencia, seguro número.

Método: drive el real UI (archivo entrada → OCR completion → exportación descargar), entonces verificar el
downloaded PDF twice — una vez con `pypdf` (structure/bytes) y una vez por feeding esto atrás en
pdf.JS dentro el navegador (texto capa + pixel sampling en cada redacción centre).

---

## 5 · Resultados

### 5.1 OCR y detección

| Metric | Resultado |
|--------|--------|
| Páginas created | 1 |
| OCR estado | `done` |
| OCR líneas / palabras | 15 / ≈72 |
| Accepted detections | **10** |
| Regle cobertura en uno aprobado | `personNames`, `iban`, `vatId`, `email`, `phone`, `streetAddress`, `postalCity`, `date` ×2, `amount` |

No detected en este muestra (esperado, reglas deliberadamente narrow): `2024/0815` porque el
Inglés etiqueta “Caso referencia” es no en el Alemán keyword lista; el 9-digit seguro número
porque `longDigits` es apagado por predeterminado. Ambos son one-line configuración cambios (README §4).

### 5.2 Exportación integridad verificación

Two exports eran producido de el mismo página:

| Variant | Archivo tamaño | Páginas | Página tamaño | Texto longitud | `/Font` | `/Annots` | Images | Vector fills |
|---------|-----------|-------|-----------|-------------|---------|-----------|--------|--------------|
| 300 DPI PNG | 155,084 bytes | 1 | 595.28 × 841.89 pt | **0** | `{}` | `[]` | 1 | 10 |
| 150 DPI JPEG | 111,543 bytes | 1 | 595.28 × 841.89 pt | **0** | `{}` | `[]` | 1 | 10 |

- `pypdf.extract_text()` → vacío string para ambos variants.
- Contenido stream contiene **0** text-showing operadores (`Tj`/`TJ`), **0** `BT` bloquea, exactamente
  **1** imagen `Do`, y **10** rellenado negro vector rutas (`0 0 0 rg … m/l/h/f`).
- Byte escaneo para `Klaus`, `Mueller`, `DE89`, `Musterstrasse`, `klaus.mueller`: **0 hits**.
- documento metadatos: title/author/subject/keywords emptied, creator/producer `REDAKTOR`.

### 5.3 Pixel-level verificación (prueba el cajas son burned, no overlaid)

El exportado PDF era cargado atrás en pdf.JS en 2× escala y sampled:

| Comprobar | Resultado |
|-------|--------|
| Texto elementos returned por `getTextContent()` | **0** |
| Pixel en el centre de cada redacción box | **RGB(0, 0, 0)** para todos 10 cajas |
| Página margin muestra (3 %, 4 %) | puro white |
| Renderizar lienzo | completo Un4 en 2×, ningún artefacts |

Porque el negro pixels en vivo en el raster que es drawn en el nuevo PDF, re-OCRing el
salida no puede recover el values; allí es ningún texto capa a select o extract.

### 5.4 Sin conexión / leakage verificación

| Escenario | Resultado |
|----------|--------|
| Normal completo flujo, auditoríun counters | `{ "external": 0, "blocked": 0 }` |
| Difícil sin conexión simulation: cada non-`127.0.0.1` solicitud aborted en el red capa | 0 aborted, completo OCR + exportación aún succeeded |
| Deliberate sonda (`Run connection test` → `https://example.com`) | 1 attempt, **1 bloqueado**, ningún datos enviado |
| navegador consola errores / página errores | **0** |
| CSP | `connect-src 'self' blob: data:`, `object-src 'none'`, `base-uri 'none'`, `form-action 'none'` |

### 5.5 UI comprobaciones

Screenshots captured en 1600 × 1000, 1280 × 800 y en 400 % zoom:

- Three-column diseño (296 px rail / flexible lienzo / 372 px inspector) contiene en ambos sizes.
- redacción bars align con el underlying glyphs; hover revela el original texto en 32 % opacity.
- Exportación pestaña muestra DPI chips, formato chips, vector toggle, destructive-redacción callout y
  en vivo auditoríun bloque.
- Help modal scrolls internally; `Esc` cierra esto.
- Vacío estado, busy estado y toasts renderizar sin overlap después el z-index corrección.

### 5.6 Estático comprobaciones

| Comprobar | Resultado |
|-------|--------|
| `node --check` en todos 19 modules (copied a `.mjs`) | 19/19 aprobado |
| CJK escaneo de 28 authored archivos (`index.html`, ambos Markdown docs, `src/`, `tests/`) | **0 hits** |
| Desactualizado `data-i18n` attributes / i18n código | eliminado |
| Share-package archivo | reconstruido de actual archivos (ningún desactualizado HTML o 7.1 MB modelo) |

---

## 6 · Defectos encontrado durante testing y corregido

| # | Defecto | Raíz causar | Corrección |
|---|--------|-----------|-----|
| 1 | Blank página, aplicación nunca booted | `renderAll()` ejecutado aintes `let renderedPageId` (TDZ) | Movido flujo de trabajo estado declarations encima arranque |
| 2 | `Phone` línea nunca detected | `\b` hace no exist entre un space y `+`, así `+49 …` nunca matched | Pattern anchored con `(?:^|\s)`, separator después country código allowed |
| 3 | `Client name:` etiqueta ignored | Nombre labels eran case-sensitive Alemán nouns | Añadido `NAME_LABELS_CI`, usado para etiqueta matching |
| 4 | consola 404 | Falta favicon | Inline SVG datos-URI icon |
| 5 | Toasts encima modal | Toast `z-index: 80` > modal `60` | Toast stack lowered a `55` |
| 6 | red badge clic hizo nada | Ningún listener wired | Badge abre el Export/audit pane vía `activateTab()` |
| 7 | Dead German-era i18n attributes | Leftover de el eliminado language switch | 69 attributes stripped |
| 8 | Desactualizado compartir archivo | Zip built aintes el modelo corrección | Reconstruido de actual `index.html`, `src/`, `vendor/` |

Regresión ejecutar después cada corrección: OCR → 10 detections, exportación → 0 texto longitud, 0 consola errores.

---

## 7 · Conocido limitaciones (honesto disclosure)

- **Ningún texto capa por diseño**: exportado páginas no puede ser searched o copied. Este es el precio de
  non-recoverability, y es el correcto predeterminado para redacted material.
- Cifrado / password-protected PDF son unsupported; pdf.JS sería necesitar un password prompt UI.
- TIFF entrada es rechazado; handwriting y low-quality escanea reduce OCR recall — manual marcas son
  el respaldo. Solo `deu + eng` models son bundled.
- OCR es serial por diseño; very grande batches son bounded por navegador memoria y son slower que un
  multi-worker compilación sería ser.
- El estático servidor debe stay local; el aplicación confía su propio origen, así do no expose port 8010.
- Detección es rule-based, no semantic: nombres sin salutation/label y rare formats necesitar
  custom términos o manual cajas.

---

## 8 · Reproduce el verificación

```bash
# terminal 1 — serve the app (required: ES modules + WASM workers)
cd /path/to/Aegis/modules/doc-redactor
python3 -m http.server 8010

# terminal 2 — dev-only tooling (not part of the shipped app)
cd tests
npm install --no-save playwright-core@1.55.0 pdf-lib@1.17.1

node generate-sample-pii.cjs          # writes artifacts/sample-pii.pdf
node e2e.cjs                          # OCR → export → forensics → screenshots
```

Entorno variables: `BASE_URL` (predeterminado `http://127.0.0.1:8010/`), `CHROME_PATH`
(opcional; del contrario el installed Chrome canal es usado). Artefactos land en `tests/artifacts/`.

Esperado salida de `e2e.cjs`:

```
PAGES 1
OCR_STATUS done
DETECTIONS 10
EXPORT_TEXT_ITEMS 0
ALL_CENTERS_DARK true
AUDIT {"external":0,"blocked":0}
CONSOLE_ERRORS []
```

---

## 9 · Sign-off

| Puerta de calidad | Resultado |
|------|--------|
| Functional flujo (intake → OCR → detectar → revisión → exportación) | Aprobado |
| Exportación non-recoverability (structure + pixel prueba) | Aprobado |
| Sin conexión / cero externo traffic | Aprobado |
| Modularity & maintainability (19 modules, documentado debug superficie) | Aprobado |
| English-only entregables (automatizado CJK escaneo) | Aprobado |
| Documentación (README + este informe) | Aprobado |

Entregado as un self-contained estático carpeta; ningún compilación paso, ningún installer, ningún red dependencia
en tiempo de ejecución.
