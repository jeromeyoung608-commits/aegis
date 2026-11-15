# detached-hash-signer — TEST REPORT

> Machine-checkable form, mirroring the 12-chapter structure of the README.

### 1. What is tested
Core detached hash signing: hash stability, single-sign verify, tamper rejection, three-party detached signing, missing-signature failure, detached property, and malformed input rejection.

### 2. Who runs this
Integrators before adoption: `node --test` (or `npm test`).

### 3. Run in 60 seconds
```bash
cd modules/detached-hash-signer && node --test
```

### 4. Test contract
| Case | Assertion |
|---|---|
| sha256Hex stable and 64 chars | same input → same hash, matches `^[0-9a-f]{64}$` |
| one-byte change → totally different hash | `hello` vs `hellp` differ |
| single signer signs hash and verifies | `verifySignature` returns true |
| tampered signature fails verification | flipping first signature char → false |
| three-party blind sign all valid | 3 signatures ok, bundle `ok:true` |
| missing/wrong signature fails | wrong signature over different hash → `ok:false`, `reason:signature-mismatch` |
| bundle is detached (blind) | `isDetached` true, bundle contains no document keyword |
| malformed input rejected | non-JSON / missing signers → `ok:false` |

### 5. Test architecture
`tests/detached-hash-signer.test.mjs` uses `node:test` + `node:assert`, pure platform Web Crypto, no mocks, no network, no file IO.

### 6. Guarantees & coverage
- Covered: sign/verify, tamper, multi-party, detached property, error paths.
- Not covered: cross-module assembly (covered by blind-relay/detached integration), performance stress.

### 7. Known gaps
- No stress test on very large documents (>MB); Web Crypto handles normal documents without pressure.
- No chained (ordered) co-signing semantics (current is independent multi-sign, not chained).

### 8. Verification status
```text
ℹ tests 8   ℹ pass 8   ℹ fail 0
```
**All passing.**

### 9. Performance of the suite
8 cases complete in ~23 ms (Node 26, including key generation and multi-sign).

### 10. Dependencies
0 external dependencies; only `node:test`, `node:assert`, `globalThis.crypto`.

### 11. License
Consistent with repository LICENSE.

### 12. Changelog
- v1.0.0 — 8/8 cases pass, covering the full detached-sign path and the detached-property proof.
