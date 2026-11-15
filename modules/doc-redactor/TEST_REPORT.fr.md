<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/doc-redactor/TEST_REPORT.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Livraison & Engineering Test Rapport — Rédacteur

**Projet**: `doc-redactor` — navigateur-only, zero-upload PDF & image caviardage moteur
**Date**: 2026-11-09
**Type**: engineering vérification rapport (functional, sécurité, export forensics, hors ligne)
**Constraint conformité**: 100 % Anglais livrables, aucun backend, aucun runtime tiers code
au-delà le localement embarqué pdf.JS / pdf-lib / tesseract.JS actifs.

---

## 1 · Objectif recap

Build un caviardage tool pour Allemand loi firms, clinics et HR équipes que doit work sans aucun
réseau accès. Difficile requirements de le brief:

1. **Pur front-end OCR** via WebAssembly (Tesseract.JS), jamais un distant API.
2. **Canvas traitement**: locate sensible strings avec regex sur OCR sortie et paint noir
   boîtes au-dessus de leur coordinates.
3. **pdf.JS rendu + pdf-lib export** que produces un **non-recoverable** PDF.
4. **Entièrement hors ligne**: demonstrable zéro données leakage avec le réseau cut.
5. **Modular fichiers** pour long-term maintenance.
6. **English-only livrables** (UI copie, comments, documentation).

---

## 2 · Quoi était livré

| Fichier | Responsabilité |
|------|----------------|
| `index.html` | Markup, CSP, classic UMD library tags, ES-module entrée, help modal. |
| `src/js/app.js` | Orchestration: intake, serial OCR file d'attente, rescan, export, onglets, shortcuts. |
| `src/js/core/*.js` | État + emitter, utilities, hors ligne requête garde. |
| `src/js/ingest/*.js` | Fichier classification, 150 DPI page usine, previews, thumbnails. |
| `src/js/ocr/engine.js` | Tesseract worker lifecycle, PSM 3, normalised line/word boîtes. |
| `src/js/pdf/render.js` | pdf.JS document loading et page rasterisation. |
| `src/js/detect/*.js` | 15 règles + validators, Allemand lexicon, scanner/dedupe. |
| `src/js/redact/geometry.js` | Normalised box math et overlap ratios. |
| `src/js/view/page-view.js` | Canvas preview, noir boîtes, hover reveal, drag-to-mark, zoom. |
| `src/js/export/pdf-builder.js` | Nouveau PDF construction, raster burning, vecteur overlay, audit JSON. |
| `src/js/ui/*.js` | Toasts, document liste, règle switches, findings, statut bar. |
| `src/css/app.css` | Conception jetons et mise en page (3-column workstation). |
| `README.md` | Utilisateur + mainteneur documentation. |
| `TEST_REPORT.md` | Ce rapport. |
| `tests/` | Développement uniquement reproductible scripts (exemple generator + E2E suite). |
| `vendor/` | Pinned hors ligne actifs: pdf.JS 3.11.174, pdf-lib 1.17.1, tesseract.JS 5.1.1, deu/eng models. |

Ligne nombre de hand-written code: **3,885 lignes** à travers `index.html`, `app.css` et 19 JS modules;
embarqué actifs sont 36 MB et jamais chargé de un CDN.

---

## 3 · Exigence liste de contrôle

| # | Exigence | Implémentation | Statut |
|---|-------------|----------------|--------|
| 1 | Pur client-side WASM OCR | Tesseract.JS 5.1.1 worker + local `tesseract-core` WASM + local `deu`/`eng` models, aucun réseau | Rempli |
| 2 | Canvas + regex coordinate caviardage | `scanner.js` maps regex character ranges à mot boîtes; `page-view.js` paints eux | Rempli |
| 3 | pdf.JS rendre, pdf-lib export | `render.js` + `pdf-builder.js` rebuild chaque page as un nouveau PDF | Rempli |
| 4 | Non-recoverable sortie | Raster re-render à export DPI + burned pixels + facultatif vecteur rects; original objects, fonts, texte couche, annotations, XMP jamais copied | Rempli — voir §5 |
| 5 | Hors ligne / zéro leakage | CSP + runtime garde + visible audit counters + deliberate bloqué sonde | Rempli — voir §6 |
| 6 | Modular, maintainable | 19 single-responsibility modules, natif ESM, aucun build étape, `window.REDAKTOR` debug surface | Rempli |
| 7 | 100 % Anglais livrables | Automatisé CJK balayage à travers tous authored fichiers | Rempli — voir §8 |

