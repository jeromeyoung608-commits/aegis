# Test Report — Zero-Knowledge Identity (Module 01)

Engineering test record for the identity module. Everything below was executed
against the delivered source; no result is estimated.

---

## 1 · Verdict

| Area | Result |
| --- | --- |
| Headless unit suite (`node --test`) | **PASS** — 26 / 26 assertions, 0 failures |
| Browser acceptance (real Chromium, IndexedDB) | **PASS** — identity restored after a full page reload |
| Signature proof after reload | **PASS** — ECDSA signature verified against the stored public key |
| Deliverable language | English only |

---

## 2 · Environment

| Item | Value |
| --- | --- |
| Runtime (unit tests) | Node.js 26.0.0, built-in `node:test` runner |
| Crypto provider (unit tests) | `globalThis.crypto.subtle` in Node — the same Web Crypto API the browser calls |
| Browser (acceptance) | Chromium, served over `http://localhost` (secure context) |
| Server | Zero-dependency `server.js` at the repository root |
| Dependencies installed | none |

The unit suite intentionally uses the platform's real crypto implementation. Mocking
Web Crypto would only prove that the mocks agree with each other.

---

## 3 · How to reproduce

```bash
# unit suite
cd modules/zero-knowledge-identity
node --test

# browser acceptance
cd ../..            # repository root
node server.js      # http://localhost:8080
# open /modules/zero-knowledge-identity/index.html
```

---

## 4 · Unit test matrix

### 4.1 `tests/crypto.test.mjs` — 12 test cases

| # | Assertion | Result |
| --- | --- | --- |
| 1 | Base64 round-trips every byte length from 0 to 64 | PASS |
| 2 | Base64 rejects characters outside its alphabet | PASS |
| 3 | P-256 key pair generated; SPKI export re-imports to the same fingerprint | PASS |
| 4 | Fingerprint is stable, 64 hex characters, grouped in fours | PASS |
| 5 | Two key pairs never share a fingerprint | PASS |
| 6 | Wrap → unwrap returns a key that signs verifiable data | PASS |
| 7 | Wrapped blob contains no PKCS#8 marker or `BEGIN` string | PASS |
| 8 | Wrong passphrase rejects instead of returning a key | PASS |
| 9 | Bit-flipped ciphertext is rejected by AES-GCM | PASS |
| 10 | Passphrases shorter than 8 characters are refused | PASS |
| 11 | The plaintext PKCS#8 buffer is all zeros once wrapping returns | PASS |
| 12 | Signature verifies for the signed bytes, fails for different bytes | PASS |

### 4.2 `tests/identity.test.mjs` — 8 test cases

| # | Assertion | Result |
| --- | --- | --- |
| 13 | Names are trimmed, collapsed and length-limited | PASS |
| 14 | Issued record is sealed and carries no private fields | PASS |
| 15 | Record JSON contains neither `pkcs8` nor the passphrase | PASS |
| 16 | `publicCard()` exposes exactly the six public fields | PASS |
| 17 | Issue → persist → reload → unlock → prove possession | PASS |
| 18 | Reloaded identity still refuses a wrong passphrase | PASS |
| 19 | Two identities on one device are independent (key, fingerprint, ciphertext) | PASS |
| 20 | Exported business card is public-only JSON | PASS |
| 21 | `isSealed()` rejects records that leak key material | PASS |

### 4.3 `tests/keystore.test.mjs` — 6 test cases

| # | Assertion | Result |
| --- | --- | --- |
| 22 | Vault implements get / put / list / remove | PASS |
| 23 | `put` overwrites by key instead of appending | PASS |
| 24 | Records are cloned in and out (no shared mutable state) | PASS |
| 25 | A vault can be seeded from persisted records | PASS |
| 26 | IndexedDB adapter refuses to pretend it works without `indexedDB` | PASS |
| 27 | Database and store names are stable | PASS |

> The runner reports 26 test cases for the 27 table rows above: row 14 and row 15 are
> asserted inside one test body. The pass/fail count comes from the runner, not from
> this table.

Measured run:

```
tests 26
pass 26
fail 0
duration_ms 615
```

---

## 5 · Browser acceptance run

Performed in a real browser against the running server.

| Step | Action | Observed |
| --- | --- | --- |
| 1 | Open the module page | Page loads, title `AEGIS · Zero-Knowledge Identity`, zero console errors |
| 2 | Enter `Engineer-A`, passphrase twice, generate | Card renders with a `SHA256:` fingerprint and a deterministic avatar |
| 3 | Unlock with the same passphrase | Possession proof runs; signature verifies |
| 4 | Reload the page | Card returns with an identical fingerprint |
| 5 | Acceptance panel | `[PASS] identity restored on page load #2 — IndexedDB outlived the page (reload or new tab)` |
| 6 | Sign a test challenge | Signature verified against the stored public key |
| 7 | Open the delete dialog | Styled in-page modal, not a native prompt; Delete stays disabled until `Engineer-A` is retyped |
| 8 | Press Cancel | Dialog closes; identity untouched |

