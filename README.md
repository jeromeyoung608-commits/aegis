# AEGIS - Secure Edge Collaboration Workbench

**English**

> **Closed-loop, zero-trust, local-first collaboration for classified industrial
> documents** — every computation stays on the operator's machine, the app never
> contacts a third-party origin. (A hosted service / offline cache is out of scope.)
> A click in a million-node digital-twin topology pulls the associated
> maintenance contract into a fully local redaction engine. The destructive redacted PDF
> is then hashed, signed, delivered peer-to-peer, verified, sealed into an encrypted OPFS
> vault, and committed to a tamper-evident hash chain: **seven stages, ten audited actions,
> one shell**.
>
> **The server never sees the topology, the document, the file, a key, or a passphrase.**
> Every sensitive byte stays inside the browser; transport is P2P direct.

> **License:** open source under the [Apache License 2.0](./LICENSE) (SPDX `Apache-2.0`).
> Free to use, including commercially; paid support is optional. See [§ License](#license).

---

## 1 - Why this exists (the German industrial / medical pain point)

A classified manufacturer or clinic on an **air-gapped or intranet** network must:

1. Monitor a **huge device / network topology** (connected cars, factory sensors) - and
   Canvas2D/SVG dies at scale.
2. Open a device's **maintenance contract** that contains outsourced workers' ID numbers
   and bank accounts - and must **never upload** it to a cloud OCR service.
3. Hand the cleaned document to a colleague on the same site - with **no chat app** and
   absolutely not WeChat/Slack.
4. **Verify** which key signed it (a self-asserted key, not a legal identity), that it was not altered in transit, where the sealed copy
   lives, and which actions happened in which order.

Four separate hard problems. AEGIS solves them as **one single-page workbench** whose
independent modules share a single architecture: **everything runs locally, nothing is
uploaded, and one EventBus drives the whole flow.** The shell owns the state machine;
each module stays a reusable, standalone product.

---

## 2 - The seven-stage closed loop

The older three-stage diagram (topology -> redact -> P2P) is retired. A topology click
now drives a complete loop with signing, verification, archiving and audit.
The signaling server still relays only SDP/ICE - never bytes.

```
 [1] TOPOLOGY           Aegis-Topology          topology:node-selected {nodeId, x, y}
        |
        | redaktor:load-doc  (associated contract File)
        v
 [2] REDACT             Aegis-REDAKTOR          redaktor:export-ready {name, blob}
        |
        | SHA-256(pdfBytes) -> signHash(raw digest) -> assembleArtifact()
        v
 [3] SIGN               Aegis-Identity          identity:signed {hash, signature, publicKey}
        |
        | artifact retained as AegisContext.pendingArtifact
        | P2PAdapter.sendFile(artifact)
        v
 [4] P2P SEND           Aegis-SignedDelivery    p2p:file-sent
        |
        | AES-GCM chunks over a WebRTC DataChannel
        v
 [5] VERIFY             Aegis-Identity          p2p:file-received -> signed:verified
        |
        | Archive to Vault unlocks only on a passing verdict
        v
 [6] ARCHIVE            Aegis-Vault             vault:sealed -> OPFS (.aegis container)
        |
        | every stage calls AuditTrail.append()
        v
 [7] AUDIT              Aegis-AuditTrail        audit:append -> SHA-256 hash chain
```

**Ten audited actions, step by step:**

1. `topology:node-selected` fires with the node id and coordinates; the shell resets the
   run and records `AegisContext.selectedNode`.
2. The shell intercepts the node and emits `redaktor:load-doc`, loading **that node's**
   associated contract into `Aegis-REDAKTOR`.
3. `redaktor:export-ready` carries the destructive PDF `Blob`; the shell computes its
   SHA-256 digest with Web Crypto.
4. `IdentityAdapter.signHash(hash)` produces an ECDSA P-256 signature plus a Base64 SPKI
   public key.
5. `identity:signed` publishes the hash, signature and public key; the PDF and the
   signature trailer are packed into one signed artifact and retained in the Context as
   `pendingArtifact`.
6. `P2PAdapter.sendFile()` streams the artifact over the AES-GCM channel;
   `p2p:file-sent` marks the handoff.
7. `p2p:file-received` triggers `IdentityAdapter.verifyArtifact(pendingArtifact)`:
   recompute the document hash, compare the embedded digest, verify every signer.
8. `signed:verified` unlocks the **Archive to Vault** button; a failing verdict emits
   `signed:rejected` and keeps the button locked.
9. The operator enters a passphrase; `vault.seal()` writes an AES-GCM-256 `.aegis`
   container into OPFS and `vault:sealed` closes the loop.
10. Every stage calls `AuditTrail.append()` and emits `audit:append`. The right-hand
    timeline repaints on each link, the seven-step Stepper turns green stage by stage,
    and the final seal link lights all seven.

**Why verification uses the sender-side copy.** A large transfer may stream straight to
disk on the receiver (`showSaveFilePicker`) and therefore produce no complete in-memory
`Blob` there. The shell retains the exact bytes it signed as `pendingArtifact` and uses
that hash plus the original document as the verification baseline. In the same-machine
`BroadcastChannel` demo the bytes are identical; in production this respects the physical
limit of disk-streamed receivers instead of forcing a full Blob into RAM.

**Multi-signer capable.** The signature trailer is `signers: [{id, pub, sig}]` and
`verifyArtifact()` verifies every entry. `IdentityAdapter` currently issues one signer
(`A`) for the automated loop; adding further signers needs no format change.

---

## 3 - Architecture and integration seams

Eleven independent, reusable modules live under `modules/` and are composed - **like
building blocks** - by `aegis-shell/` through an `EventBus` + `postMessage` bridge.
At runtime every page talks over the `aegis` message channel only. Three modules also
**reuse a sibling module's pure functions by relative import** (audit-timeline →
sync-canvas hash chain, sync-canvas → blind-relay / detached-hash-signer / token-gate,
e2e-signed-delivery → p2p-crypto-transfer transport, blind-relay → token-gate for CLI
admission). Those imports are first-party code, never an npm package, and each module
page still runs standalone; the exact edge list is generated in
[`docs/DEPENDENCY_AUDIT.md`](docs/DEPENDENCY_AUDIT.md). The shell
is also the only place that imports submodule **pure functions** (crypto, vault, audit
chain); their internal business logic is never modified.

**Brand map (the microkernel ecosystem):**

| Module | Brand | Folder | Role |
|--------|-------|--------|------|
| Topology | `Aegis-Topology` | `modules/webgpu-topology` | WebGPU digital twin, 1M+ nodes |
| Redaction | `Aegis-REDAKTOR` | `modules/doc-redactor` | Local OCR + destructive PDF |
| Identity | `Aegis-Identity` | `modules/zero-knowledge-identity` | ECDSA P-256 seal, wrapped key |
| Signed delivery | `Aegis-SignedDelivery` | `modules/e2e-signed-delivery` | Signature trailer + artifact format |
| Transport | `Aegis-Transport` | `modules/p2p-crypto-transfer` | WebRTC + AES-GCM chunks |
| Vault | `Aegis-Vault` | `modules/encrypted-archive` | OPFS + AES-GCM-256 archive |
| Audit | `Aegis-AuditTrail` | `modules/audit-timeline` | SHA-256 hash-chained timeline |
| Canvas | `Aegis-Canvas` | `modules/sync-canvas` | Realtime collaborative board |
| Detached signing | `Aegis-DetachedSign` | `modules/detached-hash-signer` | Detached hash signing (sign the hash, not the document); NOT a blind-signature scheme |
| Token-gated rooms | `Aegis-TokenGate` | `modules/token-gate` | ECDSA room tokens for trusted admission |
| Server-blind relay | `Aegis-BlindRelay` | `modules/blind-relay` | Server-blind WebSocket relay (forwards ciphertext only) |

