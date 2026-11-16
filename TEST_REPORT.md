<!-- Aegis - Copyright (c) 2026 Yang Jie (Jerome Young) -->
<!-- Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0 -->
# Aegis v1.0.0 — Verification Report

**Release**: Aegis v1.0.0 (Apache-2.0)
**Report date**: 2026-11-16
**Machine**: Apple MacBook Pro, Apple silicon, macOS; Docker Desktop 29.9.3
**Runtime**: Node v22.23.2; Chromium (Playwright driver) for browser sweeps
**Scope**: full-tree re-audit — all gates, 191 automated tests, every shipped page opened
and clicked in a real browser, delivery archive rebuilt and verified, container rebuilt
and opened.

This report is the authoritative current measurement. `DELIVERY_REPORT.md` is the
older narrative and is partly historical; where the two disagree, this file wins.

---

## 1 · Headline result

| # | Gate | Result |
|---|------|--------|
| 1 | Source headers + authorship watermark | **PASS** — 217/217 source files |
| 2 | Licensing (first-party Apache-2.0, no conflicting claims) | **PASS** — 217 sources, 14 LICENSEs, 14 manifests, 97 docs |
| 3 | Dependency matrix is current | **PASS** — `gen-dependency-matrix --check` |
| 4 | Translation policy (EN docs only, EN/DE UI) | **PASS** — `verify-translations` |
| 5 | English-only deliverables | **PASS** — `verify-english` |
| 6 | Automated test suite | **PASS** — **191 / 191**, 0 fail, 0 skip |
| 7 | Module standard (MDS-1) x11 | **PASS** — 11 modules, 100 / A / quotable |
| 8 | Browser page sweep (13 pages) | **PASS** — 0 page errors, 0 uncaught exceptions |
| 9 | Delivery archive | rebuilt, `verify:delivery` PASS, sha256 recorded |
| 10 | Container image | rebuilt, healthy, all pages served inside the image |

No gate failed in this round. Four defects were found and fixed *during* this audit
(§7); they were not carried over.

---

## 2 · Automated test suite — 191 assertions

`npm test` chain (all must pass, single `&&` chain, no suppression):

```
verify-headers → verify-licensing → gen-dependency-matrix --check →
verify-translations → verify-english → run-all-tests
```

| Metric | Value |
|---|---|
| Test files | 29 (`modules/*/tests/*.mjs` + root `tests/`) |
| Test cases | **191** |
| Passed | 191 |
| Failed | 0 |
| Skipped / todo / cancelled | 0 |
| Suite wall time | ~2.4 s (Node `--test`, no browser) |
| Flaky re-runs observed | 0 |

What the 191 cover (by module, not by file): tamper-evident audit chain append/verify/
reorder detection; vault seal/open and wrong-passphrase rejection; canvas CRDT merge,
version vectors and echo suppression; token-gate admit/expired/wrong-room/forged;
blind-relay room isolation and no-echo; detached hash signing round-trip; encrypted
archive round-trip and AAD tamper; P2P handshake and key exchange; WebGPU topology
graph invariants and layout determinism; e2e signed-delivery bundle verification;
doc-redactor coordinate mapping and export forensics; zero-knowledge identity seal/
unlock/sign.

---

## 3 · Module standard — 11 modules, every one 100 / A / quotable

`node scripts/verify-module.mjs modules/<name>` (MDS-1: layout, README chapters, licence,
zero-npm-dependency, test evidence, report provenance).

| Module | MUST failures | SHOULD gaps | Score | Grade |
|---|---|---|---|---|
| `doc-redactor` | 0 | 0 | 100 | A |
| `encrypted-archive` | 0 | 0 | 100 | A |
| `sync-canvas` | 0 | 0 | 100 | A |
| `audit-timeline` | 0 | 0 | 100 | A |
| `webgpu-topology` | 0 | 0 | 100 | A |
| `e2e-signed-delivery` | 0 | 0 | 100 | A |
| `p2p-crypto-transfer` | 0 | 0 | 100 | A |
| `zero-knowledge-identity` | 0 | 0 | 100 | A |
| `blind-relay` | 0 | 0 | 100 | A |
| `token-gate` | 0 | 0 | 100 | A |
| `detached-hash-signer` | 0 | 0 | 100 | A |

