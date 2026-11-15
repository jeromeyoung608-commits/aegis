# Aegis dependency and "hand-written" audit (2026-11-12)

Scope: `~/Documents/Aegis` (aegis-shell + 11 modules)
One-line conclusion: **the kernel is hand-written, but "100% zero dependency" does not hold** — 3 third-party libraries (5 components) are vendored into the repository, and 1 Node process runs.

---

## 1. Facts (safe to quote externally)

| Item | Fact | How it was verified |
|---|---|---|
| Hand-written code volume | **19,554 lines** (.js/.mjs/.html/.css, excluding vendor, node_modules, tests); of which plain JS **15,221 lines**, WGSL shaders **119 lines** | `find … \| xargs wc -l` |
| Structure | 1 shell + **11 modules** (webgpu-topology / doc-redactor / zero-knowledge-identity / p2p-crypto-transfer / encrypted-archive / audit-timeline / token-gate / blind-relay / detached-hash-signer / sync-canvas / e2e-signed-delivery) | `ls modules` |
| Root package.json | **0 runtime dependencies**; the only script is `npm test` | file content |
| Shell package.json | **0 dependencies** | file content |
| Third-party libraries (document redaction module) | `pdf.js 3.11.174` (Apache-2.0), `pdf-lib 1.17.1` (MIT), `tesseract.js 5.1.1` (Apache-2.0), `tesseract.js-core 5.1.1` (Apache-2.0), `tessdata deu+eng` (Apache-2.0) | `modules/doc-redactor/vendor/MANIFEST.json` + `THIRD_PARTY_NOTICES.md` |
| Vendor size | `doc-redactor/vendor` **35 MB**; `e2e-signed-delivery/vendor/pdf-lib` 524 KB | `du -sh` |
| Runtime network requests | **0** (everything loads locally: `./vendor/pdfjs/pdf.min.js`, `./vendor/tesseract/worker.min.js`, `langPath=./vendor/tessdata`) | `grep -rn "vendor/"` plus a recorded DevTools count of `0 'external requests'` |
| Test-only (not shipped with the runtime) | `playwright-core 1.55.0`, `playwright ^1.65.0`, `pdf-lib 1.17.1` (e2e repo) | devDependencies of the respective modules |
| Backend | **1 Node process**, `server.js`: zero dependency (`node:http/https/fs/path/url` + the in-repo token-gate), responsible for ① static file service ② sending COOP/COEP so pages are cross-origin isolated (required for SharedArrayBuffer) ③ WebRTC signalling relay (sees SDP/ICE only, never bytes or keys) | header comment in `server.js` |

## 2. What is genuinely hand-written

- **Hand-written**: WebGPU topology rendering (device/pipelines/camera/physics worker + 119 lines of WGSL), the event-bus shell and its seven-stage state machine, AES-GCM chunked encryption with PBKDF2 derivation, ECDSA signing and verification, WebRTC DataChannel transport, OPFS encrypted archive, hash-chain audit, token-gate room tokens.
- **Not hand-written (vendored)**: PDF **parsing** (pdf.js), PDF **writing** (pdf-lib), the **OCR engine** (Tesseract + language models). The destructive overwrite logic of the redaction step (`fillRect` over the original pixels) is hand-written, but rendering the PDF to a canvas first depends on pdf.js.
- **Not hand-written (process)**: `server.js` is self-written, but it is genuinely a backend process that has to run.

## 3. Stale wording in the video script

| Current line | Problem | Recommendation |
|---|---|---|
| "no framework, no dependencies, nothing pulled from a registry at run time" | the first half is true, `no dependencies` is not | change to "no framework, no npm install" and state plainly that the three libraries are vendored into the repository |
| "No relay, no backend, no queue in the middle" | the bytes indeed bypass a relay, but establishing the connection needs a signalling server | "no relay for the bytes", plus a note that signalling only exchanges addresses |
| "zero backend" (end card) | there is a `server.js` | change to "one signalling relay", or "one static server" |
| "0 external requests" | **true** (DevTools count from the actual recording) | keep |

## 4. Suspicious findings from the audit (code untouched, recorded only)

- `modules/doc-redactor/vendor/MANIFEST.json` declares a SHA-256 manifest, but `tessdata` is stored as `.gz` in the repository; if it is unpacked at deployment time its hash will not match the manifest — re-verify against the MANIFEST before release.
- `e2e-signed-delivery` also vendors a copy of `pdf-lib` (for test fixtures). It is the same version as the doc-redactor copy but maintained independently, so it counts as a duplicated dependency.
- The root `package.json` says "zero runtime dependencies". Strictly it should say "zero npm dependencies", otherwise it conflicts with the vendored facts.
- **The shell depends on pdf-lib indirectly through the SDK**: `aegis-shell/src/app.js:46` and `src/identity.js:40` both `import` from `/modules/e2e-signed-delivery/src/sdk/pdf.js`, which uses `window.PDFLib` internally; but `aegis-shell/index.html` only loads `./src/app.js` and never loads the `vendor/pdf-lib` script. Two consequences: ① the shell is not "0 vendor"; ② on the `buildPdf()` path `window.PDFLib` is `undefined` in the shell page, which is a runtime risk. Recommendation: load pdf-lib explicitly in the shell, or move PDF construction down into the doc-redactor module.
- The `fetch('https://example.com/redaktor-probe')` in `doc-redactor/src/js/core/offline-guard.js` is a **deliberate** self-test probe that `guardedFetch` blocks cross-origin. It is not a real outbound call and does not violate "0 external requests".

## 5. Public wording (use this set in marketing material and video)

- ✅ Safe to say: **no framework, no npm install, no CDN, 0 outbound requests at run time, 19,554 lines of hand-written code, and a kernel (topology / cryptography / identity / transport / archive / audit) written from scratch**.
- ❌ Not safe to say: **no dependencies / zero dependencies / zero vendor / zero backend**.
- ✅ Accurate wording: **three libraries are vendored into the repository (pdf.js, pdf-lib, tesseract.js — Apache-2.0 / MIT, 35 MB, loaded locally); plus one zero-dependency Node server that serves static files, sets COOP/COEP and relays WebRTC signalling (exchanging SDP/ICE only, never bytes or keys)**.
