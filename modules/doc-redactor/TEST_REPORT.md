# Delivery & Engineering Test Report — REDAKTOR

**Project**: `doc-redactor` — browser-only, zero-upload PDF & image redaction engine
**Date**: 2026-11-09
**Type**: engineering verification report (functional, security, export forensics, offline)
**Constraint compliance**: 100 % English deliverables, no backend, no runtime third-party code
beyond the locally vendored pdf.js / pdf-lib / tesseract.js assets.

---

## 1 · Objective recap

Build a redaction tool for German law firms, clinics and HR teams that must work without any
network access. Hard requirements from the brief:

1. **Pure front-end OCR** via WebAssembly (Tesseract.js), never a remote API.
2. **Canvas processing**: locate sensitive strings with regex on OCR output and paint black
   boxes over their coordinates.
3. **pdf.js rendering + pdf-lib export** that produces a **non-recoverable** PDF.
4. **Fully offline**: demonstrable zero data leakage with the network cut.
5. **Modular files** for long-term maintenance.
6. **English-only deliverables** (UI copy, comments, documentation).

---

## 2 · What was delivered

| File | Responsibility |
|------|----------------|
| `index.html` | Markup, CSP, classic UMD library tags, ES-module entry, help modal. |
| `src/js/app.js` | Orchestration: intake, serial OCR queue, rescan, export, tabs, shortcuts. |
| `src/js/core/*.js` | State + emitter, utilities, offline request guard. |
| `src/js/ingest/*.js` | File classification, 150 DPI page factory, previews, thumbnails. |
| `src/js/ocr/engine.js` | Tesseract worker lifecycle, PSM 3, normalised line/word boxes. |
| `src/js/pdf/render.js` | pdf.js document loading and page rasterisation. |
| `src/js/detect/*.js` | 15 rules + validators, German lexicon, scanner/dedupe. |
| `src/js/redact/geometry.js` | Normalised box math and overlap ratios. |
| `src/js/view/page-view.js` | Canvas preview, black boxes, hover reveal, drag-to-mark, zoom. |
| `src/js/export/pdf-builder.js` | New PDF construction, raster burning, vector overlay, audit JSON. |
| `src/js/ui/*.js` | Toasts, document list, rule switches, findings, status bar. |
| `src/css/app.css` | Design tokens and layout (3-column workstation). |
| `README.md` | User + maintainer documentation. |
| `TEST_REPORT.md` | This report. |
| `tests/` | Dev-only reproducible scripts (sample generator + E2E suite). |
| `vendor/` | Pinned offline assets: pdf.js 3.11.174, pdf-lib 1.17.1, tesseract.js 5.1.1, deu/eng models. |

Line count of hand-written code: **3,885 lines** across `index.html`, `app.css` and 19 JS modules;
vendored assets are 36 MB and never loaded from a CDN.

---

## 3 · Requirement checklist

| # | Requirement | Implementation | Status |
|---|-------------|----------------|--------|
| 1 | Pure client-side WASM OCR | Tesseract.js 5.1.1 worker + local `tesseract-core` WASM + local `deu`/`eng` models, no network | Met |
| 2 | Canvas + regex coordinate redaction | `scanner.js` maps regex character ranges to word boxes; `page-view.js` paints them | Met |
| 3 | pdf.js render, pdf-lib export | `render.js` + `pdf-builder.js` rebuild every page as a new PDF | Met |
| 4 | Non-recoverable output | Raster re-render at export DPI + burned pixels + optional vector rects; original objects, fonts, text layer, annotations, XMP never copied | Met — see §5 |
| 5 | Offline / zero leakage | CSP + runtime guard + visible audit counters + deliberate blocked probe | Met — see §6 |
| 6 | Modular, maintainable | 19 single-responsibility modules, native ESM, no build step, `window.REDAKTOR` debug surface | Met |
| 7 | 100 % English deliverables | Automated CJK scan across all authored files | Met — see §8 |