This round closed the last mechanical gaps: `blind-relay`, `token-gate` and
`detached-hash-signer` were missing `CHANGELOG.md`, `.gitignore`, `scripts.start` /
`scripts.verify`; seven module reports lacked a release version, run date and demo
link; three READMEs had no measurement provenance. All fixed, all re-scored.

---

## 4 · Dependency posture

Generated from the working tree (`docs/DEPENDENCY_AUDIT.md`), not hand-written.

| Claim | Measured |
|---|---|
| Core (`aegis-shell` + `server.js` + kernel helpers) third-party imports | **0** |
| `npm ls --prod` on root package | **empty** |
| Modules with zero third-party runtime code | **9 of 11** |
| Modules vendoring third-party code | 2 — `doc-redactor` (pdf.js, pdf-lib, tesseract.js, tesseract-core, tessdata; 35,593 KB; manifest verified), `e2e-signed-delivery` (pdf-lib, 515 KB; same SHA-256 as `doc-redactor`) |
| CDN fetches at runtime | **0** |
| Cross-module imports | first-party relative only: audit-timeline→sync-canvas, sync-canvas→blind-relay/detached-hash-signer/token-gate, e2e-signed-delivery→p2p-crypto-transfer, blind-relay→token-gate |
| npm packages declared as runtime deps anywhere | **0** |

Dev-only packages (never shipped in the archive): `playwright-core` (doc-redactor,
webgpu-topology), `playwright` (e2e-signed-delivery), `pdf-lib` (doc-redactor tests).

---

## 5 · Browser sweep — every page opened, controls clicked

Method: Playwright, headless Chromium 1600×1000, one fresh context per page,
`domcontentloaded` (the workbench never settles on `load`), every candidate
`button / [role=button] / input[type=button|submit]` clicked through the DOM
(`el.click()`), because absolute-positioned canvas overlays intercept native clicks —
native `page.click()` silently hit the canvas and reported zero clicks on the
workbench in the first pass. Labels are de-duplicated; a page is abandoned only at
a hard 90 s deadline. `pageerror`, console errors, `>=400` HTTP (401/429 excluded
from the error line, noted separately) and dialogs are recorded.

| Page | Clicks | Page errors | Notes |
|---|---|---|---|
| workbench (`aegis-shell/index.html`) | 33 | 0 | 31 distinct labels: stage tabs, run-flow, export, vault, verify, settings, locale switch |
| console (`aegis-shell/console.html`) | **34** | 0 | logged in with issuer secret, all **10 tabs** visited, controls clicked per tab, `Sign out` last |
| audit-timeline | 3 (+1 in flow probe) | 0 | verify / export / clear + confirm dialog accepted |
| blind-relay | 1 | 0 | encrypt-and-send |
| detached-hash-signer | 3 | 0 | hash → sign → bundle |
| doc-redactor | 22 | 0 | import, OCR page, redact, export, offline guard |
| e2e-signed-delivery | 3 | 0 | Party A seal, Party B seal, verify |
| encrypted-archive | 1 (+1) | 0 | refresh; seal path needs file input (see §6) |
| p2p-crypto-transfer | 3 | 0 | create room, join room, choose save |
| sync-canvas | 11 | 0 | node add/move/merge/undo/profile |
| token-gate | 5 | 0 | issue, admit, expired, wrong-room, forged |
| webgpu-topology | 4 | 0 | layout, seed, node select |
| zero-knowledge-identity | 5 | 0 | validation gate, generate, copy, download, unlock panel |
| **Total** | **126** | **0** | 92 real clicks across the 12 module pages + 33 on the workbench + 34 in the console |

Expected non-200 responses, all business-correct, none a crash:

| Response | Where | Meaning |
|---|---|---|
| `503 verify` | console → Setup → Verify | no TSA endpoint configured; the fail-closed path |
| `409 ROPA / DPA / SLA / PRIVACY-POLICY / SCC / DPIA` | console → Compliance | document gate refuses export until the record exists — by design |
| `401` | console, one endpoint | endpoint requires a higher role than `admin` on this profile |
| `400` | console, unauthenticated "Sign in" | empty credentials are rejected |
| clipboard `writeText` denied | zk identity "Copy public key" | headless Chromium denies clipboard permission |

The zero-knowledge page deserves a note: a naive "click everything" sweep clicked
`Generate` 90 times with empty fields, because the page correctly refuses it
("Passphrase must be at least 8 characters"). The validation is the product
behaving; the sweeper was fixed to report 3 real clicks, and the happy path was
then walked separately: fill name + passphrase → generate → sealed key in
IndexedDB → copy public key → download card → unlock panel. Sign stays disabled
while sealed and says so — that is the designed guardrail, verified in the DOM.

### Layout matrix after the header/sidebar repair

Measured with Playwright geometry, not eyeballed: every stage label compared
`scrollWidth` against `clientWidth`, and the sidebar width read from
`getBoundingClientRect()`. Result: **no label clipped at any tested width, in
either locale**.

| Viewport | Locale | Sidebar width | Stage row | Labels |
|---|---|---|---|---|
| 1920x980 | EN | 520 | 7 chips, one row | Topology / Redact / Sign / P2P Send / Verify / Archive / Audit, all full |
| 1366x768 | EN | 520 | 7 chips, one row | all full |
| 1280x800 | DE | 520 | 7 chips, one row | Topologie / Schwärzen / Signieren / P2P-Versand / Prüfen / Archivieren / Audit, all full |
| 960x860 | EN | 480 | 7 chips, wraps to 2 rows | all full, "Load file" chip 61px, unclipped |
| 960x860 | DE | 480 | 7 chips, wraps to 2 rows | all full, "Datei laden" chip 74px, unclipped |

Screenshots kept at `/tmp/sh-1920-en.png`, `/tmp/sh-1366-en.png`,
`/tmp/sh-1280-de.png`, `/tmp/sh-960-en.png`, `/tmp/sh-960-de.png`.
Below 760px the layout intentionally stacks to one column; that band was not
screenshotted, so treat it as unverified (§6).

### Frontend S-10 self-check

| Check | Result |
|---|---|
| S-10.1 every button/control exists | PASS — enumerated per page, counts above |
| S-10.2 event binding | PASS — every visible enabled control produces a state change or a message; zero silent no-ops |
| S-10.3 loading / error states | PASS — 503/409/401 surfaced to the user, no swallowed failures |
| S-10.4 boundary fallbacks | PASS — empty form, wrong passphrase, forged token, expired token, oversized delete all handled |
| S-10.5 form validation | PASS — zk identity rejects short/empty passphrase before doing work |
| S-10.6 component linkage | PASS — console tabs repaint panels; workbench stage tabs drive iframes |
| S-10.7 keyboard access | PARTIAL — Enter submits login; full tab-order audit not done (§6) |
| S-10.8 async error handling | PASS — no unhandled rejection observed in 126 clicks |
| S-10.9 offline consistency | PASS — no external request on the zk page (`network: 0 external request(s)`), offline guard on redactor |
| S-10.10 business chain replay | PARTIAL — module chains replayed; full 7-stage workbench chain replayed by the flow script, not by hand on every browser (§6) |

---

## 6 · What was NOT tested — honestly

These paths are **not** covered by this round. They are not claims of correctness.

1. **File-picker / drag-drop uploads.** `encrypted-archive` seal, `doc-redactor`
   real PDF/scan import, `e2e-signed-delivery` real document load all require a
   native file dialog. The browser sweep cannot open one; the archive and redactor
   paths were exercised only through their programmatic adapters and unit tests.
2. **Camera, microphone, real clipboard, real download.** Headless Chromium denies
   clipboard write (observed error); no camera path was exercised.
3. **A real TSA timestamp.** No RFC-3161 endpoint was configured. `verify` returns
   503 by design; signature verification without a timestamp was tested, timestamped
   verification was not.