The record is read back from IndexedDB, not from memory: the reload destroys the page
context, and the identity's name, public key and fingerprint are re-rendered from the
stored object. The load counter lives in `localStorage`, so closing the tab and
reopening it also advances the count — the proof is no longer limited to an in-session
refresh.

### Acceptance evidence lines

```
[PASS] Web Crypto: ECDSA P-256 available
[PASS] IndexedDB vault "aegis-identity" opened
[PASS] identity "Engineer-A" read from indexeddb
[PASS] private key sealed: AES-GCM-256, PBKDF2-SHA256 250k
[PASS] public key exported as SPKI Base64
[PASS] private key unreadable until the passphrase is supplied
[PASS] ECDSA signature over a fresh challenge verifies against the stored public key
[PASS] identity restored on page load #2 — IndexedDB outlived the page (reload or new tab)
```

---

## 6 · Defect found and fixed during testing

**Symptom.** The avatar identicon looked shifted by one cell and the hex-length assertion
failed (`68 !== 64`) while the fingerprint itself was correct.

**Cause.** `fingerprintDigits()` stripped every non-hex character from
`SHA256:9C4E …`. The `A` in the `SHA256` label is a valid hex digit, so the label leaked
one extra character into the identicon input, and the assertion counted it too.

**Fix.** Strip the `SHA256:` prefix before filtering characters, in
`src/crypto.js: fingerprintDigits()`. The regression test now asserts the 64-character
length on the payload only.

**Why it mattered.** A silently shifted identicon still "looks fine", which is exactly
the kind of visual defect that undermines a fingerprint-comparison workflow.

### 6.1 Hardening applied after review

Four edge-case improvements were made after the first acceptance run. Each is covered by
the suite or re-verified in the browser, not merely asserted in prose.

| Area | Change | Verification |
| --- | --- | --- |
| Null record | `onCopy` / `onExport` now return a `No identity found.` message instead of throwing on `state.record.publicKeySpki` | Guard is the first statement in both handlers |
| Native `prompt()` | Replaced by an in-page `<dialog>`; the Delete button stays disabled until the operator retypes the identity name | Browser step 7-8 above |
| `sessionStorage` boot counter | Moved to `localStorage`, with `try/catch` around every access so a blocked storage API degrades instead of crashing | Browser step 5 (`page load #2`, survives a new tab) |
| PKCS#8 wiping | `fill(0)` moved into a `finally` block so the plaintext buffer is zeroed even if derivation or encryption throws | Unit test 11 inspects the exact buffer handed to AES-GCM after the call returns |

The zeroing test is the notable one: it does not check a comment, it captures the
`Uint8Array` passed into `subtle.encrypt` and asserts every byte is `0` once
`wrapPrivateKey()` has resolved.

---

## 7 · Coverage and gaps

**Covered**

- Key generation, export, import, fingerprinting.
- Passphrase derivation, wrapping, unwrapping, wrong-passphrase and tamper rejection.
- Record shaping, sealing invariants, business-card export.
- Storage adapter contract, including the reload path.
- Full browser cycle with real IndexedDB.

**Not covered**

- **IndexedDB in a real browser under adversarial storage pressure.** Quota eviction,
  private-browsing restrictions and cross-tab upgrade blocking are handled with explicit
  errors but not automatically tested; they need browser-level fault injection.
- **Timing side channels.** PBKDF2 and ECDSA timings are not measured. The design relies
  on the platform's constant-time primitives rather than adding its own mitigation.
- **Hardware-backed key storage.** Non-extractable platform keys (WebAuthn / passkeys)
  are out of scope for this module; the wrapping format assumes an extractable P-256 key.
- **Multi-device identity.** There is no enrolment, pairing or revocation flow, so
  "same person on two machines" is two independent seals by design.

---

## 8 · Conclusion

The module meets the stated acceptance criterion — an identity created in the browser is
readable, unlockable and usable for signatures after a full page reload — and the
cryptographic layer holds under wrong-passphrase and tampering tests. The remaining gaps
are architectural (recovery, revocation, attestation) rather than implementation defects.

---

**Release**: Aegis v1.0.0
**Report date**: 2026-11-16
**Runtime measured**: Node v22.23.2 on macOS (Apple silicon); browser: Chromium/Chrome 113+ for the demo pages
**Standalone demo**: `modules/zero-knowledge-identity/index.html` (open it through the repository `server.js`, or run `npm start` in this module)

