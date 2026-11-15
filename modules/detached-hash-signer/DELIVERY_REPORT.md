# detached-hash-signer — DELIVERY REPORT (MDS-1)

> Machine-checkable delivery contract. Mirrors the 12 chapters of the README and answers the buyer's questions directly.

### 1. What it solves
Multi-party approval of sensitive documents: each signer signs only a SHA-256 hash, so the document bytes never leave the local machine and never enter the signature bundle.

### 2. Who buys this
B2B teams needing multi-party approval without exposing document bytes (legal/finance/exec co-signing, regulatory filing).

### 3. Run in 60 seconds
```bash
cd modules/detached-hash-signer && node --test   # 8/8 green
python3 -m http.server 8080                       # open index.html
```

### 4. Integration contract
Pure ESM, zero deps, browser + Node. `sha256Hex`, `generateKeyPair`, `export/importPublicKey`, `signHash`, `verifySignature`, `makeBundle`, `verifyBundle`, `isDetached`. Also `window.DetachedHashSigner`.

### 5. Architecture
doc → SHA-256 → docHash → each exec signs the hash → `makeBundle` (hash + signatures only) → `verifyBundle`. No document bytes travel.

### 6. Guarantees & threat model
Detached property (`isDetached`), signature verification, tamper resistance. Out of scope: private-key compromise, host OS compromise.

### 7. Known limits
Signs the hash only; document transport handled upstream. No enforced signature ordering chain.

### 8. Verification
`node --test` → **8 / 8 pass, 0 fail** (`tests/detached-hash-signer.test.mjs`).

### 9. Measured performance
Sub-millisecond sign/verify; full suite ~23 ms (Node 26).

### 10. Dependencies
**A · Pure Zero**: 0 npm deps, 0 vendor, 0 external requests (platform Web Crypto).

### 11. License
Repository LICENSE. Aegis's own implementation, no third-party attribution encumbrance.

### 12. Changelog
- 2026-11-11 — delivered; 8/8 assertions green; standalone index.html; MDS-1 contract.