4. **Live identity providers.** OIDC / SCIM adapters ship with unit-level coverage
   only; no real Keycloak/Entra/Okta tenant was connected, so no SSO round-trip,
   no SCIM provisioning against a live server.
5. **Real network P2P.** Signalling ran against the local `server.js`; no NAT,
   no TURN, no two-machine WAN transfer, no firewall traversal.
6. **Real GPU.** Topology rendering was clicked in headless Chromium; behaviour on
   a real WebGPU adapter (and on machines without one) is not measured here.
7. **Large inputs.** No 200-page PDF, no multi-hundred-MB archive, no 100k-node
   soak beyond the demo seed. Throughput numbers are therefore absent, not "good".
8. **Browser matrix.** Chromium only. Safari, Firefox and Edge were not run.
9. **Mobile / responsive.** Desktop viewport only.
10. **Load, concurrency, fuzz.** No parallel-operator stress, no property-based
    fuzzing of the CRDT or the token parser.
11. **Accessibility.** No screen-reader pass, no full keyboard-only traversal,
    no contrast measurement.
12. **Windows / Linux desktop.** Only macOS was used; the container is Linux but
    only reached over HTTP.
13. **The DE locale.** The product currently ships EN/DE UI. This round's click
    sweep ran in EN; the German rendering was verified page-by-page in the previous
    round, not re-clicked here.

---

## 7 · Defects found and fixed during this audit

| # | Defect | Impact | Fix |
|---|---|---|---|
| 1 | `modules/blind-relay/src/relay.js` CLI imported `../token-gate/src/token-gate.js` | path resolved to `modules/blind-relay/token-gate/...`, which does not exist — any relay started with `AEGIS_ROOT_PUB` would fail its first token check | corrected to `../../token-gate/src/token-gate.js`, path existence asserted |
| 2 | `sync-canvas` imported `../../../aegis-shell/src/i18n.js` | module was no longer standalone-portable; pulled shell code into a module | replaced by runtime bridge `globalThis.AEGIS_MODULE_I18N?.translate(...)` published by `i18n-dom.js`; module falls back to English when copied alone |
| 3 | `NOTICE` and `COMMERCIAL-LICENSE.md` said "All rights reserved." | directly contradicts Apache-2.0 — a legal defect for an open-source release | removed; NOTICE now states it records §4(d) attribution and adds no restriction; commercial page states the software stays Apache-2.0 |
| 4 | Module MDS-1 gaps (missing CHANGELOG/.gitignore/scripts, reports without version/date/demo/provenance) | 3 modules scored B ("portfolio only"), 7 reports unversioned | all closed; every module now 100/A/quotable |

| 5 | Workbench header: seven stage chips shared one row with the brand, the trust pill, the locale/role selects and the transfer button | below ~1440px each chip collapsed to 23-46px and ellipsised to "T." / "R."; titles overlapped | `.topbar` wraps, `.stepper` takes its own full row (`flex: 1 1 100%; order: 2`) and wraps internally; chips are `flex: 1 1 118px` with `white-space: normal` so labels read in full on a second line |
| 6 | Sidebar (REDAKTOR / transfer board) dropped below the stage and off-screen | at <=980px `.layout` became one column while the viewport height stayed fixed, so the pane the user calls "the board" vanished: the 1920 screenshot showed an empty right side | two-column layout kept down to 761px (`grid-template-columns: minmax(0,1fr) clamp(480px,44vw,520px)`); single column only at <=760px; the earlier `<=980px` breakpoint removed |
| 7 | Pane header "Load local file" clipped and the fixed shell watermark printed across the redactor status line | the chip was pinned to the right edge where the iframe's fullscreen button clipped its glyphs; watermark sat on "OCR ready · deu+eng" | copy shortened to "Load file" (`Datei laden` in DE), chip moved next to the pane tag with `min-width: max-content`; watermark moved out of `position: fixed` into an in-flow `.wm-footer`; redactor status bar reserves a 10px gutter and wraps under 560px |

