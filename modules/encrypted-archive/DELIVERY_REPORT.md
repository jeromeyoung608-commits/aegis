# Delivery Report · Local Encrypted Vault (Audit & Archive)

> **Local Encrypted Vault: Zero-cloud archiving of signed documents.**

Module: `modules/encrypted-archive`
Delivered: 2026-11-10
Status: complete, verified in Node and Chrome

---

## 1 · What was asked

| Requirement | Delivered |
| --- | --- |
| OPFS folder inside the main shell (`aegis-shell`) | Shell opens `/aegis-vault` via `openOpfsStore()` and seals into it directly |
| After P2P signature verification, allow download **and** archive | `signed:verified` gates a gold **Archive to Vault** button; the download button remains |
| Encrypt the file **and** signature metadata | One AES-GCM payload frames `metadata JSON + file bytes` |
| Reuse the Web Crypto approach from module 01 | PBKDF2-SHA-256 (250,000) → non-extractable AES-GCM-256 KEK |
| Positioning | Tagline and README/UI copy: *"Local Encrypted Vault: Zero-cloud archiving of signed documents."* |
| New module under `modules/` | `modules/encrypted-archive/` with source, tests, README, TEST_REPORT, package.json |
| English-only documentation | All new documents, comments and UI strings are English |
| No personal path leakage | No absolute home-directory paths in any module document |
| License with rights and obligations | Root `LICENSE` covers this module; README §10 links to it |
| Three watermark layers | Source headers, styled console signature, fixed UI footer |

---

## 2 · Deliverables

| File | Purpose |
| --- | --- |
| `index.html` | Standalone vault: seal, list, unlock, download, delete |
| `src/crypto.js` | PBKDF2, AES-GCM, SHA-256, portable Base64/hex |
| `src/container.js` | `.aegis` binary format: `sealContainer`, `openContainer`, `parseContainer`, `verifyDigest` |
| `src/store.js` | OPFS adapter, in-memory adapter, id validation |
| `src/vault.js` | Product API: `seal`, `open`, `list`, `remove`, `stats`; 64 MB guard |
| `src/main.js` | File intake, metadata JSON, unlock panel, download, debug surface |
| `src/style.css` | Dark + gold visual language shared with the command center |
| `tests/container.test.mjs` | 10 tests / 11 assertions |
| `tests/vault.test.mjs` | 6 tests |
| `tests/store.test.mjs` | 6 tests |
| `package.json` | `npm test` → `node --test`, zero dependencies |
| `README.md` | Format, parameters, integration, limitations |
| `TEST_REPORT.md` | Measured output, matrix, browser acceptance, defects |

Modified outside the module:

| File | Change |
| --- | --- |
| `aegis-shell/index.html` | Stepper gains step 5; vault card; archive button; passphrase `<dialog>` |
| `aegis-shell/src/app.js` | Per-load room id; direct vault import; verified-artifact gate; archive flow |
| `aegis-shell/src/style.css` | Gold button, vault card, dialog and backdrop styles |
| `modules/e2e-signed-delivery/src/main.js` | Emits `signed:verified`; accepts `signed:run-demo` from the shell |
| `modules/e2e-signed-delivery/src/sdk/pdf.js` | Verification result now includes the recomputed SHA-256 |
| `modules/e2e-signed-delivery/src/sdk/transport.js` | Per-load signaling room |
| `README.md`, `DELIVERY_REPORT.md` | Module 02 sections |

---

## 3 · Architecture decisions

**Seal in the shell, browse in the module.** OPFS is scoped to the origin, not to a frame
or a module. The first attempt passed the artifact Blob to a hidden vault iframe over
`postMessage`; control messages arrived but the payload did not, and the dialog hung on
`Sealing…`. The shell now imports `createVault` and `openOpfsStore` directly. This removes
a frame, a message hop and an entire class of failure, while the standalone page still
browses the same `/aegis-vault` folder.

**One container, no sidecar index.** A separate `index.json` would leak file names even
when locked. Instead, each `<uuid>.aegis` file is self-contained; the listing shows only
ids and ciphertext sizes. Names, hashes, signer ids and the verification reason appear
after a successful decrypt.

**Two distinct failure messages.** `integrity check failed` is reachable without a
passphrase (digest mismatch), `unlock failed` requires a GCM tag mismatch. An operator can
tell storage corruption from a wrong passphrase before spending 250,000 PBKDF2 iterations.

**Zero the staging buffer on every path.** `sealContainer` wraps the plaintext payload in
`try/finally` and calls `payload.fill(0)`, including when KDF or `encrypt()` throws. A test
monkeypatches `crypto.subtle.encrypt` to capture the buffer and assert every byte is zero
after sealing returns.

**Per-load signaling rooms.** A fixed BroadcastChannel room let a stale tab answer another
tab's WebRTC offer (`setRemoteDescription` errors). Both demo flows now use a random suffix
generated once per page load.

---

## 4 · Verification

- Headless: `node --test` → **23 / 23 pass**, 0 fail, ~3.3 s.
- Browser: **Test signed delivery → Verified (2 signers) → Archive to Vault → Seal to
  vault** produced a 53,324-byte container for a 52,576-byte artifact; the sidebar showed
  `1 sealed record · 52.1 KB ciphertext · opfs` before and after a reload.
- Cross-surface: the standalone vault page reported `1 record` and one row for the record
  the shell had written, proving the shared OPFS directory.
- Coverage of negative paths: wrong passphrase, tampered ciphertext, forged digest, broken
  magic, truncated container, short passphrase, empty file, size cap, traversal ids.

Full evidence: `TEST_REPORT.md` §3–§5.

---

## 5 · Known limitations

1. **64 MB per record** — sealing is in memory; a chunked/streaming container is the next
   step for large scans.
2. **No recovery** — losing the passphrase loses the record; there is no escrow key.
3. **No key rotation or re-wrap** — re-sealing produces a new id and leaves the old file
   for explicit deletion.
4. **OPFS eviction** — clearing site data or storage pressure removes the vault. The
   counter is persistent across reloads and tabs, but it is not a backup.
5. **Browser support** — Chrome/Edge 113+; other browsers fall back to a clearly labelled
   volatile memory vault so the container logic remains demonstrable.

---

## 6 · License and attribution

**Open source, Apache-2.0** — see `LICENSE`.

Attribution layers present:

1. Header comment in every source file (`Jerome Young`, Apache-2.0).
2. Styled console signature on page load.
3. `ENGINE BY YANG JIE (JEROME YOUNG)` fixed in the footer.

Contact: **jeromeyoung608@gmail.com**