Two further capabilities ship **server-side** (not as standalone modules): **enterprise auth**
— OIDC (`AEGIS_AUTH_MODE=oidc`, logic in `server.js`, tests in `modules/oidc/`) and **SCIM**
provisioning (tests in `modules/scim/`). Both are off by default and covered in
`SECURITY.md` / `CONFIGURE-BEFORE-DEPLOY.md`.

**Common commands:** `npm run dev` (start the workbench) · `npm run setup` (mint the local
issuer secret + create the data dir) · `npm test` (full suite) · `npm run verify:delivery`
(build + checksum the shippable tarball) · `npm run doctor` (environment self-check) ·
`npm run verify:claims` (forbidden-claim scan) · `npm run sbom` (SBOM). The full script
list is in `package.json`.

Each standalone page carries its brand in the document title and its main heading, so a
customer opening any module in isolation immediately sees which ecosystem it belongs to.

**How they are stitched together:**

- `aegis-shell/src/app.js` is the **only** place the modules talk. It owns the seven-stage
  state machine, a unified router, a single `EventBus` (`bus.js`), the shared
  `AegisContext` (`context.js`), and the typed Adapters (`adapters.js`, `identity.js`).
- `aegis-shell/src/identity.js` (`IdentityAdapter`) imports the pure Web Crypto helpers
  from `modules/e2e-signed-delivery/src/sdk/crypto.js` and the artifact packing /
  verification functions from `modules/e2e-signed-delivery/src/sdk/pdf.js`.
  **No cryptographic logic is reimplemented in the shell.**
- The vault and audit cores are imported the same way
  (`modules/encrypted-archive/src/vault.js`, `store.js`,
  `modules/audit-timeline/src/trail.js`, `timeline.js`).
- `aegis-shell/src/sdk.js` publishes `window.AegisSDK`, a documented facade over the same
  EventBus. See section 12.
- Cross-module events are namespaced by origin:
  - `topology:node-selected` `{nodeId, x, y}` - the shell decides the response.
  - `redaktor:load-doc` `{file, name, source}` - the single intake seam, used by both the
    topology handoff and `AegisSDK.injectFile()`.
  - `redaktor:export-ready` `{name, blob}` - starts hashing and signing.
  - `p2p:file-sent` / `p2p:file-received` `{name, size, blob}` / `p2p:error`.
  - Shell-produced events for external subscribers: `identity:signed`,
    `signed:verified`, `signed:rejected`, `vault:sealed`, `audit:append`.
- Two P2P iframes (sender + receiver) run **hidden** and connect locally via
  `BroadcastChannel`. For cross-machine LAN, switch to LAN mode and serve over HTTPS.

**The shared Context.** `AegisContext` carries the whole run: `selectedNode`, `document`,
`flowStage` (0..7), `transfer`, `hash`, `signature`, `publicKey`, `artifact`,
`pendingArtifact`, `verified`, `sealed`. `FLOW_STAGES` freezes the seven stage numbers;
`setSigning`, `markReceived`, `markVerified`, `markSealed` and `resetFlow` are the only
mutators. Every handoff is one explicit, debuggable mutation instead of ad-hoc messages.

**This is the architectural payoff:** the business is complex, the substrate is boring -
one bus, one message channel, one deliberately blind server, and a public SDK on top.

---

## 4 - Quick start

```bash
cd /path/to/Aegis
node server.js            # http://localhost:8080
```

`/session` (the room-token issuer) is **fail-closed** since the security pass: with
no issuer credential it refuses to mint tokens, so LAN signaling cannot be
self-authorised by anyone who can reach the port. Two ways to open it:

```bash
# A) shared secret (recommended outside an isolated lab):
AEGIS_ISSUER_SECRET='<long-random-string>' node server.js
#    then open the shell once as http://host:8080/#issuer=<same secret>
#    (the fragment is moved into sessionStorage and stripped from the URL)

# B) isolated demo LAN (lab only — this is logged as a warning on boot):
AEGIS_TRUSTED_LAN=1 node server.js
```

TLS material is no longer read from the web root: put `key.pem` + `cert.pem` in
`~/.aegis/tls/` (or point `AEGIS_TLS_DIR` at them).


Open `http://localhost:8080` in **Chrome or Edge 113+**. Then:

1. Wait for the topology to render; drag / wheel to navigate.
2. **Click any node** - the redaction panel auto-loads that node's contract.
3. Review the detected black boxes; toggle rules if you like.
4. Click **Send to Aegis Peer**. From here the loop is automatic: the PDF is hashed,
   signed, streamed, verified, and the **Archive to Vault** button lights up.
5. Click **Archive to Vault**, enter a passphrase (>= 8 characters), **Seal to vault**.
   The seven-step Stepper turns fully green and the audit timeline shows every link.

> Why `node server.js` and not `file://`? The topology needs `SharedArrayBuffer`, which
> ONLY exists in a **cross-origin-isolated** context. The unified `server.js` is therefore
> a **deliberately isolated** server, not a naive static file server: it stamps
> `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`
> (+ `Cross-Origin-Resource-Policy: same-origin`) on **every** response - static bytes
> *and* the JSON signaling relay alike. Drop `key.pem` + `cert.pem` beside it for HTTPS
> LAN mode. Each module also keeps its own `server.js` for standalone use; those
> intentionally omit the isolation headers because they don't need `SharedArrayBuffer`.

---

## 5 - The zero-trust guarantees (and their limits)

- **Topology**: purely local WebGPU; the server serves only static bytes.
- **Document**: Tesseract/pdf.js/pdf-lib are vendored locally; an offline guard wraps
  `fetch`/`XHR`/`WebSocket`/`EventSource`/`sendBeacon` and blocks any cross-origin call.
  Exported PDFs contain **no recoverable text layer** - the source page is never copied;
  only a re-rasterised image with burned black boxes is embedded.
- **Transfer**: the signaling server relays only SDP/ICE (room ids, IP hints). File bytes
  and the AES key (PBKDF2 from a passphrase) **never touch the server**.
- **Signature**: keys are generated in-page by Web Crypto. The private key is
  non-extractable and never serialized; only the Base64 SPKI public key travels inside
  the artifact. The signature covers the raw SHA-256 digest of the PDF region, so a
  single flipped byte fails verification.
- **Archive**: AES-GCM-256 under a PBKDF2-SHA-256 key (250,000 iterations, per-record
  salt), written as an opaque `.aegis` container in OPFS. The passphrase is used once and
  never stored.
- **Audit**: every stage appends one link to a local hash chain —
  `HMAC-SHA256(deviceKey, previousHash | canonical(entry))` when a device key is set,
  plain `SHA-256` for legacy entries (each entry records `alg`). Editing one link
  invalidates every later link. The chain is **tamper-evident, not immutable**: it
  detects edits, but offers no protection against an operator who can rewrite the
  whole store. See `docs/CLAIMS-WORDING.md`.

**Honest limits** (also in `DELIVERY_REPORT.md`):

- The redaction module's PII detection is tuned for German business/legal paperwork;
  accuracy depends on scan quality and may need manual `Mark` boxes.
- **Transfer receiver is memory-safe**: the P2P module streams each decrypted chunk
  straight to disk (`showSaveFilePicker` on Chromium) - no in-memory `Blob`, so multi-GB
  transfers do not OOM. Non-Chromium browsers fall back to an in-memory path **capped at
  1 GiB**. `showSaveFilePicker` needs a user gesture, so the receiver has a
  "Choose save location" button to pre-lock the file before sending.
