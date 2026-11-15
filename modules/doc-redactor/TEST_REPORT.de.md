<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/doc-redactor/TEST_REPORT.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Lieferung & Engineering Test Bericht — Redaktor

**Projekt**: `doc-redactor` — Browser-only, zero-upload PDF & Bild Schwärzung Engine
**Datum**: 2026-11-09
**Type**: engineering Prüfung Bericht (functional, Sicherheit, Export forensics, offline)
**Constraint Compliance**: 100 % Englisch Ergebnisse, kein Backend, kein Laufzeit Drittanbieter Code
über hinaus der lokal vendiert pdf.JS / pdf-lib / tesseract.JS Assets.

---

## 1 · Ziel recap

Build ein Schwärzung tool für Deutsch Gesetz firms, clinics und HR Teams das muss work ohne irgendein
Netzwerk Zugriff. Schwer requirements von der brief:

1. **Rein front-end OCR** über WebAssembly (Tesseract.JS), niemals ein entfernt API.
2. **Canvas Verarbeitung**: locate vertraulich strings mit regex auf OCR Ausgabe und paint schwarz
   Boxen über ihrer coordinates.
3. **pdf.JS Darstellung + pdf-lib Export** das produces ein **non-recoverable** PDF.
4. **Vollständig offline**: demonstrable null Daten leakage mit Netzwerk cut.
5. **Modular Dateien** für long-term maintenance.
6. **English-only Ergebnisse** (UI Kopie, comments, Dokumentation).

---

## 2 · Was war zugestellt

| Datei | Verantwortung |
|------|----------------|
| `index.html` | Markup, CSP, classic UMD library tags, ES-Modul Eintrag, help modal. |
| `src/js/app.js` | Orchestration: intake, serial OCR Warteschlange, rescan, Export, Registerkarten, shortcuts. |
| `src/js/core/*.js` | Zustand + emitter, utilities, offline Anfrage Wächter. |
| `src/js/ingest/*.js` | Datei classification, 150 DPI Seite Fabrik, previews, thumbnails. |
| `src/js/ocr/engine.js` | Tesseract Arbeiter lifecycle, PSM 3, normalised line/word Boxen. |
| `src/js/pdf/render.js` | pdf.JS Dokument loading und Seite rasterisation. |
| `src/js/detect/*.js` | 15 Regeln + validators, Deutsch lexicon, scanner/dedupe. |
| `src/js/redact/geometry.js` | Normalised box math und overlap ratios. |
| `src/js/view/page-view.js` | Canvas preview, schwarz Boxen, hover reveal, drag-to-mark, zoom. |
| `src/js/export/pdf-builder.js` | Neu PDF construction, raster burning, Vektor overlay, Audit JSON. |
| `src/js/ui/*.js` | Toasts, Dokument Liste, Regel switches, findings, Status bar. |
| `src/css/app.css` | Entwurf Token und Layout (3-column workstation). |
| `README.md` | Benutzer + Maintainer Dokumentation. |
| `TEST_REPORT.md` | Dies Bericht. |
| `tests/` | Nur-Entwicklung reproduzierbar scripts (Beispiel generator + E2E Suite). |
| `vendor/` | Pinned offline Assets: pdf.JS 3.11.174, pdf-lib 1.17.1, tesseract.JS 5.1.1, deu/eng models. |

Zeile Anzahl von hand-written Code: **3,885 Zeilen** über `index.html`, `app.css` und 19 JS modules;
vendiert Assets sind 36 MB und niemals geladen von ein CDN.

---

## 3 · Anforderung Checkliste

| # | Anforderung | Implementierung | Status |
|---|-------------|----------------|--------|
| 1 | Rein client-side WASM OCR | Tesseract.JS 5.1.1 Arbeiter + lokal `tesseract-core` WASM + lokal `deu`/`eng` models, kein Netzwerk | Erfüllt |
| 2 | Canvas + regex coordinate Schwärzung | `scanner.js` maps regex character ranges zu Wort Boxen; `page-view.js` paints sie | Erfüllt |
| 3 | pdf.JS rendern, pdf-lib Export | `render.js` + `pdf-builder.js` rebuild jeder Seite as ein neu PDF | Erfüllt |
| 4 | Non-recoverable Ausgabe | Raster re-render bei Export DPI + burned pixels + optional Vektor rects; original objects, fonts, Text Ebene, annotations, XMP niemals copied | Erfüllt — siehe §5 |
| 5 | Offline / null leakage | CSP + Laufzeit Wächter + sichtbar Audit counters + deliberate blockiert Sonde | Erfüllt — siehe §6 |
| 6 | Modular, maintainable | 19 single-responsibility modules, nativ ESM, kein Build Schritt, `window.REDAKTOR` debug Oberfläche | Erfüllt |
| 7 | 100 % Englisch Ergebnisse | Automatisiert CJK Scan über alle authored Dateien | Erfüllt — siehe §8 |