---

## 4 · Test environment & method

| Item | Value |
|------|-------|
| OS | macOS (Apple silicon) |
| Browser | Chromium 1254 build from the Playwright cache (`Google Chrome for Testing`) |
| Automation | `playwright-core@1.55.0` (dev-only, not shipped) |
| Sample generator | `pdf-lib@1.17.1` (dev-only) |
| PDF forensics | Python 3 + `pypdf 6.21.4` |
| Server | `python3 -m http.server 8010` (local static hosting only) |
| Sample | 1-page A4 (595.28 × 841.89 pt), Helvetica 13–19 pt, 13 lines of fictional PII |

Sample content: `Klaus Mueller`, birth date `14.03.1972`, `Musterstrasse 12, 10115 Berlin`,
`klaus.mueller@kanzlei-beispiel.de`, `+49 30 12345678`, `DE89 3704 0044 0532 0130 00`,
`DE123456789`, `12.450,00 EUR`, `01.10.2026`, case reference, insurance number.

Method: drive the real UI (file input → OCR completion → export download), then verify the
downloaded PDF twice — once with `pypdf` (structure/bytes) and once by feeding it back into
pdf.js inside the browser (text layer + pixel sampling at every redaction centre).

---

## 5 · Results

### 5.1 OCR and detection

| Metric | Result |
|--------|--------|
| Pages created | 1 |
| OCR status | `done` |
| OCR lines / words | 15 / ≈72 |
| Accepted detections | **10** |
| Rule coverage in one pass | `personNames`, `iban`, `vatId`, `email`, `phone`, `streetAddress`, `postalCity`, `date` ×2, `amount` |

Not detected in this sample (expected, rules intentionally narrow): `2024/0815` because the
English label “Case reference” is not in the German keyword list; the 9-digit insurance number
because `longDigits` is off by default. Both are one-line configuration changes (README §4).

### 5.2 Export integrity verification

Two exports were produced from the same page:

| Variant | File size | Pages | Page size | Text length | `/Font` | `/Annots` | Images | Vector fills |
|---------|-----------|-------|-----------|-------------|---------|-----------|--------|--------------|
| 300 DPI PNG | 155,084 bytes | 1 | 595.28 × 841.89 pt | **0** | `{}` | `[]` | 1 | 10 |
| 150 DPI JPEG | 111,543 bytes | 1 | 595.28 × 841.89 pt | **0** | `{}` | `[]` | 1 | 10 |

- `pypdf.extract_text()` → empty string for both variants.
- Content stream contains **0** text-showing operators (`Tj`/`TJ`), **0** `BT` blocks, exactly
  **1** image `Do`, and **10** filled black vector paths (`0 0 0 rg … m/l/h/f`).
- Byte scan for `Klaus`, `Mueller`, `DE89`, `Musterstrasse`, `klaus.mueller`: **0 hits**.
- Document metadata: title/author/subject/keywords emptied, creator/producer `REDAKTOR`.

### 5.3 Pixel-level verification (proof the boxes are burned, not overlaid)

The exported PDF was loaded back into pdf.js at 2× scale and sampled:

| Check | Result |
|-------|--------|
| Text items returned by `getTextContent()` | **0** |
| Pixel at the centre of each redaction box | **RGB(0, 0, 0)** for all 10 boxes |
| Page margin sample (3 %, 4 %) | pure white |
| Render canvas | full A4 at 2×, no artefacts |

Because the black pixels live in the raster that is drawn into the new PDF, re-OCRing the
output cannot recover the values; there is no text layer to select or extract.

### 5.4 Offline / leakage verification

| Scenario | Result |
|----------|--------|
| Normal full flow, audit counters | `{ "external": 0, "blocked": 0 }` |
| Hard offline simulation: every non-`127.0.0.1` request aborted at the network layer | 0 aborted, full OCR + export still succeeded |
| Deliberate probe (`Run connection test` → `https://example.com`) | 1 attempt, **1 blocked**, no data sent |
| Browser console errors / page errors | **0** |
| CSP | `connect-src 'self' blob: data:`, `object-src 'none'`, `base-uri 'none'`, `form-action 'none'` |

