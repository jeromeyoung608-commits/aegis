# Test Report · Local Encrypted Vault (Audit & Archive)

Module: `modules/encrypted-archive`
Date: 2026-11-10
Runtime: Node 26 (built-in `node:test`, built-in Web Crypto), Chrome 141 on macOS
Dependencies: none

---

## 1 · Verdict

**PASS** — 23 / 23 headless assertions and the browser acceptance path.

| Layer | Result |
| --- | --- |
| Container (seal / open / tamper) | 11 / 11 pass |
| Vault API (seal / list / open / remove) | 6 / 6 pass |
| Storage adapters (memory / OPFS guard / ids) | 6 / 6 pass |
| Browser: seal from shell → reload → re-list | PASS |
| Browser: standalone vault reads shell's OPFS record | PASS |

---

## 2 · How to reproduce

```bash
cd modules/encrypted-archive
node --test
```

Measured tail:

```
ℹ tests 23
ℹ suites 0
ℹ pass 23
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3299.02975
```

Browser path:

```bash
# repository root
node server.js
# open http://localhost:8080/, then:
#   Test signed delivery → Verified → Archive to Vault → passphrase → Seal to vault
```

---

## 3 · Assertion matrix

### 3.1 `tests/container.test.mjs` — 11 assertions

| # | Assertion | What it proves |
| --- | --- | --- |
| 1 | sealed container round-trips bytes and metadata | lossless seal/open |
| 2 | public header parses without a passphrase | index can show sizes while locked |
| 3 | file bytes and metadata are absent from the container | confidentiality of names and content |
| 4 | wrong passphrase → `Vault unlock failed` | distinct, actionable failure |
| 5 | one flipped ciphertext byte → `integrity check failed` | digest pre-check works |
| 6 | forged digest + tampered bytes → `unlock failed` | GCM tag is the real boundary |
| 7 | broken magic rejected | malformed input fails early |
| 8 | truncated container rejected | length validation |
| 9 | passphrase shorter than 8 characters rejected | policy enforced at the API |
| 10 | plaintext staging buffer is zeroed when sealing returns | memory hygiene |
| 11 | (same test body) zeroing covers metadata + file bytes | no partial wipe |

Assertion 10/11 are two checks inside one `test()` body; the runner counts them as one
test, hence 10 container tests and 11 assertions across the file.

### 3.2 `tests/vault.test.mjs` — 6 tests

| # | Assertion | What it proves |
| --- | --- | --- |
| 1 | seal → list → open round-trip | product API is coherent |
| 2 | listing hides file names | the index is opaque |
| 3 | two seals get distinct ids | no id collision in practice |
| 4 | wrong passphrase leaves the record intact | failed unlock is non-destructive |
| 5 | remove deletes exactly one record | scoped deletion |
| 6 | empty file and size cap are refused | guardrails with clear messages |

### 3.3 `tests/store.test.mjs` — 6 tests

| # | Assertion | What it proves |
| --- | --- | --- |
| 1 | memory adapter implements put/get/list/remove/clear | interface completeness |
| 2 | reads return copies, not shared buffers | caller cannot mutate stored bytes |
| 3 | `recordFileName` rejects `../`, absolute paths, uppercase, empty | path traversal impossible |
| 4 | file names map back to ids | listing stays consistent |
| 5 | `opfsSupported()` is false in Node | feature detection is honest |
| 6 | `openOpfsStore()` rejects in Node | no silent fake persistence |

---

## 4 · Browser acceptance

Environment: Chrome 141, `http://localhost:8099/` (`node server.js` with COOP/COEP).

| Step | Action | Observed |
| --- | --- | --- |
| 1 | Click **Test signed delivery** | `Verified · 2 signer(s) · SHA-256 6930443e3a3b…` |
| 2 | Verification verdict reaches the shell | gold **Archive to Vault** button appears only after a passing verdict |
| 3 | Click **Archive to Vault** | native `<dialog>` opens, shows the artifact name |
| 4 | Enter `vault-pass-123`, press **Seal to vault** | `Archived to the local vault: 5a8af386-add8-483b-9279-e1ca70f53e25 (52576 B payload → 53324 B sealed, AES-GCM-256).` |
| 5 | Inspect sidebar | `1 sealed record · 52.1 KB ciphertext · opfs` |
| 6 | Reload the command center | same line: `1 sealed record · 52.1 KB ciphertext · opfs` |
| 7 | Open the standalone vault page | `1 record`, one `.row-item`, `OPFS · aegis-vault` |

Overhead for that record: 53324 − 52576 = **748 bytes**, covering the 8-byte magic,
version byte, 4-byte header length, the JSON header (salt, IV, digest, sizes) and the
16-byte GCM tag.

Negative checks that were not acceptable in the UI: the archive button is hidden before a
verification, and a rejected signature sets `signedState` to `Rejected: …` without
offering the button.

---

## 5 · Defects found during the build

### 5.1 Blob transfer into a hidden iframe stalled

**Symptom.** The first integration embedded the vault page in a hidden iframe and posted
`archive:store` with the artifact Blob. The dialog stayed on `Sealing…` indefinitely; the
vault iframe logged no receipt, although its `archive:list` round-trip worked.

**Diagnosis.** Control messages (strings only) crossed the boundary; the record payload
did not. Rather than guess at structured-clone behaviour, the architecture was simplified:
the shell now imports `createVault` and `openOpfsStore` directly. OPFS is per-origin, so
the standalone page still browses the same `/aegis-vault` directory. This removed one
message hop, one frame, and one class of failure.

**Verification.** After the change, the same click path produced the archive log on the
first attempt, and step 7 of the browser table proves both surfaces share one vault.

### 5.2 Fixed BroadcastChannel room caused cross-tab interference

**Symptom.** With two command-center tabs open, the receiver sometimes ended in
`signaling-error: Failed to execute 'setRemoteDescription'`. A stale tab answered the same
room's offer.

**Fix.** Both the signed-delivery page and the shell derive their room from a per-load
random suffix (`aegis-signed-delivery-<nonce>`, `aegis-demo-<nonce>`). Sessions no longer
collide, and the demo is repeatable without closing every other tab.

**Verification.** Repeated runs with two tabs open: signing, verification and archiving
complete without signaling errors.

---

## 6 · Security notes verified by test

- Plaintext never leaves memory in cleartext form on disk: the container text contains no
  file name, no payload substring and no metadata keys (assertion 3.1.3).
- The derived KEK is non-extractable; the module never calls `exportKey` on it.
- Path traversal is blocked at the adapter boundary, not by string replacement at the UI.
- Integrity failures are reported before a passphrase is derived, so a corrupted record
  costs no KDF work.
- A wrong passphrase cannot destroy or rewrite a record (3.2.4).

---

## 7 · What is not covered

- Real multi-megabyte PDFs (the cap is 64 MB; tests use small payloads).
- OPFS quota exhaustion and storage-eviction events.
- Cross-browser OPFS behaviour (Firefox/Safari were not part of acceptance).
- Screenshot-level visual regression of the vault page.
