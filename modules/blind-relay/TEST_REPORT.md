# blind-relay — TEST REPORT

### 1. What is tested
The zero-knowledge relay's behavioral contract: token admission, end-to-end ciphertext routing, server-blind proof, no-echo to sender, and cross-room isolation.

### 2. Who runs this
Integrators / security audit: `node --test` (or `npm test`).

### 3. Run in 60 seconds
```bash
cd modules/blind-relay && node --test
```

### 4. Test contract
| Case | Assertion |
|---|---|
| admitted token + ciphertext routing + blind | B receives A's ciphertext and decrypts; `getObserved()` contains no plaintext `SECRET`/`coordinates` |
| no/bad token rejected | `connectAuth` rejects, `reason:admission denied` |
| wrong-room token rejected | same |
| no echo to sender | sender `aGot.length === 0` |
| cross-room isolation | R2's `r2Got.length === 0` |

### 5. Test architecture
`tests/relay.test.mjs` uses a real WebSocket: starts `createRelay` → two token-holding clients via `ws-lite.connectWs` → end-to-end AES-GCM encrypt/decrypt. `verifyToken` injects token-gate's real verification. Each test closes the relay in `finally` to avoid lingering handles.

### 6. Guarantees & coverage
- Covered: admission (valid/bad/wrong-room), blind proof, no-echo, cross-room isolation.
- Not covered: WS frame fragmentation limits, huge concurrent connections, WSS (TLS) front.

### 7. Known gaps
- Single-connection serial frame processing (noted under Known limits in README).
- No formal proof that a compromised relay still can't read data (relies on E2E encryption; keys never leave the client).

### 8. Verification status
```text
ℹ tests 5   ℹ pass 5   ℹ fail 0
```
**All passing.**

### 9. Performance of the suite
5 cases complete in ~1106 ms (real TCP/WS handshake + multiple round trips).

### 10. Dependencies
0 external dependencies in tests; only `node:test`, `node:assert`, `node:http`, `node:crypto`, `globalThis.crypto`.

### 11. License
Consistent with repository LICENSE.

### 12. Changelog
- v1.0.0 — 5/5 cases pass, including the auditable "server-blind" proof.

---

**Release**: Aegis v1.0.0
**Report date**: 2026-11-16
**Runtime measured**: Node v22.23.2 on macOS (Apple silicon); browser: Chromium/Chrome 113+ for the demo pages
**Standalone demo**: `modules/blind-relay/index.html` (open it through the repository `server.js`, or run `npm start` in this module)