---

## 4 · Test Umgebung & Methode

| Punkt | Wert |
|------|-------|
| OS | macOS (Apple silicon) |
| Browser | Chromium 1254 Build von der Playwright Cache (`Google Chrome for Testing`) |
| Automation | `playwright-core@1.55.0` (nur-Entwicklung, nicht ausgeliefert) |
| Beispiel generator | `pdf-lib@1.17.1` (nur-Entwicklung) |
| PDF forensics | Python 3 + `pypdf 6.21.4` |
| Server | `python3 -m http.server 8010` (lokal statisch hosting nur) |
| Beispiel | 1-Seite Ein4 (595.28 × 841.89 pt), Helvetica 13–19 pt, 13 Zeilen von fictional PII |

Beispiel Inhalt: `Klaus Mueller`, birth Datum `14.03.1972`, `Musterstrasse 12, 10115 Berlin`,
`klaus.mueller@kanzlei-beispiel.de`, `+49 30 12345678`, `DE89 3704 0044 0532 0130 00`,
`DE123456789`, `12.450,00 EUR`, `01.10.2026`, Fall Referenz, Versicherung Zahl.

Methode: drive der echt UI (Datei Eingabe → OCR completion → Export Herunterladen), dann prüfen der
downloaded PDF twice — einmal mit `pypdf` (structure/bytes) und einmal durch feeding es zurück in
pdf.JS innen Browser (Text Ebene + pixel sampling bei jeder Schwärzung centre).

---

## 5 · Ergebnisse

### 5.1 OCR und Erkennung

| Metric | Ergebnis |
|--------|--------|
| Seiten created | 1 |
| OCR Status | `done` |
| OCR Zeilen / Wörter | 15 / ≈72 |
| Accepted detections | **10** |
| Regel Abdeckung in eine bestanden | `personNames`, `iban`, `vatId`, `email`, `phone`, `streetAddress`, `postalCity`, `date` ×2, `amount` |

Nicht detected in dies Beispiel (erwartet, Regeln absichtlich narrow): `2024/0815` weil der
Englisch Bezeichnung “Fall Referenz” ist nicht in Deutsch keyword Liste; der 9-digit Versicherung Zahl
weil `longDigits` ist aus durch Standard. Beide sind one-line Konfiguration Änderungen (README §4).

### 5.2 Export Integrität Prüfung

Two exports waren erzeugt von der gleich Seite:

| Variant | Datei Größe | Seiten | Seite Größe | Text Länge | `/Font` | `/Annots` | Images | Vektor fills |
|---------|-----------|-------|-----------|-------------|---------|-----------|--------|--------------|
| 300 DPI PNG | 155,084 Bytes | 1 | 595.28 × 841.89 pt | **0** | `{}` | `[]` | 1 | 10 |
| 150 DPI JPEG | 111,543 Bytes | 1 | 595.28 × 841.89 pt | **0** | `{}` | `[]` | 1 | 10 |

- `pypdf.extract_text()` → leer string für beide variants.
- Inhalt stream enthält **0** text-showing Bediener (`Tj`/`TJ`), **0** `BT` blockiert, genau
  **1** Bild `Do`, und **10** ausgefüllt schwarz Vektor Pfade (`0 0 0 rg … m/l/h/f`).
- Byte Scan für `Klaus`, `Mueller`, `DE89`, `Musterstrasse`, `klaus.mueller`: **0 hits**.
- Dokument Metadaten: title/author/subject/keywords emptied, creator/producer `REDAKTOR`.

### 5.3 Pixel-level Prüfung (Nachweis Boxen sind burned, nicht overlaid)

Der exportiert PDF war geladen zurück in pdf.JS bei 2× Skalierung und sampled:

| Prüfen | Ergebnis |
|-------|--------|
| Text Elemente returned durch `getTextContent()` | **0** |
| Pixel bei der centre von jeder Schwärzung box | **RGB(0, 0, 0)** für alle 10 Boxen |
| Seite margin Beispiel (3 %, 4 %) | rein white |
| Rendern Canvas | vollständig Ein4 bei 2×, kein artefacts |

Weil der schwarz pixels live in der raster das ist drawn in der neu PDF, re-OCRing der
Ausgabe kann nicht recover der values; dort ist kein Text Ebene zu select oder extract.

### 5.4 Offline / leakage Prüfung

| Szenario | Ergebnis |
|----------|--------|
| Normal vollständig Ablauf, Audit counters | `{ "external": 0, "blocked": 0 }` |
| Schwer offline simulation: jeder non-`127.0.0.1` Anfrage aborted bei Netzwerk Ebene | 0 aborted, vollständig OCR + Export noch succeeded |
| Deliberate Sonde (`Run connection test` → `https://example.com`) | 1 attempt, **1 blockiert**, kein Daten gesendet |
| Browser Konsole Fehler / Seite Fehler | **0** |
| CSP | `connect-src 'self' blob: data:`, `object-src 'none'`, `base-uri 'none'`, `form-action 'none'` |