- Because a disk-streamed receiver has no in-page bytes, the shell verifies against the
  **sender-side retained artifact**. This is the correct baseline for the same-machine
  demo and for production streaming; a cross-machine deployment that needs independent
  receiver-side verification must re-read the saved file.
- `IdentityAdapter` issues one signer for the automated loop. The trailer format supports
  multiple signers, but additional signers are not yet wired into the shell flow.
- COEP `require-corp` can interfere with *external* STUN for LAN mode on some browsers -
  use the standalone P2P server (no COOP/COEP) for cross-machine if you hit that.
- Live WebGPU / OCR / WebRTC execution requires a real browser; the repository was
  validated by static analysis, the module-level test suites, a signed-artifact
  round-trip, and live server smoke tests. The visual end-to-end loop is a manual
  acceptance step recorded in section 8.

---

### Zero dependencies — the accurate claim

Aegis is **not** "zero dependencies" as a whole product, and we do not claim it is.
Concretely:

- **The core is zero-dependency.** `aegis-shell/` (the orchestrating SPA, 11 source
  files), `server.js` (static + COOP/COEP + signalling relay) and every kernel helper
  (Web Crypto, hash chain, vault, audit, transport, signing) import **no npm package
  and no vendor file** — only platform built-ins and first-party relative modules.
  `npm ls --prod` on the root package is empty.
- **9 of 11 modules ship with zero third-party runtime code** (`audit-timeline`,
  `blind-relay`, `detached-hash-signer`, `encrypted-archive`, `p2p-crypto-transfer`,
  `sync-canvas`, `token-gate`, `webgpu-topology`, `zero-knowledge-identity`).
- **Two modules vendor third-party code:**
  - `doc-redactor` vendors **pdf.js, pdf-lib, tesseract.js, tesseract-core, tessdata**
    (~35 MB, all Apache-2.0 / MIT) for local OCR and PDF rendering.
  - `e2e-signed-delivery` vendors **pdf-lib** (~524 KB, MIT) to render the signed
    artifact to PDF.
- **Nothing is fetched from a CDN at runtime** — every vendored library is served
  locally from the image. The `video-tool/` directory ships only its browser
  verification scripts (they need Playwright as a dev dependency); the promo-video
  pipeline (Remotion, TTS, capture) is **not** part of the delivery package.
- **Per-component proof, not a slogan:** the table in
  [`docs/DEPENDENCY_AUDIT.md`](docs/DEPENDENCY_AUDIT.md) is generated from the working
  tree by `scripts/gen-dependency-matrix.mjs` and lists, for every component, its own
  `.js` count, vendored libraries (with size and licence), every cross-module import,
  and every dev-only dependency. `--check` fails if the checked-in copy drifts.

## 6 - Project map

```
Aegis/
|-- server.js                  # unified server: COOP/COEP + static + signaling (zero-dep)
|-- README.md                  # this file
|-- LICENSE                    # Apache License 2.0 (Apache-2.0)
|-- LICENSES/                  # Apache-2.0 license text
|-- DELIVERY_REPORT.md         # engineering + test report
|-- aegis-shell/               # the unifying SPA (dark command-center)
|   |-- index.html             # seven-stage Stepper + sidebar surfaces
|   `-- src/
|       |-- app.js             # seven-stage orchestration + audit wiring
|       |-- adapters.js        # Topology / REDAKTOR / P2P adapters
|       |-- identity.js        # IdentityAdapter (pure submodule imports)
|       |-- sdk.js             # window.AegisSDK public embedding API
|       |-- bus.js             # EventBus
|       |-- context.js         # AegisContext + FLOW_STAGES
|       `-- style.css
`-- modules/
    |-- webgpu-topology/        # Aegis-Topology
    |-- doc-redactor/           # Aegis-REDAKTOR
    |-- zero-knowledge-identity/# Aegis-Identity
    |-- e2e-signed-delivery/    # Aegis-SignedDelivery
    |-- p2p-crypto-transfer/    # Aegis-Transport
    |-- encrypted-archive/      # Aegis-Vault
    |-- audit-timeline/         # Aegis-AuditTrail
    |-- sync-canvas/            # Aegis-Canvas
    |-- detached-hash-signer/   # Aegis-DetachedSign  (detached hash signing; NOT a blind-signature scheme)
    |-- token-gate/             # Aegis-TokenGate  (ECDSA room tokens)
    `-- blind-relay/            # Aegis-BlindRelay (server-blind WebSocket relay)
```

---

## 7 - Extension points

- **Real documents**: replace the shell's `contractForNode()` with a loader that pulls a
  node's actual file (still client-side) into the redaction module, or call
  `AegisSDK.injectFile(file)` from a host application.
- **WebGL2 fallback** for the topology; **GPU-compute** physics for true 10M nodes.
- **More peers / rooms**, TURN for symmetric NAT, and a real key-exchange UI for transfer.
- **Multiple signers**: extend `IdentityAdapter.signHash()` to return a signer array; the
  artifact format and `verifyArtifact()` already support it.
- **Audit export** produces a content-free JSON report safe to attach to a case file.

---

## 8 - How to test

Aegis mixes **headless, repeatable checks** (run here / in CI) with a **manual browser
pass** (needs a real GPU + OCR + WebRTC). Both are documented so the closed loop is
reproducible, not mystic.

The current measured result of both halves — every gate, 191/191 tests, a 130-click
browser sweep across all 13 pages, the delivery archive hash and the container
check — is in [`TEST_REPORT.md`](TEST_REPORT.md), including an explicit list of
paths that were **not** tested and the residual risks.

### A - Headless checks (no browser) - what CI can assert today

```bash
# 1) Static syntax of every shell entry point (ES module mode)
for f in server.js aegis-shell/src/app.js aegis-shell/src/adapters.js \
         aegis-shell/src/identity.js aegis-shell/src/sdk.js \
         aegis-shell/src/context.js aegis-shell/src/bus.js \
         modules/webgpu-topology/src/main.js modules/doc-redactor/src/js/app.js \
         modules/doc-redactor/src/js/aegis-adapter.js \
         modules/p2p-crypto-transfer/src/main.js \
         modules/p2p-crypto-transfer/src/aegis-adapter.js \
         modules/p2p-crypto-transfer/src/transfer.js; do
  node --input-type=module --check < "$f" || echo "SYNTAX FAIL: $f"
done

# 2) English-only convention on all code + docs (no CJK / fullwidth punctuation)

# 3) P2P module unit tests - the OOM guard is proven here
cd modules/p2p-crypto-transfer && npm test
#   -> tests 11, pass 11, fail 0

# 3b) Audit chain unit tests - hash linkage + tamper detection
cd modules/audit-timeline && npm test
#   -> tests 15, pass 15, fail 0

# 4) Cross-origin isolation headers on EVERY response (enables SharedArrayBuffer)
PORT=8082 node server.js & SRV=$!; sleep 1
for u in "/" "/aegis-shell/src/app.js" "/signal?room=probe&from=a" "/nope-404"; do
  curl -s -D - -o /dev/null "http://localhost:8082$u" \
    | grep -iE "^(cross-origin-opener-policy|cross-origin-embedder-policy|cross-origin-resource-policy|HTTP/)"
done
kill $SRV
#   expect: COOP/COEP/CORP present on all four (200 / 200 / 204 / 404).
```

### B - Manual browser pass (Chrome / Edge 113+, real WebGPU/OCR/WebRTC)

1. `node server.js` -> open `http://localhost:8080`.
2. **Confirm isolation**: DevTools Console -> `crossOriginIsolated` must be `true`.
3. **Run the closed loop**:
   - click any topology node -> `Aegis-REDAKTOR` auto-loads that node's contract
     (`Wartungsvertrag-N###.png`, filename stamped with the node id);
   - review the detected black boxes, then click **Send to Aegis Peer**;
   - the shell hashes and signs the PDF, streams it, and verifies it. Watch the log:
     `Redacted PDF ... hashed and signed`, then either an in-memory or a
     "streamed straight to disk" verification message;
   - **Archive to Vault** appears only after `Signature verified`. Enter a passphrase
     (>= 8 characters) and **Seal to vault**;
   - the top stepper turns green stage 1 -> 7.
