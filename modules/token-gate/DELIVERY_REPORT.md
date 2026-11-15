# token-gate — DELIVERY REPORT (MDS-1)

> Machine-checkable delivery contract. Mirrors the 12 chapters of the README.

### 1. What it solves
Plain collaboration links admit anyone with the URL. This module issues short-lived, ECDSA-signed, room-bound tokens; the relay verifies the signature with a root public key and admits only verified key-holders. The server never learns identities.

### 2. Who buys this
Teams needing trusted admission collaboration: multi-party co-signing rooms, private whiteboards, controlled data rooms.

### 3. Run in 60 seconds
```bash
cd modules/token-gate && node --test   # 7/7 green
python3 -m http.server 8080            # open index.html
```

### 4. Integration contract
Pure ESM, zero deps, browser + Node. `generateRootKey`, `export/importPublicKey`, `export/importPrivateKey`, `issueToken`, `verifyToken`, `gate`. Also `window.TokenGate`.

### 5. Architecture
issuer root key → `issueToken` → token (header.payload.signature, base64url) → relay `verifyToken(rootPub, token, {room})` → ADMIT/DENY. Relay holds only the root public key.

### 6. Guarantees & threat model
Token authenticity (no forgery without root key), rejection of expired/wrong-room/wrong-audience/tampered tokens. Out of scope: root-key compromise, compromised client.

### 7. Known limits
Stateless tokens, no revocation list. Default `aud:'*'` is open; high security should bind a specific public key.

### 8. Verification
`node --test` → **7 / 7 pass, 0 fail** (`tests/token-gate.test.mjs`).

### 9. Measured performance
Sub-millisecond issue/verify (native Web Crypto ECDSA P-256); full suite ~130 ms.

### 10. Dependencies
**A · Pure Zero**: 0 npm deps, 0 vendor, 0 external requests (platform Web Crypto).

### 11. License
Repository LICENSE. Aegis's own implementation.

### 12. Changelog
- 2026-11-11 — delivered; 7/7 assertions green; standalone index.html; MDS-1 contract.
