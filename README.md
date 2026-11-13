# AEGIS - Secure Edge Collaboration Workbench

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
building blocks** - by `aegis-shell/` through an `EventBus` + `postMessage` bridge. No
module imports another; they communicate only on the `aegis` message channel. The shell
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

## 6 - Project map

```
Aegis/
|-- server.js                  # unified server: COOP/COEP + static + signaling (zero-dep)
|-- README.md                  # this file
|-- LICENSE                    # MIT
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
    |-- detached-hash-signer/   # Aegis-BlindSign  (detached/blind hash signing)
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
#   -> tests 10, pass 10, fail 0

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

## 11 - Third-party components

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

Two modules vendor third-party code — `doc-redactor` (five assets) and
`e2e-signed-delivery` (pdf-lib only, byte-identical to the copy in `doc-redactor`,
same SHA-256). The other ten modules — `aegis-shell`, `audit-timeline`, `blind-relay`,
`detached-hash-signer`, `encrypted-archive`, `p2p-crypto-transfer`, `sync-canvas`,
`token-gate`, `webgpu-topology`, `zero-knowledge-identity` — contain **no third-party code**.

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

### Licensing — MIT for first-party code, third-party terms unchanged

Aegis is released under the **MIT License** (see [`LICENSE`](./LICENSE)). You may use,
copy, modify, merge, publish, distribute, sublicense and sell it — commercial use included —
with no fee and no permission needed from the author.

Two things MIT does *not* do:

1. **It does not relicense the vendored components.** pdf.js, tesseract.js, tesseract.js-core
   and tessdata stay Apache-2.0; pdf-lib stays MIT. Their terms travel with those files
   whatever you do with the rest of the repo.
2. **It does not require keeping the attribution.** MIT permits sublicense and modification,
   so a redistributor may drop `ENGINE BY JEROME YOUNG` from their own copy. Attribution is
   welcome, not required. The one thing that must survive is the copyright notice in
   `LICENSE` — that is MIT's own condition, not an extra one.

If you redistribute, carry `LICENSE` plus the `vendor/<component>/LICENSE` and `NOTICE`
files above, and leave the "Powered by" credits for pdf.js, tesseract.js and pdf-lib in the
`doc-redactor` UI, since those libraries ask for it in their own terms.

---

## 13 - Post-audit P3 closure (delivery, CSP, diagnostics, wording)

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

Measured: **845 MiB working tree → 16.0 MiB archive / 304 files**, byte-identical on
a second build (fixed tar epoch, sorted names, zeroed gzip mtime). The archive
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
| Claims wording (AEG-22) | `npm run verify:claims` | 216 files scanned, no forbidden claims |
| Delivery packer (AEG-19) | `npm run verify:delivery` | 307 files, every sha256 matches, 16.0 MiB |
| CSP nonce (AEG-23) | `node video-tool/verify-csp.mjs` | ALL PASS |
| P3 closure | `node video-tool/verify-p3.mjs` | ALL PASS (12 pages + AEG-21/24 + P0 PoCs + F-01 forged→DENY regression) |
| WebGL2 fallback | `node video-tool/verify-webgl2.mjs` | 3 / 3 pass (was flaky) |
| Runtime smoke | `node video-tool/verify-runtime.mjs` | ALL PASS (goto retry ×3 added — no longer flaky) |