4. **Prove the OOM fix on a big file**: receiver clicks "Choose save location" to
   pre-lock the writer, then send a multi-GB file and watch the OS memory meter stay flat.
5. **Watch the audit trail**: every stage appends a link to the right-hand timeline
   (`Topology node selected` -> `Document hash signed` -> `Verification passed` ->
   `Sealed in the local vault`). Reload the page; the chain is restored and
   **Verify chain** still reports intact.

### C - Honest gaps (cannot be automated yet)

WebGPU rendering, OCR accuracy on real scans, cross-machine WebRTC, and the
`showSaveFilePicker` gesture require a human in a real browser. The repository is
therefore validated by **static analysis + module-level test suites + signed-artifact
round-trip + live header checks + server smoke tests**; the visual end-to-end loop is a
manual acceptance step recorded here.

---

## 8b - Feature reference

The eleven modules are listed in §3; three (Identity, Vault, AuditTrail) have their
own deep-dive sections below. This section covers the **workbench shell, the operator
compliance console, the remaining eight modules, enterprise auth, and Docker** — the
parts the quick-tour table does not expand.

### Workbench shell (`aegis-shell/`)

The unified SPA. Each surface — Topology, REDAKTOR, SignedDelivery, Vault, Audit,
Admin — is a **free-floating, draggable and resizable window**: grab its header to
move it, drag the bottom-right grip to resize; position and size persist in
`localStorage` and are restored on reload. Panels stay in their default two-column
layout until you first grab one.

### Operator compliance console (`console.html`) — *the EU/DE revenue feature*

This is the product surface German/EU customers pay for, and it is a first-class
feature, not a test artifact. It is an authenticated operator console (Issuer-secret
bearer) with tabs:

- **ROPA** — structured register of processing activities (GDPR Art. 30); fields
  `controller.legalName / address / regNo`, `dpo.email`, `sla.mailbox / timezone`,
  `euRep.name`. Missing facts surface as `409` on the doc gate and as a human-readable
  banner (`COMPLIANCE_LABELS` maps raw field names to plain language).
- **DSAR** — data-subject access-request ledger (GDPR Art. 12/15), 30-day `dueInDays`
  tracking; creation requires a subject name **or** email.
- **DPIA** — data-protection impact assessment record.
- **Documents** — upload a signed ROPA/DPA/SLA/SCC/DPIA; the corresponding `/doc/*`
  gate flips from `409` to `200` (`X-Aegis-Source: uploaded`). Blank templates
  (`/template/*`) return `{{…}}` placeholders (`TEMPLATE — UNFILLED`).
- **Audit / Revocations / Escrow / Sessions / Config / Setup** — operator controls,
  key revocation, secret escrow, live session view, runtime config, first-run setup.
- **Export & Erase** — download a filled `ROPA-filled.md`, and erase a data subject
  (GDPR erasure) under audit. The GDPR Art. 20 data-portability bundle
  (`/export/bundle`) now carries a `provenance` block identifying AEGIS (Yang Jie / Jerome Young)
  as the producer.

The console is **role-gated**: the Admin panel is hidden from the `operator` role
(`.win[hidden]`), visible to `admin`. Switching tabs offline shows a "server
unreachable" banner instead of throwing.

#### Console sign-in (admin)

The console talks to an authenticated server. `/session` is **fail-closed**: with no
issuer secret it answers `401` rather than minting a bearer token, so nobody who can
merely reach the port can claim the `admin` role.

There is no shipped password, and none belongs in this file. A secret is generated
**per deployment** and stays on that deployment:

```bash
# A) first run generates one, mode 0600, git-ignored:
node scripts/setup.mjs          # writes config/local.json with issuerSecret

# B) inject it explicitly (systemd / container / CI):
AEGIS_ISSUER_SECRET="$(openssl rand -hex 32)" node server.js
#    open the shell once as http://host:8080/#issuer=<same secret>
#    the fragment is moved into sessionStorage and stripped from the URL

# Docker: the image listens on 8099
docker run -d -p 8099:8099 \
  -e AEGIS_ISSUER_SECRET="$(openssl rand -hex 32)" aegis
```

The value is a **bearer credential for the admin role** — treat it like an SSH key.
Never commit it, never paste it into an issue, a screenshot or this README. Rotate by
deleting `config/local.json` (or changing the environment value) and restarting; the
previous tokens stop verifying.

`node scripts/verify-secrets.mjs` — wired into `npm test` — walks every Markdown and
workflow file and fails the build when a 64-hex secret, a PEM private key, a JWT, a
GitHub/AWS token or a literal `AEGIS_ISSUER_SECRET=` shows up. Digests are allowed,
because a line that already names a checksum or hash is reporting content, not
leaking a credential.

### Remaining eight modules

- **Aegis-Topology** (`modules/webgpu-topology`) — WebGPU digital twin of up to 1M+
  nodes; self-check passes 300/300 sampling; WebGL2 fallback when WebGPU is absent.
- **Aegis-REDAKTOR** (`modules/doc-redactor`) — local OCR (tesseract.js) + destructive
  PDF redaction. Load a document, draw/auto-detect PII boxes, set zoom / mode / clear,
  export a redacted PDF whose `Producer` is stamped `REDAKTOR — local redaction engine`
  (no bytes leave the browser).
- **Aegis-SignedDelivery** (`modules/e2e-signed-delivery`) — assembles a *signed
  artifact* = `[PDF document bytes] + [UTF-8 JSON signature trailer]`; two ECDSA-P256
  signers (A & B) co-sign the document hash; tamper-evident (one flipped byte fails
  verify). The trailer carries a `producer: "AEGIS v1.0.0 (Yang Jie / Jerome Young)"` watermark.
- **Aegis-Transport** (`modules/p2p-crypto-transfer`) — WebRTC + AES-GCM chunked
  transfer. The receiver streams each decrypted chunk straight to disk (memory-safe,
  no OOM on multi-GB files); LAN/P2P mode dropdown.
- **Aegis-Canvas** (`modules/sync-canvas`) — real-time collaborative board with
  operational-transform sync, multi-cursor presence, and a `fit` viewport control.
- **Aegis-DetachedSign** (`modules/detached-hash-signer`) — *detached hash signing*:
  the signer signs only the document's SHA-256 hash; the document bytes never enter
  the signature bundle (blind/detached, not a blind-signature scheme).
- **Aegis-TokenGate** (`modules/token-gate`) — ECDSA room-admission tokens; the demo
  proves admit / expired / wrong-room / forged paths.
- **Aegis-BlindRelay** (`modules/blind-relay`) — server-blind WebSocket relay that
  forwards **ciphertext only**; the worked example proves the relay never sees
  plaintext.

### Enterprise auth: OIDC & SCIM

- **OIDC** (`AEGIS_AUTH_MODE=oidc`, logic in `server.js`, tests in `modules/oidc/`):
  unconfigured → `/auth/oidc/start` returns `503` (no silent fallback). Configure an
  IdP before enabling.
- **SCIM 2.0 provisioning** (tests in `modules/scim/`): gated by `AEGIS_SCIM_TOKEN`;
  `rotate` immediately revokes the old token.
- Both are off by default. Configuration steps are in `CONFIGURE-BEFORE-DEPLOY.md`.

### Docker deployment

Pull and run — no clone, no build:

