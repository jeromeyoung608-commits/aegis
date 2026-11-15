<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/DEPENDENCY_AUDIT.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Aegis Abhängigkeit und "hand-written" Audit (2026-11-12)

Umfang: `~/Documents/Aegis` (aegis-shell + 11 modules)
One-line conclusion: **Kernel ist hand-written, aber "100% null Abhängigkeit" macht nicht hold** — 3 Drittanbieter libraries (5 Komponenten) sind vendiert in Repository, und 1 Node Prozess läuft.

---

## 1. Fakten (sicher zu quote externally)

| Punkt | Fact | Wie es war geprüft |
|---|---|---|
| Hand-written Code Lautstärke | **19,554 Zeilen** (.js/.mjs/.html/.css, excluding vendor, node_modules, Tests); von welche Klartext JS **15,221 Zeilen**, WGSL shaders **119 Zeilen** | `find … \| xargs wc -l` |
| Structure | 1 Shell + **11 modules** (webgpu-Topologie / doc-Redaktor / zero-knowledge-identity / p2p-crypto-transfer / encrypted-archive / Audit-timeline / Token-gate / blind-Relay / detached-Hash-Signierer / sync-canvas / e2e-signed-delivery) | `ls modules` |
| Wurzel Paket.json | **0 Laufzeit Abhängigkeiten**; der nur Skript ist `npm test` | Datei Inhalt |
| Shell Paket.json | **0 Abhängigkeiten** | Datei Inhalt |
| Drittanbieter libraries (Dokument Schwärzung Modul) | `pdf.js 3.11.174` (Apache-2.0), `pdf-lib 1.17.1` (MIT), `tesseract.js 5.1.1` (Apache-2.0), `tesseract.js-core 5.1.1` (Apache-2.0), `tessdata deu+eng` (Apache-2.0) | `modules/doc-redactor/vendor/MANIFEST.json` + `THIRD_PARTY_NOTICES.md` |
| Vendor Größe | `doc-redactor/vendor` **35 MB**; `e2e-signed-delivery/vendor/pdf-lib` 524 KB | `du -sh` |
| Laufzeit Netzwerk Anfragen | **0** (alles loads lokal: `./vendor/pdfjs/pdf.min.js`, `./vendor/tesseract/worker.min.js`, `langPath=./vendor/tessdata`) | `grep -rn "vendor/"` plus ein aufgezeichnet DevTools Anzahl von `0 'external requests'` |
| Test-only (nicht ausgeliefert mit Laufzeit) | `playwright-core 1.55.0`, `playwright ^1.65.0`, `pdf-lib 1.17.1` (e2e repo) | devDependencies von der respective modules |
| Backend | **1 Node Prozess**, `server.js`: null Abhängigkeit (`node:http/https/fs/path/url` + der in-repo Token-gate), verantwortlich für ① statisch Datei Service ② sending COOP/COEP so Seiten sind Cross-Origin isoliert (erforderlich für SharedArrayBuffer) ③ WebRTC signalling Relay (sieht SDP/ICE nur, niemals Bytes oder Schlüssel) | Kopfzeile comment in `server.js` |

## 2. Was ist genuinely hand-written

- **Hand-written**: WebGPU Topologie Darstellung (device/pipelines/camera/physics Arbeiter + 119 Zeilen von WGSL), der event-bus Shell und seiner Sieben-Stufen Zustand Maschine, AES-GCM chunked Verschlüsselung mit PBKDF2 derivation, ECDSA Signatur und Prüfung, WebRTC DataChannel Transport, OPFS verschlüsselt Archiv, Hash-Kette Audit, Token-gate Raum Token.
- **Nicht hand-written (vendiert)**: PDF **parsing** (pdf.JS), PDF **writing** (pdf-lib), der **OCR Engine** (Tesseract + language models). Der destructive overwrite Logik von Schwärzung Schritt (`fillRect` über der original pixels) ist hand-written, aber Darstellung der PDF zu ein Canvas erste hängt ab auf pdf.JS.
- **Nicht hand-written (Prozess)**: `server.js` ist self-written, aber es ist genuinely ein Backend Prozess das hat zu ausführen.

