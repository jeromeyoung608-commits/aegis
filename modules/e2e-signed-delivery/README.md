# e2e-signed-delivery — End-to-End Signed Artifact Delivery

## 1. What it solves
A signed artifact must survive a hop from signer to counterparty with its signatures and hash chain intact, and the receiver must be able to verify everything locally before trusting it. This module assembles, transports, and verifies signed artifacts end to end.

## 2. Who buys this
Any workflow that hands a signed, multi-party document to another party over an untrusted channel and needs local verification.

## 3. Run in 60 seconds
```bash
cd modules/e2e-signed-delivery
node --test                 # 14/14 green
python3 -m http.server 8080 # open index.html (browser flow; Playwright path skipped without browser)
```

## 4. Integration contract
`assembleArtifact`, `parseArtifact`, `verifyArtifact`, and the crypto/PDF helpers are importable. The shell calls these after signing and before sealing.

## 5. Architecture
document bytes + trailer(signers) → assemble → transport (P2P/relay) → parse → verify (hash match + all signatures). The trailer is an array, so multi-signer artifacts are native.

**Group delivery:** `src/sdk/envelope.js` wraps the document DEK to N recipients' ECDH P-256 public keys (fresh ephemeral ECDH per recipient, AES-GCM-wrapped DEK). One sealed blob opens independently for each recipient — no shared passphrase, no per-recipient re-encryption. Any recipient not listed at seal time is rejected, and the envelope is closed (adding a recipient later does not grant access).

## 6. Guarantees & threat model
Hash-chain integrity, multi-signature verification, tamper detection. Out of scope: the live transport medium (handled by p2p-crypto-transfer / blind-relay).

## 7. Known limits
The browser/Playwright flow is skipped automatically when no browser is available, so the node suite stays deterministic.

## 8. Verification
`node --test` → 14/14 green (assemble/verify round trip, chain integrity, tamper, multi-signer).

## 9. Measured performance
Suite ~683 ms (Node 26), deterministic.

## 10. Dependencies
**A · Pure Zero** first-party code: 0 npm deps. Vendored pdf-lib via import map only.

## 11. License
Repository LICENSE. Vendored pdf-lib keeps its own MIT license.

## 12. Changelog
- 2026-11-11 — README delivered (English); TEST_REPORT delivered; 14/14 green.