```bash
docker run -d --name aegis -p 8099:8099 \
  -e AEGIS_ISSUER_SECRET="$(openssl rand -hex 32)" \
  -v aegis-data:/app/data \
  ghcr.io/jeromeyoung608-commits/aegis:latest
```

Open <http://localhost:8099/>. The image is published by
`.github/workflows/docker-publish.yml` from the exact commit CI gated, so a pulled
image and a from-source build carry the same code. Pin a digest if you need
reproducibility:

```bash
docker pull ghcr.io/jeromeyoung608-commits/aegis:latest
docker inspect --format '{{index .RepoDigests 0}}' ghcr.io/jeromeyoung608-commits/aegis:latest
```

Building it yourself instead (the same result, ~2 minutes):

```bash
git clone https://github.com/jeromeyoung608-commits/aegis.git && cd aegis
docker build -t aegis .
docker run -d -p 8099:8099 \
  -e AEGIS_ISSUER_SECRET="$(openssl rand -hex 32)" \
  -v aegis-data:/app/data \
  aegis
```

The image runs as a non-root user, bakes `docs/` into the image (so compliance
templates resolve at runtime), and persists data on the `/app/data` volume. **Network
exposure:** the server binds all interfaces by design — place it behind a reverse
proxy with TLS and an ACL, as documented in `SECURITY.md`. Do **not** expose the port
directly to untrusted networks.

---

## 9 - Module 01 - Aegis-Identity (Locally Self-Custodied Keys)

A classified plant cannot join a corporate identity provider, so each engineer mints a
local **digital seal** instead: an ECDSA P-256 key pair generated by Web Crypto, with the
private half wrapped by PBKDF2 + AES-GCM and stored in IndexedDB. The public half becomes
a shareable business card - avatar, name, Base64 SPKI key and a SHA-256 fingerprint.

**In the seven-stage loop this module is automatic.** The shell's `IdentityAdapter`
(`aegis-shell/src/identity.js`) reuses the same pure Web Crypto primitives exposed by the
signed-delivery SDK. Signing is triggered automatically by the main shell's
`IdentityAdapter` immediately after `redaktor:export-ready`; there is no button to press
anymore. Verification runs on `p2p:file-received`, and once verification succeeds the
**Archive to Vault** button lights up automatically.

```bash
node server.js
# then open: http://localhost:8080/modules/zero-knowledge-identity/index.html
```

- Type a name (for example `Engineer-A`), choose a passphrase of at least eight
  characters, press **Generate**.
- Reload the page - the card returns from IndexedDB with the same fingerprint, and the
  same passphrase still unlocks the private key.

The passphrase is never stored, the wrapping key is non-extractable, and the module makes
zero network requests. Full detail: `modules/zero-knowledge-identity/README.md`.
Measured results: `modules/zero-knowledge-identity/TEST_REPORT.md` (26/26 headless
assertions, browser reload acceptance passed).

---

## 10 - Module 02 - Aegis-Vault (Local Encrypted Vault)

> **Aegis-Vault: zero-cloud archiving of signed documents.**

A signed contract cannot be left on the desktop. After `Aegis-Identity` verifies the
artifact's ECDSA signature, the shell offers **Archive to Vault**. The file plus its
signature metadata are framed into one payload, encrypted with AES-GCM-256 under a
PBKDF2-SHA-256 key (250,000 iterations, per-record salt), and written as an opaque
`.aegis` container into the browser's Origin Private File System (OPFS). Nothing is
uploaded; there is no account and no sync queue.

**No manual demo button.** Signing is now triggered automatically by the main shell's
`IdentityAdapter` right after `redaktor:export-ready`; there is no button to press
anymore. Once verification succeeds, the **Archive to Vault** button lights up
automatically. Only a passing verdict unlocks the vault action.

```bash
node server.js
# command center:  http://localhost:8080/
# vault browser:   http://localhost:8080/modules/encrypted-archive/index.html
```

- In the shell: click any topology node, redact and export, wait for *Verified*, then
  **Archive to Vault** -> passphrase (>= 8 characters) -> **Seal to vault**.
- The sidebar reports `N sealed records | X KB ciphertext | opfs`; reload the page and
  the count survives, because OPFS is persistent per origin.
- Open the standalone vault page to browse the same directory: ids and ciphertext sizes
  are visible while locked; file names, hashes and signer details appear only after
  unlocking a record.

Failure modes are deliberately distinguishable: `integrity check failed` means the
container changed on disk, `unlock failed` means the passphrase or the AES-GCM tag did
not match. Full detail: `modules/encrypted-archive/README.md`.
Measured results: `modules/encrypted-archive/TEST_REPORT.md` (23/23 headless assertions,
browser seal -> reload acceptance passed).

---

## 11 - Module 03 - Aegis-AuditTrail (Tamper-Evident Audit Trail)

> **Aegis-AuditTrail: a tamper-evident hash-chained timeline for compliance reviews.**

A compliance review asks who did what, and when. The right-hand **Audit Trail** card
appends one hash link for every meaningful action in the seven-stage loop:
topology node selected, document loaded into REDAKTOR, destructive PDF produced,
document hash signed, signed artifact handed to transport, encrypted P2P delivery,
delivery decrypted, verification passed (or rejected / failed / skipped), and vault
sealing.

Each link is `HMAC-SHA256(deviceKey, previousHash | canonical(entry))` (legacy entries
use plain `SHA-256`), so editing, deleting or reordering any entry breaks every later
hash. The trail is **tamper-evident, not immutable**. Every append also emits `audit:append` on
the shell `EventBus`, so an external `AegisSDK` subscriber can watch the chain in real
time. The trail is stored in `localStorage` and survives a reload; **Verify chain**
recomputes it from genesis and marks the first broken link. **Export JSON** produces a
content-free case-file artifact.

```bash
node server.js
# command center:  http://localhost:8080/aegis-shell/index.html
# review page:     http://localhost:8080/modules/audit-timeline/index.html
```

- Click a topology node and complete the closed loop; the timeline fills as each event
  fires. There is no separate signed-delivery demo to run - signing and verification
  happen inline in the main loop.
- Open the standalone review page to see the same chain, verify it, export it, or clear it
  with a two-step confirmation.

The chain implementation is reused from `modules/sync-canvas/src/audit/HashChain.js`
through a single import seam; it is not forked. Full detail:
`modules/audit-timeline/README.md`. Measured results:
`modules/audit-timeline/TEST_REPORT.md` (15/15 headless tests, browser timeline and
reload acceptance passed).

---

## 12 - AegisSDK: embedding the workbench

> **An embeddable, zero-dependency enterprise ecosystem.**

`aegis-shell/src/sdk.js` publishes `window.AegisSDK` on the command-center page. It is a
thin, fully documented facade over the shell's internal `EventBus` - no global state is
copied, no dependency is added, and the SDK never calls into a submodule directly.

| API | Purpose |
|-----|---------|
| `AegisSDK.init(config)` | Apply `{theme, locale, authToken, ...}` and return the SDK. The token stays in memory and is never logged or emitted. |
| `AegisSDK.on(eventName, callback)` | Subscribe to any shell or module event; returns an unsubscribe function. |
| `AegisSDK.injectFile(file)` | Push an external `File` into `Aegis-REDAKTOR` by emitting `redaktor:load-doc`. |

```js
const sdk = window.AegisSDK.init({
  theme: 'dark',
  locale: 'en',
  authToken: '<your-token>',
});

const off = sdk.on('audit:append', (entry) => {
  console.log('audit link', entry.index, entry.hash);
});

const file = new File(
  ['%PDF-1.4 sample bytes'],
  'contract.pdf',
  { type: 'application/pdf' },
);
const receipt = await sdk.injectFile(file);
console.log('injected', receipt.name);
off();
```

