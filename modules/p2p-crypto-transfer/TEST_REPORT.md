# p2p-crypto-transfer — TEST REPORT

> Machine-checkable form mirroring the 12-chapter README.

### 1. What is tested
Peer-to-peer encrypted file transfer: key exchange / derivation, envelope encrypt/decrypt, integrity, wrong-key rejection, and the full WebRTC handshake/transfer simulation.

### 2. Who runs this
Integrators / security audit: `node --test` (or `npm test`).

### 3. Run in 60 seconds
```bash
cd modules/p2p-crypto-transfer && node --test
```

### 4. Test contract
| Case | Assertion |
|---|---|
| envelope encrypt → decrypt round trip | plaintext recovered |
| wrong key fails to decrypt | verification error |
| integrity tag rejects tampering | AES-GCM detects |
| key derivation deterministic | same inputs → same key |
| full transfer simulation | file arrives intact |

### 5. Test architecture
`tests/*.test.mjs`, `node:test` + `node:assert`, pure Web Crypto, no network. The browser/WebRTC UI flow is skipped without a browser.

### 6. Guarantees & coverage
- Covered: envelope crypto, integrity, key derivation, simulated transfer.
- Not covered: live WebRTC peer connection (skipped without a browser).

### 7. Known gaps
- Live WebRTC path is exercised only in a browser; the node suite simulates the crypto/transport contract.

### 8. Verification status
```text
ℹ tests 11   ℹ pass 11   ℹ fail 0
```
**All passing.** (Note: an earlier delivery report stated 10/10; the measured count is 11/11 — corrected here.)

### 9. Performance of the suite
~1040 ms (Node 26), deterministic.

### 10. Dependencies
0 external test dependencies. First-party code is **A · Pure Zero** (vendored lib via import map only).

### 11. License
Repository LICENSE.

### 12. Changelog
- 2026-11-11 — verified 11/11 green; TEST_REPORT delivered; corrected count (was 10).

---

**Release**: Aegis v1.0.0
**Report date**: 2026-11-16
**Runtime measured**: Node v22.23.2 on macOS (Apple silicon); browser: Chromium/Chrome 113+ for the demo pages
**Standalone demo**: `modules/p2p-crypto-transfer/index.html` (open it through the repository `server.js`, or run `npm start` in this module)

