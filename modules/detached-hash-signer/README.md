# detached-hash-signer — Detached Hash Signing

> **Terminology**: this is **detached hash signing**, *not* a cryptographic blind
> signature scheme. There is no blinding factor and no unblinding step — the signer
> signs a SHA-256 hash they can see. The historical module name is kept for
> compatibility. See `docs/CLAIMS-WORDING.md`.

---

### 1. What it solves
Multi-party approval often involves extremely sensitive documents (M&A terms, medical records, financials). Traditional e-signing forces the signer to receive the full file, creating a leak surface the moment it is handled. This module lets each signer sign only an **a SHA-256 document hash**; the document bytes never leave the local machine, never enter the signature bundle, and are never seen by the server/relay.

### 2. Who buys this
B2B scenarios needing **multi-party approval without exposing document bytes**: legal/finance/executive co-signing of confidential files, regulatory filing, cross-institution joint endorsement.

### 3. Run in 60 seconds
```bash
cd modules/detached-hash-signer
node --test            # 8 assertions, all green
# Standalone browser demo: serve this directory with any static server
python3 -m http.server 8080  # then open http://127.0.0.1:8080/
```

### 4. Integration contract
Pure ESM, zero dependencies, works in both browser and Node (platform Web Crypto). Named exports:
- `sha256Hex(bytes)` / `sha256HexOfText(text)` — document hash
- `generateKeyPair()` / `exportPublicKey(k)` / `importPublicKey(b64)` — ECDSA P-256 keys
- `signHash(privateKey, hashHex)` / `verifySignature(publicKey, hashHex, sigB64)` — sign / verify a hash (detached signing)
- `makeBundle({docName, docHash, signers})` / `verifyBundle(json)` — detached signature bundle
- `isDetached(json)` — proves the bundle contains no document bytes

Also exposed as `window.DetachedHashSigner` in the browser, so external systems can integrate directly.

### 5. Architecture
```
confidential doc ──SHA-256──▶ docHash(64 chars)  ──┐
                                                  ├─▶ each exec signs docHash ─▶ signers[]
                                                  │     (doc bytes never leave local)
makeBundle(docHash, signers) ─▶ {kind,docHash,signers}  ← no original
verifyBundle() ─▶ all signatures valid?
```
The bundle holds only `docHash + each signer(publicKey, signature)` — no document content.

### 6. Guarantees & threat model
- **Detached property**: `isDetached` proves the bundle carries only hash + signatures, never the document.
- **Signature attribution**: each signer signs the hash with their own private key; the public key verifies. This proves key possession only — signer identity is self-asserted.
- **Tamper resistance**: any signature failure makes `verifyBundle` return `ok:false` immediately.
- Out of scope: private-key compromise (holder's responsibility), compromised host OS.

### 7. Known limits
- This module only signs the hash; document distribution/storage/transport is handled upstream (e.g. blind-relay + encrypted-archive).
- It does not enforce a signature chain order; chained co-signing (each party signs prior signatures) can be layered on top.

### 8. Verification
See `TEST_REPORT.md`: `node --test` all green (8/8), covering hash stability, signature verification, tamper failure, three-party detached signing, missing-signature failure, detached property, and malformed input.

### 9. Measured performance
Single sign / verify is sub-millisecond (native Web Crypto ECDSA P-256, measured on Node 26).

### 10. Dependencies
**A · Pure Zero**: 0 npm deps, 0 vendor, 0 external requests — only platform Web Crypto.

### 11. License
Consistent with the repository LICENSE. This module is Aegis's own implementation, with no third-party attribution encumbrance.

### 12. Changelog
- v1.0.0 — detached-sign API, detached bundle, detached-property check, standalone `index.html` demo, and `TEST_REPORT.md`.

## Measurement provenance

Any timing, throughput or count in this README was measured on **Apple silicon (macOS, 2026-11-16)** with **Node v22.23.2** and **Chromium 113+**, on the checked-in v1.0.0 tree. Numbers are indicative for that machine, not a service-level commitment.