## 3. Veraltet Formulierung in der video Skript

| Aktuell Zeile | Problem | Recommendation |
|---|---|---|
| "kein framework, kein Abhängigkeiten, nichts pulled von ein Registry bei ausführen Zeit" | der erste half ist wahr, `no dependencies` ist nicht | Änderung zu "kein framework, kein npm installieren" und Zustand plainly das der drei libraries sind vendiert in Repository |
| "Kein Relay, kein Backend, kein Warteschlange in der middle" | Bytes indeed bypass ein Relay, aber establishing Verbindung benötigt ein signalling Server | "kein Relay für Bytes", plus ein Hinweis das signalling nur exchanges addresses |
| "null Backend" (Ende Karte) | dort ist ein `server.js` | Änderung zu "eine signalling Relay", oder "eine statisch Server" |
| "0 extern Anfragen" | **wahr** (DevTools Anzahl von der actual recording) | behalten |

## 4. Suspicious findings von Audit (Code untouched, aufgezeichnet nur)

- `modules/doc-redactor/vendor/MANIFEST.json` declares ein SHA-256 manifest, aber `tessdata` ist speichert as `.gz` in Repository; wenn es ist unpacked bei Bereitstellung Zeit seiner Hash wird nicht match der manifest — re-verify gegen MANIFEST vor Release.
- `e2e-signed-delivery` auch vendors ein Kopie von `pdf-lib` (für Test fixtures). Es ist der gleich Version as der doc-Redaktor Kopie aber maintained independently, so es Zählungen as ein duplicated Abhängigkeit.
- Der Wurzel `package.json` says "null Laufzeit Abhängigkeiten". Strictly es soll sagen "null npm Abhängigkeiten", anderenfalls es conflicts mit der vendiert Fakten.
- **Der Shell hängt ab auf pdf-lib indirectly durch SDK**: `aegis-shell/src/app.js:46` und `src/identity.js:40` beide `import` von `/modules/e2e-signed-delivery/src/sdk/pdf.js`, welche verwendet `window.PDFLib` internally; aber `aegis-shell/index.html` nur loads `./src/app.js` und niemals loads der `vendor/pdf-lib` Skript. Two consequences: ① Shell ist nicht "0 vendor"; ② auf der `buildPdf()` Pfad `window.PDFLib` ist `undefined` in Shell Seite, welche ist ein Laufzeit Risiko. Recommendation: Last pdf-lib ausdrücklich in Shell, oder bewegen PDF construction down in der doc-Redaktor Modul.
- Der `fetch('https://example.com/redaktor-probe')` in `doc-redactor/src/js/core/offline-guard.js` ist ein **deliberate** self-test Sonde das `guardedFetch` blockiert Cross-Origin. Es ist nicht ein echt outbound Aufruf und macht nicht violate "0 extern Anfragen".

## 5. Offentlich Formulierung (verwenden dies Set in marketing Material und video)

- ✅ Sicher zu sagen: **kein framework, kein npm installieren, kein CDN, 0 outbound Anfragen bei ausführen Zeit, 19,554 Zeilen von hand-written Code, und ein Kernel (Topologie / cryptography / Identität / Transport / Archiv / Audit) geschrieben von scratch**.
- ❌ Nicht sicher zu sagen: **kein Abhängigkeiten / null Abhängigkeiten / null vendor / null Backend**.
- ✅ Accurate Formulierung: **drei libraries sind vendiert in Repository (pdf.JS, pdf-lib, tesseract.JS — Apache-2.0 / MIT, 35 MB, geladen lokal); plus eine null Abhängigkeiten Node Server das liefert aus statisch Dateien, Mengen COOP/COEP und relays WebRTC signalling (exchanging SDP/ICE nur, niemals Bytes oder Schlüssel)**.