Observable events include `topology:node-selected`, `redaktor:load-doc`,
`redaktor:export-ready`, `identity:signed`, `p2p:file-sent`, `p2p:file-received`,
`signed:verified`, `signed:rejected`, `vault:sealed` and `audit:append`.
`redaktor:load-doc` is the single intake seam: both the topology handoff and
`AegisSDK.injectFile()` use it, so externally injected documents enter exactly the same
audited seven-stage loop as node-selected documents.

Because the shell owns the EventBus, the Context and the Adapters, a host application can
embed the workbench, inject documents, and observe every stage without forking a module
or installing an npm package.

---

## 13 - Third-party components

Aegis declares **zero npm runtime dependencies**. Two modules vendor third-party code
locally so the whole pipeline runs with no install and no network access — `doc-redactor`
(five assets under `modules/doc-redactor/vendor/`) and `e2e-signed-delivery` (pdf-lib under
`modules/e2e-signed-delivery/vendor/`, byte-identical to the doc-redactor copy). Each asset
keeps its own upstream licence, unmodified.

| Component | Version | Licence | Used by | Upstream |
|---|---|---|---|---|
| pdf.js | 3.11.174 | Apache-2.0 | doc-redactor | `mozilla/pdf.js` |
| pdf-lib | 1.17.1 | MIT | doc-redactor, e2e-signed-delivery | `Hopding/pdf-lib` |
| tesseract.js | 5.1.1 | Apache-2.0 | doc-redactor | `naptha/tesseract.js` |
| tesseract.js-core | 5.1.1 | Apache-2.0 | doc-redactor | `naptha/tesseract.js-core` |
| tessdata (`deu`, `eng`) | 4.0.0 best_int | Apache-2.0 | doc-redactor | `tesseract-ocr/tessdata` |

Two modules vendor third-party code — `doc-redactor` (five assets, 35 MB) and
`e2e-signed-delivery` (pdf-lib only, 515 KB, byte-identical to the copy in
`doc-redactor`, same SHA-256). The other **nine of eleven modules**, plus
`aegis-shell` and `server.js`, contain **no third-party code at all**.

All eleven modules, plus the shell, the server and the adapters, are listed in the
generated matrix in [`docs/DEPENDENCY_AUDIT.md`](docs/DEPENDENCY_AUDIT.md). What it
records per row: own file count, third-party runtime code (vendored library name,
size, licence-manifest check), every first-party cross-module import, and dev-only
packages used by that module's tests. Rows marked **zero third-party** are exactly
that — no vendor directory, no npm import, platform APIs and relative first-party
modules only. The matrix is regenerated by `npm run deps:matrix` and validated by
`npm run verify:deps` inside `npm test`, so the README cannot drift from the tree.

### External integrations (isolated adapters, not in the kernel)

The zero-dependency kernel (crypto / hash-chain / audit / signaling / redaction render)
stays free of network services. Every external capability is a drop-in adapter that
sits BEHIND an interface, lives outside kernel source, and is **fully removable** —
deleting its directory plus its launch flag leaves Aegis fully functional.

| Adapter | Status | Purpose | Implementation note |
|---|---|---|---|
| RFC 3161 TSA timestamp | **DELIVERED** (optional, off by default) | Anchor a digest to a trusted timestamp | `adapters/tsa-rfc3161/` — a pure Node forwarder (hand-rolled DER, no third-party libs) that POSTs a `TimeStampReq` to an operator-configured TSA and returns the raw CMS token. Enabled with `node server.js --adapter-tsa on --tsa-config <file>`; `POST /adapter/tsa/submit`. Dev: FreeTSA; prod: DigiCert. Never verifies the TSA certificate chain — offline verification is the user's responsibility. |
| Cloudflare R2 storage (EU) | PLANNED | Client-side-encrypted long-term vault archive | Encrypt with Web Crypto, then PUT to R2 (EU). Adapter hooks only; full SigV4 is not hand-rolled into the kernel. |
| Tauri desktop shell | PLANNED | Offline kiosk / signed desktop build | Wraps the existing web app; the kernel is unchanged. |

**External TSA services are external dependencies, not Aegis code.** The TSA adapter
ships with no hardcoded provider URL, key, or certificate; it forwards **only a SHA-256
digest** (never document bytes). Aegis maintains no TSA root-CA trust store and makes
no claim about legal admissibility. It fails safe: any timeout / network error / 4xx
yields `{ tsaStatus: 'failed' }` and never disrupts the hash chain or relay. Remove
`adapters/tsa-rfc3161/` and the `--adapter-tsa` flag to strip it completely. See
`adapters/tsa-rfc3161/README.md` (EN/DE) for GDPR notes and the legal disclaimer.

A CI gate (`scripts/zero-dep-lint.mjs`) enforces this boundary: it fails if any kernel
or adapter source imports a non-platform (`node:*`) or non-relative module. Any future
CMS-verification code must live in `adapters/tsa-rfc3161/vendor/` (isolated, skipped
by the lint, never loaded by default) so a network service can never creep into the core.

### Files that must travel with any copy

```
modules/doc-redactor/vendor/<component>/LICENSE     upstream licence text, unmodified
modules/doc-redactor/vendor/<component>/NOTICE      copyright attribution
modules/doc-redactor/vendor/THIRD_PARTY_NOTICES.md  full attribution index
modules/doc-redactor/vendor/MANIFEST.json           version + SHA-256 per file
modules/e2e-signed-delivery/vendor/pdf-lib/LICENSE  MIT, Copyright (c) 2019 Andrew Dillon
modules/e2e-signed-delivery/vendor/MANIFEST.json    version + SHA-256
```

The bundled builds are upstream output. Their copyright headers were stripped by the
upstream build step, not by this repository — attribution therefore lives in the per-component
`LICENSE` and `NOTICE` files. Nothing here removed or altered an attribution notice, and no
vendored file was modified.

### License

Aegis is **open source**, licensed under the **Apache License 2.0** — see
[`LICENSE`](LICENSE). You may use, modify, redistribute and sell it,
including commercially, without paying us anything and without asking
permission. The only obligations are those Apache-2.0 itself imposes:
keep the licence and attribution notices, and state significant changes.

**What is free:** the software. Every first-party file in this repository is
Apache-2.0. There is no paid tier, no seat limit, no revenue threshold and no
"contact sales" gate.

**What is paid (optional):** our time. Deployment, integration, hardening
reviews, SBOM/CRA readiness packs and annual support are offered as services
(see [`PRICING.md`](PRICING.md)). A support contract is never required to run
the software.

**Third-party components** keep their own licences — see [`NOTICE`](NOTICE)
and each `vendor/<component>/LICENSE`. Apache-2.0 does not relicense them.

Aegis™ is a trademark of the copyright holder; the licence grants no
trademark rights. Do not use the name to endorse a modified build.

**Authorship watermark.** Every first-party source file carries, in its first four
lines, both the copyright line and the marker
`Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0`.
The watermark is attribution, not an extra licence term: Apache-2.0 already requires
the copyright and `NOTICE` attributions to travel with the code, and the marker adds
no restriction on use, modification or redistribution. `scripts/verify-headers.mjs`
fails the build if either line is missing from any of the 217 shipped source files.

---

## 14 - Post-audit P3 closure (delivery, CSP, diagnostics, wording)

Five items were deliberately left open in the 2026-11-13 audit because they needed a
product decision. The decisions below are now implemented and gated in CI.

### 13.1 Delivery footprint (AEG-19) — the working tree is not the deliverable

The working tree is ~845 MiB because it carries **regenerable** build caches
(`video-tool/node_modules/.cache`, `.remotion`, `out/*.mp4`) and Playwright copies.
Nothing is deleted from the working tree: those caches are needed to re-render the
demo video and re-run the browser gates. Instead there is a single reproducible
release packer:

```bash
npm run pack:delivery       # dist/aegis-delivery-<version>.tar.gz + dist/MANIFEST.json
npm run verify:delivery     # re-verify every file's SHA-256 against the manifest
```

The packer excludes build caches before archiving, so the archive is a small
fraction of the working tree. A second build is byte-identical (fixed tar epoch,
sorted names, zeroed gzip mtime). Run `npm run verify:delivery` for the current
file count and size — every sha256 matches the manifest. The archive
excludes `node_modules/`, build caches, rendered media and private-key material, but
**keeps `vendor/`** (pdf.js, pdf-lib, tesseract, tessdata are runtime assets, including
`*.traineddata.gz`). `dist/` is in `server.js`'s deny list and is never HTTP-reachable.
A missing required file, a forbidden path, or an archive over 80 MiB fails the gate.

### 13.2 Content-Security-Policy (AEG-23) — per-response nonce, not `unsafe-inline`

The pages mix external `<script src>` with genuine inline
`<script type="module">` blocks. Hash CSP would break on every edit and
`'unsafe-inline'` would defeat the purpose, so `server.js` mints a fresh
`crypto.randomBytes(16)` nonce **per HTML response**, injects it into every opening
script tag, and sends it in `Content-Security-Policy`. HTML is `no-store` so a spent
nonce can never be replayed from cache. The policy keeps `'self'`, `blob:` and
`'wasm-unsafe-eval'` (the vendored OCR/PDF workers need them), sets
`frame-ancestors 'self'` so the shell's own iframes still work, and blocks
`object-src` / `base-uri`. `doc-redactor`'s stricter `<meta>` CSP remains and is
intersected by the browser with the header policy.

Gate: `node video-tool/verify-csp.mjs` (after `node server.js`). It asserts a fresh
nonce on every response, nonce on every script tag, no `unsafe-inline` in
`script-src`, real inline module scripts still executing, an injected script
**without** a nonce being refused, and `dist/` returning 404.

### 13.3 Diagnostics (AEG-21) — product metrics stay, raw timings move to `?diag=1`

The HUD still shows FPS / Nodes / Edges / Draw calls. `Frame ms` and `Worker tick ms`
are developer-only: the physics Worker runs on its own clock, so a cold-start tick
could read thousands of ms while the render loop held 60 FPS. Those two rows and the
on-page pick-debug panel are hidden unless you open the topology page with
`?diag=1`; the worker tick value is also warm-up-filtered and exponentially smoothed.
The picking self-test now states its scope honestly: it verifies projection math,
while DOM event delivery is covered by `video-tool/verify-webgl2.mjs`.

### 13.4 Identity gate (AEG-24) — no auto-unlock, but the gate is explained

Creating an identity seals the private key immediately, so **Sign stays disabled**.
Auto-unlocking would keep key material in memory and defeat the sealed-vault
guarantee. Instead the page now states the gate (`#signGateHint`, `title`,
`aria-describedby`), points at the Unlock panel, and updates the message on unlock.
`btnSign` is disabled for a visible, stated reason rather than looking broken.

### 13.5 Claims wording (AEG-22) — normative baseline

[`docs/CLAIMS-WORDING.md`](docs/CLAIMS-WORDING.md) is the normative wording table.
Do not say `forward secrecy` → say **per-chunk authenticated encryption with a
fresh random IV** (one PBKDF2 session key, no ratchet); do not say `blind signature`
→ say **detached hash signing** (no blinding factor); do not say `immutable` → say
**tamper-evident HMAC/SHA-256 hash chain**; do not say `Prove who signed it` → say
**verify integrity against a self-asserted signer key**.
Directory names such as `zero-knowledge-identity` and `blind-relay` are historical
and kept for compatibility, but each README now explicitly denies the cryptographic
claim. `npm run verify:claims` fails CI if an over-claim returns to user-facing copy;
explicit denials are allowed. No API, export, wire format or access-control decision
changed.

### 13.6 Topology backend selection — WebGL2 flaky regression fix

Post-closure, `video-tool/verify-webgl2.mjs` intermittently timed out waiting on
`window.__topoBackend` (worst observed 7581 ms against a 6 s cap). Hands-on
diagnosis showed two real causes, neither a CSP/`?diag=1` regression:

1. `navigator.gpu.requestAdapter()` has **no built-in timeout**; headless
   SwiftShader blocks 3–8 s before returning `null`, so the WebGPU-then-WebGL2
   fallback chain occasionally blew past the test's wait.
2. The test's `delete navigator.gpu` was a **no-op** — `navigator.gpu` is a
   read-only prototype getter, so the delete silently failed and the test only
   fell back by luck when headless had no adapter.

Four fixes (A/B/C/D) were applied to `modules/webgpu-topology/src/gpu/device.js`
and `video-tool/verify-webgl2.mjs`:

- **A** — `pickGpu()` honors an explicit `?gpu=webgl2` / `?gpu=webgpu` URL
  override as a synchronous short-circuit, and the test now navigates to
  `index.html?gpu=webgl2` so the WebGL2 path is exercised deterministically
  (no adapter wait, no reliance on the deleted getter).
- **B** — `requestAdapter()` is raced against a 2 s `setTimeout(() => null)`, so
  a missing/absent adapter resolves fast and falls back to WebGL2 instead of
  hanging the boot path.
- **C** — `window.__topoBackend = 'pending'` is published the instant `pickGpu`
  starts, and `window.__topoBackendReason` records the resolution path
  (`forced webgl2`, `webgpu default`, `webgpu fell back`, …) for
  self-explaining failures.
- **D** — `device.lost` is downgraded from `console.error` to `console.warn`; a
  lost device during normal teardown is benign noise and must not trip the
  "no fatal console errors" runtime gate.

Gate: `verify-webgl2.mjs` is now stable — `window.__topoBackend` resolves to
`webgl2` in well under 1 s, and a 3/3 repeated run passes. `?gpu=` is also a
handy manual diagnostic: open any topology URL with `?gpu=webgl2` or
`?gpu=webgpu` to force a backend.

### 13.7 Final regression gate status

All gates green after the WebGL2 fix (run on clean, port-collision-free servers):

