# e2e-signed-delivery — TEST REPORT

> Machine-checkable form mirroring the 12-chapter README.

### 1. What is tested
End-to-end artifact assembly and verification: document packaging, multi-signer trailer, hash-chain integrity, signature verification, tamper detection, and the parse/verify round trip.

### 2. Who runs this
Integrators / security audit: `node --test` (or `npm test`).

### 3. Run in 60 seconds
```bash
cd modules/e2e-signed-delivery && node --test
```

### 4. Test contract
| Case | Assertion |
|---|---|
| assemble + verify round trip | produced artifact verifies `ok:true` |
| multi-signer trailer | all `trailer.signers` validate |
| hash-chain integrity | tampering with any link fails verify |
| tampered signature | `ok:false`, reason set |
| parse / verify separation | `parseArtifact` returns docBytes + trailer |

### 5. Test architecture
`tests/*.test.mjs` using `node:test` + `node:assert`, pure Web Crypto, no network. The heavy browser/Playwright flow is skipped in CI (no browser), so the suite stays deterministic and fast.

### 6. Guarantees & coverage
- Covered: assemble, verify, chain integrity, tamper, multi-signer.
- Not covered here: the visual browser flow (skipped without a browser), large-file stress.

### 7. Known gaps
- Playwright-driven UI flow is gated behind a browser availability check and skipped otherwise.

### 8. Verification status
```text
ℹ tests 14   ℹ pass 14   ℹ fail 0
```
**All passing.**

### 9. Performance of the suite
~683 ms (Node 26), deterministic.

### 10. Dependencies
0 external test dependencies; `node:test`, `node:assert`, `globalThis.crypto`. First-party code is **A · Pure Zero** (vendored pdf-lib via import map only).

### 11. License
Repository LICENSE. Vendored pdf-lib keeps its own MIT license.

### 12. Changelog
- 2026-11-11 — verified 14/14 green; TEST_REPORT delivered.