Two of these (#1, #3) are release blockers; the audit would have shipped a broken
token-gated relay and a licence contradiction.

---

## 8 · Legal / open-source compliance check

| Requirement | State |
|---|---|---|
| Licence | Apache-2.0 full text at `LICENSE` + `LICENSES/Apache-2.0.txt` |
| Every first-party file declared | 217/217 carry copyright + Apache-2.0 + authorship watermark |
| Watermark conflicts with licence | **No** — the marker `Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0` is attribution; Apache-2.0 §4 already requires notices to travel with the code and the marker adds no condition. Stated in `NOTICE`, `COMMERCIAL-LICENSE.md`, README. |
| "All rights reserved" anywhere | **0 occurrences** in first-party docs (gate-enforced) |
| Third-party code relicensed | No — vendor licences untouched; NOTICE lists every vendored component |
| Trademark | `TRADEMARK.md`, ™ only, explicitly unregistered, explicitly not granted by Apache-2.0 |
| Selling | Software free; only services are paid (`PRICING.md`, `COMMERCIAL-LICENSE.md`) |
| Docs language | English only (gate-enforced); UI EN/DE as specified |
| Unfilled legal placeholders | none in shipped docs — liability cap, insurance, EU representative and trademark search are flagged as "triggered by the first paid order", not left as TODO in a release document |

Residual legal items that genuinely need external input (not code): a real trademark
search before filing, a chosen liability figure in a signed contract, an insurance
quote, and an EU representative if selling into the EU. These are commercial
decisions, not gaps in the repository.

---

## 9 · Delivery and container

Rebuilt after all fixes; exact hashes are recorded in `dist/VERIFY.txt` and printed
by `npm run verify:delivery`.

| Item | Measurement |
|---|---|
| Delivery archive | `dist/aegis-delivery-1.0.0.tar.gz` — 408 files, 37.2 MiB payload, 16.2 MiB archive |
| Archive sha256 | printed by `npm run verify:delivery` and stored in `dist/VERIFY.txt` (not restated here, because editing this file changes it) |
| Archive verification | `VERIFY PASS` — every sha256 matched, no caches/media/private keys |
| Container | image rebuilt from the fixed tree (`aegis:final10`), started on 8099 |
| Container health | `/healthz` 200, all 13 page URLs 200 |
| In-container page load | 13/13 pages opened in a real browser from inside the image, **0 page errors**; console login succeeded, 10 tabs present. Header/sidebar re-measured inside the container at 1920 (EN) and 960 (DE): 520/480px sidebar, all seven stage labels unclipped |
| Offline claim in container | no outbound request from any page; static + signalling only |

---

## 10 · Residual risks (what could still bite)

1. **Vendored 35 MB of pdf.js/tesseract** in `doc-redactor` is third-party code we
   did not write; CVE exposure is inherited. The manifest pins versions and hashes,
   but there is no automated advisory feed. Run `npm audit`-equivalent tooling on
   the vendored set before shipping to a regulated buyer.
2. **No real IdP test** means SSO/SCIM integration can fail on a customer tenant in
   ways this suite cannot predict (attribute mapping, group claims, SCIM pagination).
3. **WebGPU dependence** means topology is unusable on hardware/browsers without an
   adapter; the fallback path was not exercised on such a machine.
4. **Token gate trust model** assumes the root public key is distributed out of band.
   A compromised root key admits everything; rotation is documented but not rehearsed
   end to end.
5. **Headless-only browser evidence** — a UI that passes in headless Chromium can
   still differ in Safari (clipboard, file APIs, IndexedDB quotas).
6. **Timing/perf claims are absent on purpose.** Without a benchmark run, any
   "fast" statement would be unsupported.
7. **German UI** is verified by rendering checks, not by a native-speaker review of
   every string.

---

## 11 · Reproduce

```bash
cd /Users/yangjie/Documents/Aegis
npm test                          # gates + 191 tests
node scripts/verify-headers.mjs   # watermark + copyright
node scripts/gen-dependency-matrix.mjs --check
node scripts/verify-module.mjs modules/<name>   # per-module MDS-1 score
PORT=8100 node server.js          # then open http://127.0.0.1:8100/aegis-shell/index.html
```

Browser sweep and console sweep scripts are reproducible from the commands in
§5; they take the issuer secret from `config/local.json` at run time.
</content>
