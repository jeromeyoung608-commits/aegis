# token-gate — Token-Gated Rooms (ECDSA Room Tokens)

> ECDSA token-gated WebRTC / collaboration rooms. Only verified key-holders may enter the co-signing session.

---

### 1. What it solves
Plain WebRTC / collaboration links are "whoever has the URL joins" — fatal in B2B. This module issues short-lived, ECDSA (P-256) signed tokens bound to a room id and an optional audience (a specific approver public key). The relay/server verifies the token signature with a root public key and admits ONLY verified key-holders. The server never learns who a person is — it only validates cryptography.

### 2. Who buys this
Teams needing trusted admission collaboration: multi-party co-signing rooms, private whiteboards, controlled data rooms — any "link-leak shouldn't grant entry" scenario.

### 3. Run in 60 seconds
```bash
cd modules/token-gate
node --test            # 7 assertions, all green
python3 -m http.server 8080  # open http://127.0.0.1:8080/ to see issue/admit demo
```

### 4. Integration contract
Pure ESM, zero dependencies, browser + Node. Named exports:
- `generateRootKey()` / `exportPublicKey(k)` / `importPublicKey(b64)` — issuer root key
- `issueToken(rootPriv, { room, exp?, ttlMs?, audience?, jti? })` — issue token (header.payload.signature, all base64url)
- `verifyToken(rootPub, token, { room?, requiredAud? })` → `{ok, room, exp, aud, reason}`
- `gate(rootPub, envelope, { room?, requiredAud? })` → `{admit, reason}`
Also exposed as `window.TokenGate` in the browser.

### 5. Architecture
```
issuer: generateRootKey ─▶ root priv (sign) / root pub (relay holds)
issue:  issueToken(rootPriv, {room, exp, audience}) ─▶ token
admit:  client hello{token,room} ─▶ relay verifyToken(rootPub, token) ─▶ ADMIT / DENY
```
The token carries `room / exp / aud / jti`, signed by the root private key; the relay holds only the root public key and cannot forge.

### 6. Guarantees & threat model
- **Token authenticity**: without the root private key, no signature forgery; tampered/expired/wrong-room/wrong-audience tokens are all rejected.
- **Minimal trust**: the server validates only cryptography, holds no identity, never touches the document.
- Out of scope: root private-key compromise (should be in an HSM/key manager), compromised client.

### 7. Known limits
- Tokens are stateless (JWT-style); no revocation list. For instant revocation, the issuer maintains a nonce/denylist.
- Default `aud:'*'` does not restrict the signer; high-security setups should bind a specific public key.

### 8. Verification
See `TEST_REPORT.md`: `node --test` all green (7/7), covering valid, expired, wrong-room, forged, audience-limited, gate, and cross-root.

### 9. Measured performance
Issue/verify are sub-millisecond (native Web Crypto ECDSA P-256).

### 10. Dependencies
**A · Pure Zero**: 0 npm deps, 0 vendor, 0 external requests — only platform Web Crypto.

### 11. License
Consistent with repository LICENSE. This module is Aegis's own implementation.

### 12. Changelog
- v1.0.0 — ECDSA room tokens, verify/gate, audience restriction, standalone demo, and `TEST_REPORT.md`.