### 5.5 UI checks

Screenshots captured at 1600 × 1000, 1280 × 800 and at 400 % zoom:

- Three-column layout (296 px rail / flexible canvas / 372 px inspector) holds at both sizes.
- Redaction bars align with the underlying glyphs; hover reveals the original text at 32 % opacity.
- Export tab shows DPI chips, format chips, vector toggle, destructive-redaction callout and
  live audit block.
- Help modal scrolls internally; `Esc` closes it.
- Empty state, busy state and toasts render without overlap after the z-index fix.

### 5.6 Static checks

| Check | Result |
|-------|--------|
| `node --check` on all 19 modules (copied to `.mjs`) | 19/19 pass |
| CJK scan of 28 authored files (`index.html`, both Markdown docs, `src/`, `tests/`) | **0 hits** |
| Stale `data-i18n` attributes / i18n code | removed |
| Share-package archive | rebuilt from current files (no stale HTML or 7.1 MB model) |

---

## 6 · Defects found during testing and fixed

| # | Defect | Root cause | Fix |
|---|--------|-----------|-----|
| 1 | Blank page, app never booted | `renderAll()` executed before `let renderedPageId` (TDZ) | Moved workflow state declarations above boot |
| 2 | `Phone` line never detected | `\b` does not exist between a space and `+`, so `+49 …` never matched | Pattern anchored with `(?:^|\s)`, separator after country code allowed |
| 3 | `Client name:` label ignored | Name labels were case-sensitive German nouns | Added `NAME_LABELS_CI`, used for label matching |
| 4 | Console 404 | Missing favicon | Inline SVG data-URI icon |
| 5 | Toasts above modal | Toast `z-index: 80` > modal `60` | Toast stack lowered to `55` |
| 6 | Network badge click did nothing | No listener wired | Badge opens the Export/audit pane via `activateTab()` |
| 7 | Dead German-era i18n attributes | Leftover from the removed language switch | 69 attributes stripped |
| 8 | Stale share archive | Zip built before the model fix | Rebuilt from current `index.html`, `src/`, `vendor/` |

Regression run after every fix: OCR → 10 detections, export → 0 text length, 0 console errors.

---

## 7 · Known limitations (honest disclosure)

- **No text layer by design**: exported pages cannot be searched or copied. This is the price of
  non-recoverability, and is the correct default for redacted material.
- Encrypted / password-protected PDFs are unsupported; pdf.js would need a password prompt UI.
- TIFF input is rejected; handwriting and low-quality scans reduce OCR recall — manual marks are
  the fallback. Only `deu + eng` models are bundled.
- OCR is serial by design; very large batches are bounded by browser memory and are slower than a
  multi-worker build would be.
- The static server must stay local; the app trusts its own origin, so do not expose port 8010.
- Detection is rule-based, not semantic: names without salutation/label and rare formats need
  custom terms or manual boxes.

---

## 8 · Reproduce the verification

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

Environment variables: `BASE_URL` (default `http://127.0.0.1:8010/`), `CHROME_PATH`
(optional; otherwise the installed Chrome channel is used). Artifacts land in `tests/artifacts/`.

Expected output of `e2e.cjs`:

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

| Gate | Result |
|------|--------|
| Functional flow (intake → OCR → detect → review → export) | Pass |
| Export non-recoverability (structure + pixel proof) | Pass |
| Offline / zero external traffic | Pass |
| Modularity & maintainability (19 modules, documented debug surface) | Pass |
| English-only deliverables (automated CJK scan) | Pass |
| Documentation (README + this report) | Pass |

Delivered as a self-contained static folder; no build step, no installer, no network dependency
at runtime.
