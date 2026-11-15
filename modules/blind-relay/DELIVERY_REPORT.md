# blind-relay — DELIVERY REPORT (MDS-1)

> Machine-checkable delivery contract. Mirrors the 12 chapters of the README.

### 1. What it solves
Cross-device sync needs a relay, but clients fear the server captures data. This zero-dependency relay performs the WS handshake and forwards **encrypted envelopes** by room — it never decrypts and never sees the canvas/document.

### 2. Who buys this
B2B cross-device collaboration with a server-blind requirement: regulated industries, cross-institution co-signing.

### 3. Run in 60 seconds
```bash
cd modules/blind-relay && node --test        # 5/5 green
node src/relay.js --port 8081                 # start the blind relay
python3 -m http.server 8080                   # open index.html (shows server only sees ciphertext)
```

### 4. Integration contract
Server `createRelay({verifyToken, onObserve})` → `{listen, address, getObserved, close}`. Client `connectRelay(url,{token,room,onMessage})` + `encryptEnvelope/decryptEnvelope`. Also `window.BlindRelayClient`.

### 5. Architecture
client A → E2E envelope → relay (forwards ciphertext only, logs what it sees) → client B. Admission via `verifyToken`; blind proof via `getObserved()`.

### 6. Guarantees & threat model
Server blind (no symmetric key, forwards ciphertext only), token admission, no echo to sender. Out of scope: compromised client, network sniffing (use WSS), root-key compromise.

### 7. Known limits
Serial in-flight frame processing; stateless (rooms dissolve with connections); single-process (shard for horizontal scale).

### 8. Verification
`node --test` → **5 / 5 pass, 0 fail** (`tests/relay.test.mjs`), including the auditable server-blind proof.

### 9. Measured performance
End-to-end ms-scale; suite ~1.1 s (real WS round trips).

### 10. Dependencies
**A · Pure Zero**: server uses only Node built-ins `node:http`/`node:crypto`; client only Web Crypto + browser `WebSocket`.

### 11. License
Repository LICENSE. Aegis's own implementation.

### 12. Changelog
- 2026-11-11 — delivered; 5/5 assertions green; standalone index.html; MDS-1 contract.