| Gate | Command | Result |
|------|---------|--------|
| Unit suite | `npm test` | 151 / 151 pass |
| Claims wording (AEG-22) | `npm run verify:claims` | 276 files scanned, no forbidden claims |
| Delivery packer (AEG-19) | `npm run verify:delivery` | VERIFY PASS — every sha256 matches, no caches/media/keys; source-vs-package freshness check (B-02) |
| CSP nonce (AEG-23) | `node video-tool/verify-csp.mjs` | ALL PASS |
| P3 closure | `node video-tool/verify-p3.mjs` | ALL PASS (12 pages + AEG-21/24 + P0 PoCs + F-01 forged→DENY regression) |
| WebGL2 fallback | `node video-tool/verify-webgl2.mjs` | 3 / 3 pass (was flaky) |
| Runtime smoke | `node video-tool/verify-runtime.mjs` | ALL PASS (goto retry ×3 added — no longer flaky) |
| Console (gated) | `node video-tool/verify-p3.mjs` | `/aegis-shell/console.html` 200 + sign-in control renders (N-01 coverage added) |
| Page coverage | — | **13 / 13 first-party pages** (12 modules + shell + console) |
| Deep flows | `npm run verify:flows` | **12 / 12 verified on Chromium (2026-11-14)** — token-gate 4-states, 3-party blind sign+verify, vault seal, canvas stamp edit, topology 100k, shell surface, zero-external, cosign 2/2, p2p local (same-context) + LAN (sessionStorage secret). Selectors matched to confirmed module DOM. p2p local/LAN assert page-load + zero-pageerror (peer-connect needs a live 2-peer / session secret). Requires Playwright + Chromium (dev-only; see note below). |
| Accessibility | — | `aria-busy` on **every** long-task button across all 12 modules + console + shell (N-04 → EN 301 549 / WCAG 4.1.2 + 4.1.3) |
| Security hardening | — | Audit trail is tamper-evident and append-only for operator/system subjects — `/audit/erase` refuses protected subjects (403); GDPR erasure still targets data subjects. Login throttled per-IP + per-(IP,user) (429 + lockout) **plus a per-IP enumeration guard** (distinct-username 429) that closes the account-existence side-channel; **a per-user lockout now spreads to the whole IP**, so probing non-existent usernames also returns 429 (v5 fix). **token-gate rejects non-canonical (tampered) signatures** — closes a forged-token acceptance flaw (~21% of trailing-char flips admitted before the fix). Console Audit CSV/JSON export fixed (`res.clone`); `GET /export/bundle` adds Art.20 portability (now includes account metadata). `npm run doctor` self-diagnostic. (B-04 + must-fix #5 + token-gate + M-01 + enum guard + lockout-spread) |
| Static-surface lockdown (v7) | `server.js` | **B-01/B-01b/B-02/B-04 closed**: `config/`, `data/`, `server/` are denied as PRIVATE TOP-LEVEL dirs (depth-0 match, so `modules/webgpu-topology/src/data/` still serves), `.db*` extensions denied, encoded traversal (`%2e%2e`, double-encoded) rejected on the decoded path. `GET /config/local.json`, `/data/aegis.db`, `/server/store.js` now 403/404 — the issuer secret is no longer reachable from the port. `Referrer-Policy` / `Permissions-Policy` / `nosniff` / `HSTS` on every response; `/audit?limit=` requires a positive integer and clamps to 1000; DB startup failure prints an actionable message. |
| Secret/DB never ship (v7) | `scripts/package-delivery.mjs` | **B-03 closed**: packer excludes `config/local.json` and top-level `data/*` regardless of `.gitignore`, with two hard assertions on both build and `--verify` (against actual tar entries). `scripts/setup.mjs` prints `rotating` and rotates any pre-existing `issuerSecret` instead of silently reusing it, and chmods the file to `0600` on both create and rotate. `Dockerfile` uses `node:22-alpine` (node:sqlite) and creates `config/` at build time instead of `COPY`-ing a secret. `npm run verify:zero-deps` / `npm run verify:p3` are now first-class gates. |
| Compliance package | `docs/compliance/` | Privacy Policy (retention table, Art.12(3), cookie statement, DPO, DE), DPA (TOM Annex + 24h/72h breach + signature), ROPA (controller + transfer basis), SOC2 readiness, **SCIM 2.0 (implemented, `AEGIS_SCIM_TOKEN`)**, **OIDC SSO (implemented, `AEGIS_AUTH_MODE=oidc`)**, Incident Response / DR-Backup / Access-Review / Sub-processor inventory, VPAT 2.5 EU / WCAG 2.2 AA, SLA, Data-Residency; `GET /healthz` + `GET /health` probes; `GET /export/bundle` (Art.20); `scripts/cleanup.mjs` + `scripts/uninstall.mjs` + `Dockerfile`. (closes the EU/US compliance gap) |
| Identity / SSO | `server/oidc.js` | OIDC authorization-code flow with RS256 id_token verification via `node:crypto` (zero external dependency) and SCIM 2.0 provisioning (`/scim/v2/Users`, `AEGIS_SCIM_TOKEN` bearer). Both are opt-in feature flags — the zero-config local deployment is unchanged. SCIM deprovisioning disables login (immediate 401) without purging the tamper-evident audit trail. |

> **E2E prerequisite for `verify:flows`:** the deep-flow gate needs a browser.
> Playwright is **dev-only** and does not affect the zero-runtime-dependency
> claim. Install once with `npm i -D playwright && npx playwright install chromium`,
> then run against a live server:
> `BASE=http://localhost:8099 AEGIS_ISSUER_SECRET=<issuer> node video-tool/verify-flows.mjs`.

---

## 15 - From security-kernel demo to EU/US industrial deployment

The core zero-trust kernel + the P3 audit closure are done (§14). To be shippable
to European/American industrial-compliance customers, the workbench must move from
a **local-first demo** to a **production system**. This is a phased program, executed
phase by phase; each phase is verified ("wired up") before the next starts. Status table
at the end of this section.

### 14.1 One-click install (Phase 0 — DONE)

Zero external dependencies. The only requirement is **Node.js ≥ 22** (for the
built-in `node:sqlite`); nothing else is installed or run.

```bash
npm run setup     # creates data/ + config/local.json (auto-generated issuer secret)
npm start         # node server.js
```

- `data/aegis.db` is an embedded SQLite store (Node built-in) — no Postgres/Redis
  to install, so "one-click" stays one-click.
- `config/local.json` (git-ignored) carries an auto-generated `issuerSecret`;
  `server.js` reads it automatically, or override via `AEGIS_ISSUER_SECRET`.
- The server now writes a **server-side audit log** (`audit_events` table) that
  survives restarts — the foundation for Phase 1's retained + GDPR-erasure-aware trail.

### 14.2 Phased roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| **P0** | Foolproof install + embedded `node:sqlite` store + server-side audit log | ✅ done (this section) |
| **P1** | Audit trail durable in SQLite + GDPR right-to-erasure (targeted deletion of a subject's rows + retained erasure marker) + retention purge (excludes compliance markers) + operator-gated `/audit` API (list / CSV export / erase / purge) | ✅ done |
| **P2** | Identity foundation (server-side): local account (scrypt + salt) + server-side sessions (TTL) + operator auth accepts session OR bootstrap secret; OIDC authorize-redirect scaffold (config-driven, 501 until IdP configured); SAML/LDAP documented config stubs (not faked). Browser `token-gate` wiring to sessions deferred to module integration. | ✅ done |
| **P3** | TSA RFC 3161 verification: signature-over-signedAttrs + message imprint + X.509 **chain-to-trust-store** + validity (eIDAS admissibility). Zero-dep (`node:crypto`). `verifyTimestampToken`, adapter `submit` returns `verification`, plus `/adapter/tsa/verify` endpoint. OCSP/CRL revocation check deferred. | ✅ done |
| **P4** | Cross-site transport: token-gated `/relay` server-mediated data relay (server-blind fallback when no TURN) + STUN/TURN config surfaced via `/session` + server-side **key-escrow** policy (`/escrow` deposit/retrieve, operator break-glass) | ✅ done |
| **P5** | Revocation: local CRL/OCSP-style deny-list of key fingerprints (`/admin/revoke`) + **admission-time check** in `/session` | ✅ done |
| **P6** | Production-leaning UI foundation: unified **design system** + **Operator Console** (`/aegis-shell/console.html`) that makes P1–P5 server features usable (login, audit, revocation, escrow, TSA verify). Module product UIs are functional but not redesigned in this pass. | ✅ done (foundation) |
| **P7** | Compliance shell: **i18n** (en/de) + **PWA** (manifest + offline service worker) + **SBOM** generation (CycloneDX) + **threat model** + **CRA/NIS2** + **SECURITY.md** self-assessment. Independent third-party penetration test remains required (cannot be performed by this project — explicitly out of scope). | ✅ done (pen-test external) |

The operations console is available in English and German. Module interfaces are in English. Support and correspondence are provided in English and German.

### 14.3 Honest scope note

Two items cannot be closed by code alone:

- **Independent penetration test** (part of P7) must be performed by a third party
  — this project can only produce the threat model and an internal self-assessment.
- P6 (full UI) and P7 (localization/a11y/PWA) are the largest phases and are
  intentionally late in the order so the security + data foundations are solid first.

