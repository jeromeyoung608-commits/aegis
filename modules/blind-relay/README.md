# blind-relay — Server-Blind Ciphertext Relay

> **Terminology**: "blind" describes transport blindness (the relay forwards
> ciphertext it cannot read), not a blind-signature scheme and not a
> zero-knowledge proof. See `docs/CLAIMS-WORDING.md`.

> Server-blind WebSocket relay for cross-device sync. The server routes encrypted packets and never sees the canvas state.

---

### 1. What it solves
Multi-device sync needs a relay, but many clients fear WebSockets because they worry the server will capture data. This module is a **zero-dependency** relay: it only performs the WebSocket handshake and forwards **encrypted envelopes** by room — it never decrypts and never sees the canvas state or document content. Paired with token-gate for admission and blind-relay/client for end-to-end envelope crypto.

### 2. Who buys this
B2B needing cross-device collaboration with a "server-blind" requirement: regulated industries, cross-institution co-signing, any "relay cannot be trusted" compliance scenario.

### 3. Run in 60 seconds
```bash
cd modules/blind-relay
node --test                                   # 5 assertions, all green
node src/relay.js --port 8081                 # start the zero-dependency blind relay
# browser demo (shows the server only sees ciphertext): python3 -m http.server 8080
```
Optional token-gated admission:
```bash
AEGIS_ROOT_PUB=<base64url-SPKI> node src/relay.js --port 8081
```

### 4. Integration contract
- **Server (Node)**: `createRelay({ verifyToken, onObserve })` → `{ listen(port?), address(), getObserved(), close() }`. Inject `verifyToken(token, room)` (default: open; recommend injecting token-gate's `verifyToken`).
- **Client (browser/Node)**: `src/ws-lite.js` `connectWs(url, handlers)` (test/tooling); `src/client.js` `connectRelay(url,{token,room,onMessage})` + `encryptEnvelope/decryptEnvelope` (browser; also `window.BlindRelayClient`).

### 5. Architecture
```
client A ──E2E-encrypted envelope──▶ relay (forwards ciphertext only, logs what it sees) ──▶ client B
                                     │
                                     ├─ admission: verifyToken(token,room)
                                     └─ blind proof: getObserved() holds only ciphertext
```
The relay is "blind": on receiving a `data` envelope it forwards it verbatim to other same-room peers, never parsing or decrypting. Room state lives only in active sockets.

### 6. Guarantees & threat model
- **Server blind**: the relay holds no symmetric key; it forwards only client-encrypted envelopes; `getObserved()` is auditable proof it only ever saw ciphertext.
- **Admission**: when `verifyToken` is injected, no/malformed/expired tokens are rejected at the hello stage (close + disconnect).
- **No echo**: messages go only to other same-room peers, never back to the sender.
- Out of scope: compromised client, network-layer sniffing (clients should use HTTPS/WSS), root private-key compromise.

### 7. Known limits
- In-flight frames on a single connection are processed serially (hello must arrive before welcome, then data); extreme high-volume tiny-frame throughput is not stress-tested.
- The relay is stateless: rooms dissolve with connections, no database.
- This is a single-process relay; horizontal scale needs room→relay sharding in front.

### 8. Verification
See `TEST_REPORT.md`: `node --test` all green (5/5), covering admission, ciphertext routing, blind proof, no-echo, and cross-room isolation.

### 9. Measured performance
End-to-end handshake + forward is milliseconds; the suite of 5 cases runs in ~1.1 s (multiple real WebSocket round trips).

### 10. Dependencies
**A · Pure Zero**: server uses only Node built-ins `node:http` / `node:crypto`; client uses only platform Web Crypto and the browser `WebSocket`. 0 npm deps, 0 vendor.

### 11. License
Consistent with repository LICENSE. This module is Aegis's own implementation.

### 12. Changelog
- v1.0.0 — zero-dependency WS relay, token admission, blind-visible log, browser demo, and `TEST_REPORT.md`.

## Measurement provenance

Any timing, throughput or count in this README was measured on **Apple silicon (macOS, 2026-11-16)** with **Node v22.23.2** and **Chromium 113+**, on the checked-in v1.0.0 tree. Numbers are indicative for that machine, not a service-level commitment.
