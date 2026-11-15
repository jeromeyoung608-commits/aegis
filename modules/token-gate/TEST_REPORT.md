# token-gate — TEST REPORT

### 1. What is tested
Full token issue/verify path: valid admission, expiry, wrong room, forged signature, audience restriction, gate, and cross-root rejection.

### 2. Who runs this
Integrators before adoption: `node --test` (or `npm test`).

### 3. Run in 60 seconds
```bash
cd modules/token-gate && node --test
```

### 4. Test contract
| Case | Assertion |
|---|---|
| valid token verifies | `verifyToken` ok, room matches |
| expired token rejected | `reason:expired` |
| wrong-room token rejected | `reason:wrong-room` |
| forged (tampered) token rejected | `reason:bad-signature` |
| audience: correct admits / wrong denies | `audience-mismatch` |
| gate() admits good / denies bad envelope | admit boolean correct |
| cross-root signature fails | `bad-signature` |

### 5. Test architecture
`tests/token-gate.test.mjs`, `node:test` + `node:assert`, pure Web Crypto, no network, no IO.

### 6. Guarantees & coverage
- Covered: issue, verify, four rejection classes, audience, gate, cross-root.
- Not covered: concurrent issuance, token revocation, oversized payload.

### 7. Known gaps
- Stateless tokens have no instant-revocation test (design relies on an issuer denylist, not implemented here).

### 8. Verification status
```text
ℹ tests 7   ℹ pass 7   ℹ fail 0
```
**All passing.**

### 9. Performance of the suite
7 cases complete in ~130 ms (multiple key generations and issuances).

### 10. Dependencies
0 external dependencies; only `node:test`, `node:assert`, `globalThis.crypto`.

### 11. License
Consistent with repository LICENSE.

### 12. Changelog
- v1.0.0 — 7/7 cases pass, covering the full token-admission rejection path.