---

## 4 · Test environnement & méthode

| Élément | Valeur |
|------|-------|
| OS | macOS (Apple silicon) |
| navigateur | Chromium 1254 build de le Playwright cache (`Google Chrome for Testing`) |
| Automation | `playwright-core@1.55.0` (développement uniquement, ne pas livré) |
| Exemple generator | `pdf-lib@1.17.1` (développement uniquement) |
| PDF forensics | Python 3 + `pypdf 6.21.4` |
| serveur | `python3 -m http.server 8010` (local statique hosting uniquement) |
| Exemple | 1-page Un4 (595.28 × 841.89 pt), Helvetica 13–19 pt, 13 lignes de fictional PII |

Exemple contenu: `Klaus Mueller`, birth date `14.03.1972`, `Musterstrasse 12, 10115 Berlin`,
`klaus.mueller@kanzlei-beispiel.de`, `+49 30 12345678`, `DE89 3704 0044 0532 0130 00`,
`DE123456789`, `12.450,00 EUR`, `01.10.2026`, cas référence, assurance nombre.

Méthode: drive le rél UI (fichier entrée → OCR completion → export télécharger), alors vérifier le
downloaded PDF twice — une fois avec `pypdf` (structure/bytes) et une fois par feeding il retour dans
pdf.JS à l.íntérieur le navigateur (texte couche + pixel sampling à chaque caviardage centre).

---

## 5 · Résultats

### 5.1 OCR et détection

| Metric | Résultat |
|--------|--------|
| Pages created | 1 |
| OCR statut | `done` |
| OCR lignes / mots | 15 / ≈72 |
| Accepted detections | **10** |
| Règle couverture dans un résumi | `personNames`, `iban`, `vatId`, `email`, `phone`, `streetAddress`, `postalCity`, `date` ×2, `amount` |

Ne pas detected dans ce exemple (attendu, règles délibérément narrow): `2024/0815` parce que le
Anglais libellé “Cas référence” est ne pas dans le Allemand keyword liste; le 9-digit assurance nombre
parce que `longDigits` est désactivé par par défaut. Les deux sont one-line configuration modifications (README §4).

### 5.2 Export intégrité vérification

Two exports étaient produit de le même page:

| Variant | Fichier taille | Pages | Page taille | Texte longueur | `/Font` | `/Annots` | Images | Vecteur fills |
|---------|-----------|-------|-----------|-------------|---------|-----------|--------|--------------|
| 300 DPI PNG | 155,084 octets | 1 | 595.28 × 841.89 pt | **0** | `{}` | `[]` | 1 | 10 |
| 150 DPI JPEG | 111,543 octets | 1 | 595.28 × 841.89 pt | **0** | `{}` | `[]` | 1 | 10 |

- `pypdf.extract_text()` → vide string pour les deux variants.
- Contenu stream contient **0** text-showing opérateurs (`Tj`/`TJ`), **0** `BT` bloque, exactement
  **1** image `Do`, et **10** rempli noir vecteur chemins (`0 0 0 rg … m/l/h/f`).
- Octet balayage pour `Klaus`, `Mueller`, `DE89`, `Musterstrasse`, `klaus.mueller`: **0 hits**.
- document métadonnées: title/author/subject/keywords emptied, creator/producer `REDAKTOR`.

### 5.3 Pixel-level vérification (preuve le boîtes sont burned, ne pas overlaid)

Le exporté PDF était chargé retour dans pdf.JS à 2× échelle et sampled:

| Vérifier | Résultat |
|-------|--------|
| Texte éléments returned par `getTextContent()` | **0** |
| Pixel à le centre de chaque caviardage box | **RGB(0, 0, 0)** pour tous 10 boîtes |
| Page margin exemple (3 %, 4 %) | pur white |
| Rendre canvas | complet Un4 à 2×, aucun artefacts |

Parce que le noir pixels direct dans le raster que est drawn dans le nouveau PDF, re-OCRing le
sortie ne peut pas recover le values; là est aucun texte couche à select ou extract.

### 5.4 Hors ligne / leakage vérification

| Scénario | Résultat |
|----------|--------|
| Normal complet flux, audit counters | `{ "external": 0, "blocked": 0 }` |
| Difficile hors ligne simulation: chaque non-`127.0.0.1` requête aborted à le réseau couche | 0 aborted, complet OCR + export encore succeeded |
| Deliberate sonde (`Run connection test` → `https://example.com`) | 1 attempt, **1 bloqué**, aucun données envoyé |
| navigateur console erreurs / page erreurs | **0** |
| CSP | `connect-src 'self' blob: data:`, `object-src 'none'`, `base-uri 'none'`, `form-action 'none'` |

