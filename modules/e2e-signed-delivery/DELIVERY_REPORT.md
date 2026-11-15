# e2e-signed-delivery — DELIVERY REPORT (MDS-1)

> Machine-checkable delivery contract. Mirrors the 12 chapters of the README.

### 1. What it solves
A signed artifact must survive a hop from signer to counterparty with its signatures and hash chain intact, and the receiver must be able to verify everything locally before trusting it. This module assembles, transports, and verifies signed artifacts end to end.

### 2. Who buys this
Any workflow that hands a signed, multi-party document to another party over an untrusted channel and needs local verification — forensic hand-off, audit attestation, regulated document exchange.

### 3. Run in 60 seconds
```bash
cd modules/e2e-signed-delivery && node --test   # 14/14 green
python3 -m http.server 8080                     # open index.html (browser flow; Playwright skipped without a browser)
```

### 4. Integration contract
Pure ESM, zero deps, browser + Node. `assembleArtifact`, `parseArtifact`, `verifyArtifact`, and the crypto/PDF helpers are importable. The shell calls these after signing and before sealing.

### 5. Architecture
document bytes + trailer(signers) → assemble → transport (P2P/relay) → parse → verify (hash match + all signatures). The trailer is an array, so multi-signer artifacts are native (no re-wrapping for a second signer). **Group delivery** (`src/sdk/envelope.js`): the document DEK is wrapped to each recipient's ECDH P-256 public key, so one sealed blob opens independently for every recipient; non-recipients and late-added recipients are rejected. Verified by `tests/envelope.test.mjs` (4/4).

### 6. Guarantees & threat model
Hash-chain integrity, multi-signature verification, tamper detection. Verifies the recomputed SHA-256 over the PDF region against each ECDSA P-256 signature over the raw 32-byte digest. Out of scope: the live transport medium (handled by p2p-crypto-transfer / blind-relay).

### 7. Known limits
The browser/Playwright flow is skipped automatically when no browser is available, so the node suite stays deterministic. Large-file stress is not part of the unit suite.

### 8. Verification
`node --test` → **14 / 14 pass, 0 fail** (`tests/*.test.mjs`): assemble/verify round trip, chain integrity, tamper, multi-signer.

### 9. Measured performance
Suite ~683 ms (Node 26), deterministic.

### 10. Dependencies
**A · Pure Zero** first-party code: 0 npm deps. PDF assembly uses a **vendored pdf-lib**, isolated under `vendor/` and loaded via import map only — it is an external, replaceable artifact, not part of the zero-dependency kernel, and keeps its own MIT license. This is the single, explicitly-marked vendor dependency of this module.

### 11. License
Repository LICENSE. Vendored pdf-lib keeps its own MIT license.

### 12. Changelog
- 2026-11-13 — DELIVERY_REPORT delivered (MDS-1); 14/14 green; vendored pdf-lib flagged as the only vendor dependency.
- 2026-11-13 — added multi-recipient group-delivery envelope (`src/sdk/envelope.js` + `tests/envelope.test.mjs`, 4/4).
