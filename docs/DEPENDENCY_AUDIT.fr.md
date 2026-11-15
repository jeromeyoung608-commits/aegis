<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/DEPENDENCY_AUDIT.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Aegis dépendance et "hand-written" audit (2026-11-12)

Portée: `~/Documents/Aegis` (aegis-shell + 11 modules)
One-line conclusion: **le noyau est hand-written, mais "100% zéro dépendance" fait ne pas hold** — 3 tiers libraries (5 composants) sont embarqué dans le dépôt, et 1 Node processus s.exécute.

---

## 1. Faits (sûr à quote externally)

| Élément | Fact | Comment il était vérifié |
|---|---|---|
| Hand-written code volume | **19,554 lignes** (.js/.mjs/.html/.css, excluding vendor, node_modules, tests); de lequel en clair JS **15,221 lignes**, WGSL shaders **119 lignes** | `find … \| xargs wc -l` |
| Structure | 1 shell + **11 modules** (webgpu-topologie / doc-rédacteur / zero-knowledge-identity / p2p-crypto-transfer / encrypted-archive / audit-timeline / jeton-gate / blind-relais / detached-empreinte-signataire / sync-canvas / e2e-signed-delivery) | `ls modules` |
| Racine paquet.json | **0 runtime dépendances**; le uniquement script est `npm test` | fichier contenu |
| Shell paquet.json | **0 dépendances** | fichier contenu |
| Tiers libraries (document caviardage module) | `pdf.js 3.11.174` (Apache-2.0), `pdf-lib 1.17.1` (MIT), `tesseract.js 5.1.1` (Apache-2.0), `tesseract.js-core 5.1.1` (Apache-2.0), `tessdata deu+eng` (Apache-2.0) | `modules/doc-redactor/vendor/MANIFEST.json` + `THIRD_PARTY_NOTICES.md` |
| Vendor taille | `doc-redactor/vendor` **35 MB**; `e2e-signed-delivery/vendor/pdf-lib` 524 KB | `du -sh` |
| Runtime réseau requêtes | **0** (tout loads localement: `./vendor/pdfjs/pdf.min.js`, `./vendor/tesseract/worker.min.js`, `langPath=./vendor/tessdata`) | `grep -rn "vendor/"` plus un enregistré DevTools nombre de `0 'external requests'` |
| Test-only (ne pas livré avec le runtime) | `playwright-core 1.55.0`, `playwright ^1.65.0`, `pdf-lib 1.17.1` (e2e repo) | devDependencies de le respective modules |
| Backend | **1 Node processus**, `server.js`: zéro dépendance (`node:http/https/fs/path/url` + le in-repo jeton-gate), responsable pour ① statique fichier service ② sending COOP/COEP donc pages sont cross-origin isolé (requis pour SharedArrayBuffer) ③ WebRTC signalling relais (voit SDP/ICE uniquement, jamais octets ou clés) | en-tête comment dans `server.js` |

## 2. Quoi est genuinely hand-written

- **Hand-written**: WebGPU topologie rendu (device/pipelines/camera/physics worker + 119 lignes de WGSL), le event-bus shell et son s sept étapes état machine, AES-GCM chunked chiffrement avec PBKDF2 derivation, ECDSA signature et vérification, WebRTC DataChannel transport, OPFS chiffré archive, empreinte-chain audit, jeton-gate salle jetons.
- **Ne pas hand-written (embarqué)**: PDF **parsing** (pdf.JS), PDF **writing** (pdf-lib), le **OCR moteur** (Tesseract + language models). Le destructive overwrite logique de le caviardage étape (`fillRect` au-dessus de le original pixels) est hand-written, mais rendu le PDF à un canvas premier dépend sur pdf.JS.
- **Ne pas hand-written (processus)**: `server.js` est self-written, mais il est genuinely un backend processus que a à exécuter.

## 3. Périmé formulation dans le video script

| Actuel ligne | Problem | Recommendation |
|---|---|---|
| "aucun framework, aucun dépendances, rien pulled de un registry à exécuter temps" | le premier half est vrai, `no dependencies` est ne pas | modification à "aucun framework, aucun npm installer" et état plainly que le trois libraries sont embarqué dans le dépôt |
| "Aucun relais, aucun backend, aucun file d'attente dans le middle" | le octets indeed bypass un relais, mais establishing le connexion nécessite un signalling serveur | "aucun relais pour le octets", plus un note que signalling uniquement exchanges addresses |
| "zéro backend" (fin carte) | là est un `server.js` | modification à "un signalling relais", ou "un statique serveur" |
| "0 externe requêtes" | **vrai** (DevTools nombre de le actual recording) | conserver |

## 4. Suspicious findings de le audit (code untouched, enregistré uniquement)

- `modules/doc-redactor/vendor/MANIFEST.json` declares un SHA-256 manifest, mais `tessdata` est stocké as `.gz` dans le dépôt; si il est unpacked à déploiement temps son empreinte va ne pas match le manifest — re-verify contre le MANIFEST avant version.
- `e2e-signed-delivery` également vendors un copie de `pdf-lib` (pour test fixtures). Il est le même version as le doc-rédacteur copie mais maintained independently, donc il comptes as un duplicated dépendance.
- Le racine `package.json` says "zéro runtime dépendances". Strictly il devrait dire "zéro npm dépendances", sinon il conflicts avec le embarqué faits.
- **Le shell dépend sur pdf-lib indirectly à travers le SDK**: `aegis-shell/src/app.js:46` et `src/identity.js:40` les deux `import` de `/modules/e2e-signed-delivery/src/sdk/pdf.js`, lequel utilise `window.PDFLib` internally; mais `aegis-shell/index.html` uniquement loads `./src/app.js` et jamais loads le `vendor/pdf-lib` script. Two consequences: ① le shell est ne pas "0 vendor"; ② sur le `buildPdf()` chemin `window.PDFLib` est `undefined` dans le shell page, lequel est un runtime risque. Recommendation: charge pdf-lib explicitement dans le shell, ou déplacer PDF construction down dans le doc-rédacteur module.
- Le `fetch('https://example.com/redaktor-probe')` dans `doc-redactor/src/js/core/offline-guard.js` est un **deliberate** self-test sonde que `guardedFetch` bloque cross-origin. Il est ne pas un rél outbound appel et fait ne pas violate "0 externe requêtes".

## 5. Public formulation (utiliser ce ensemble dans marketing matériel et video)

- ✅ Sûr à dire: **aucun framework, aucun npm installer, aucun CDN, 0 outbound requêtes à exécuter temps, 19,554 lignes de hand-written code, et un noyau (topologie / cryptography / identité / transport / archive / audit) écrit de scratch**.
- ❌ Ne pas sûr à dire: **aucun dépendances / zéro dépendances / zéro vendor / zéro backend**.
- ✅ Accurate formulation: **trois libraries sont embarqué dans le dépôt (pdf.JS, pdf-lib, tesseract.JS — Apache-2.0 / MIT, 35 MB, chargé localement); plus un zéro dépendance Node serveur que sert statique fichiers, ensembles COOP/COEP et relays WebRTC signalling (exchanging SDP/ICE uniquement, jamais octets ou clés)**.