### 5.5 UI contrôles

Screenshots captured à 1600 × 1000, 1280 × 800 et à 400 % zoom:

- Three-column mise en page (296 px rail / flexible canvas / 372 px inspector) contient à les deux sizes.
- caviardage bars align avec le underlying glyphs; hover révèle le original texte à 32 % opacity.
- Export onglet affiche DPI chips, format chips, vecteur toggle, destructive-caviardage callout et
  direct audit bloc.
- Help modal scrolls internally; `Esc` ferme il.
- Vide état, busy état et toasts rendre sans overlap après le z-index correctif.

### 5.6 Statique contrôles

| Vérifier | Résultat |
|-------|--------|
| `node --check` sur tous 19 modules (copied à `.mjs`) | 19/19 résumi |
| CJK balayage de 28 authored fichiers (`index.html`, les deux Markdown docs, `src/`, `tests/`) | **0 hits** |
| Périmé `data-i18n` attributes / i18n code | retiré |
| Share-package archive | reconstruit de actuel fichiers (aucun périmé HTML ou 7.1 MB modèle) |

---

## 6 · Défauts trouvé pendant testing et corrigé

| # | Défaut | Racine provoquer | Correctif |
|---|--------|-----------|-----|
| 1 | Blank page, application jamais booted | `renderAll()` exécuté avant `let renderedPageId` (TDZ) | Déplacé flux de travail état declarations ci-dessus démarrage |
| 2 | `Phone` ligne jamais detected | `\b` fait ne pas exist entre un space et `+`, donc `+49 …` jamais matched | Pattern anchored avec `(?:^|\s)`, separator après country code allowed |
| 3 | `Client name:` libellé ignored | Nom labels étaient case-sensitive Allemand nouns | Ajouté `NAME_LABELS_CI`, utilisé pour libellé matching |
| 4 | console 404 | Manquant favicon | Inline SVG données-URI icon |
| 5 | Toasts ci-dessus modal | Toast `z-index: 80` > modal `60` | Toast stack lowered à `55` |
| 6 | réseau badge clic fait rien | Aucun listener wired | Badge ouvre le Export/audit pane via `activateTab()` |
| 7 | Dead German-era i18n attributes | Leftover de le retiré language switch | 69 attributes stripped |
| 8 | Périmé partager archive | Zip built avant le modèle correctif | Reconstruit de actuel `index.html`, `src/`, `vendor/` |

Régression exécuter après chaque correctif: OCR → 10 detections, export → 0 texte longueur, 0 console erreurs.

---

## 7 · Connu limitations (honête disclosure)

- **Aucun texte couche par conception**: exporté pages ne peut pas être searched ou copied. Ce est le prix de
  non-recoverability, et est le correct par défaut pour redacted matériel.
- Chiffré / password-protected PDF sont unsupported; pdf.JS serait besoin un password prompt UI.
- TIFF entrée est rejeté; handwriting et low-quality balaye reduce OCR recall — manuel marques sont
  le repli. Uniquement `deu + eng` models sont bundled.
- OCR est serial par conception; very grand batches sont bounded par navigateur mémoire et sont slower que un
  multi-worker build serait être.
- Le statique serveur doit stay local; le application fait confiance son propre origine, donc do ne pas expose port 8010.
- Détection est rule-based, ne pas semantic: noms sans salutation/label et rare formats besoin
  custom conditions ou manuel boîtes.

---

## 8 · Reproduce le vérification

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

Environnement variables: `BASE_URL` (par défaut `http://127.0.0.1:8010/`), `CHROME_PATH`
(facultatif; sinon le installed Chrome canal est utilisé). Artefacts land dans `tests/artifacts/`.

Attendu sortie de `e2e.cjs`:

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

| Gate | Résultat |
|------|--------|
| Functional flux (intake → OCR → détecter → revue → export) | Résumi |
| Export non-recoverability (structure + pixel preuve) | Résumi |
| Hors ligne / zéro externe traffic | Résumi |
| Modularity & maintainability (19 modules, documenté debug surface) | Résumi |
| English-only livrables (automatisé CJK balayage) | Résumi |
| Documentation (README + ce rapport) | Résumi |

Livré as un self-contained statique dossier; aucun build étape, aucun installer, aucun réseau dépendance
à runtime.