### 5.5 UI Prüfungen

Screenshots captured bei 1600 × 1000, 1280 × 800 und bei 400 % zoom:

- Three-column Layout (296 px rail / flexible Canvas / 372 px inspector) enthält bei beide sizes.
- Schwärzung bars align mit der underlying glyphs; hover enthüllt der original Text bei 32 % opacity.
- Export Registerkarte zeigt DPI chips, Format chips, Vektor toggle, destructive-Schwärzung callout und
  live Audit Block.
- Help modal scrolls internally; `Esc` schließt es.
- Leer Zustand, busy Zustand und toasts rendern ohne overlap nach der z-index Kcorrektur.

### 5.6 Statisch Prüfungen

| Prüfen | Ergebnis |
|-------|--------|
| `node --check` auf alle 19 modules (copied zu `.mjs`) | 19/19 bestanden |
| CJK Scan von 28 authored Dateien (`index.html`, beide Markdown docs, `src/`, `tests/`) | **0 hits** |
| Veraltet `data-i18n` attributes / i18n Code | entfernt |
| Share-package Archiv | neu gebaut von aktuell Dateien (kein veraltet HTML oder 7.1 MB Modell) |

---

## 6 · Fehler gefunden während testing und behoben

| # | Fehler | Wurzel verursachen | Kcorrektur |
|---|--------|-----------|-----|
| 1 | Blank Seite, App niemals booted | `renderAll()` ausgeführt vor `let renderedPageId` (TDZ) | Verschoben Workflow Zustand declarations oben Start |
| 2 | `Phone` Zeile niemals detected | `\b` macht nicht exist zwischen ein space und `+`, so `+49 …` niemals matched | Pattern anchored mit `(?:^|\s)`, separator nach country Code allowed |
| 3 | `Client name:` Bezeichnung ignored | Name labels waren case-sensitive Deutsch nouns | Hinzugefügt `NAME_LABELS_CI`, verwendet für Bezeichnung matching |
| 4 | Konsole 404 | Fehlt favicon | Inline SVG Daten-URI icon |
| 5 | Toasts oben modal | Toast `z-index: 80` > modal `60` | Toast stack lowered zu `55` |
| 6 | Netzwerk badge Klick tat nichts | Kein listener wired | Badge öffnet der Export/audit pane über `activateTab()` |
| 7 | Dead German-era i18n attributes | Leftover von der entfernt language switch | 69 attributes stripped |
| 8 | Veraltet teilen Archiv | Zip built vor Modell Kcorrektur | Neu gebaut von aktuell `index.html`, `src/`, `vendor/` |

Regression ausführen nach jeder Kcorrektur: OCR → 10 detections, Export → 0 Text Länge, 0 Konsole Fehler.

---

## 7 · Bekannt Einschränkungen (ehrlich disclosure)

- **Kein Text Ebene durch Entwurf**: exportiert Seiten kann nicht sein searched oder copied. Dies ist Preis von
  non-recoverability, und ist der korrekt Standard für redacted Material.
- Verschlüsselt / password-protected PDFs sind unsupported; pdf.JS würde brauchen ein password prompt UI.
- TIFF Eingabe ist abgelehnt; handwriting und low-quality scannt reduce OCR recall — Handbuch Kennzeichen sind
  Rückfallebene. Nur `deu + eng` models sind bundled.
- OCR ist serial durch Entwurf; very groß batches sind bounded durch Browser Speicher und sind slower als ein
  multi-worker Build würde sein.
- Der statisch Server muss stay lokal; App vertraut seiner eigen Herkunft, so do nicht expose port 8010.
- Erkennung ist rule-based, nicht semantic: Namen ohne salutation/label und rare formats brauchen
  custom Bedingungen oder Handbuch Boxen.

---

## 8 · Reproduce Prüfung

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

Umgebung variables: `BASE_URL` (Standard `http://127.0.0.1:8010/`), `CHROME_PATH`
(optional; anderenfalls der installed Chrome Kanal ist verwendet). Artefakte land in `tests/artifacts/`.

Erwartet Ausgabe von `e2e.cjs`:

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

| Gate | Ergebnis |
|------|--------|
| Functional Ablauf (intake → OCR → erkennen → Prüfung → Export) | Bestanden |
| Export non-recoverability (structure + pixel Nachweis) | Bestanden |
| Offline / null extern traffic | Bestanden |
| Modularity & maintainability (19 modules, dokumentiert debug Oberfläche) | Bestanden |
| English-only Ergebnisse (automatisiert CJK Scan) | Bestanden |
| Dokumentation (README + dies Bericht) | Bestanden |

Zugestellt as ein self-contained statisch Ordner; kein Build Schritt, kein installer, kein Netzwerk Abhängigkeit
bei Laufzeit.
