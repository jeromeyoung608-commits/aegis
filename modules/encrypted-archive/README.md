# encrypted-archive — Local Zero-Knowledge Vault

## 1. What it solves
Signed artifacts and secrets must be sealed so that even a local dump reveals nothing. encrypted-archive is a local, zero-knowledge vault: files are encrypted before they touch disk (OPFS/IndexedDB) and the encryption keys never persist in plaintext.

## 2. Who buys this
Any workflow that needs to store signed artifacts, keys, or intermediate state locally without leaking plaintext on disk.

## 3. Run in 60 seconds
```bash
cd modules/encrypted-archive
node --test                 # suite green
python3 -m http.server 8080 # open index.html (browser vault)
```

## 4. Integration contract
`createVault`, `openOpfsStore`, and sealing/verification helpers are importable. The shell calls `createVault` after a verified artifact is produced.

## 5. Architecture
plaintext → AES-GCM seal with a passphrase-derived key → ciphertext only on OPFS/IndexedDB. The public card exposes nothing that could decrypt the vault.

## 6. Guarantees & threat model
No plaintext key material at rest; `isSealed` rejects records that leak key material. Out of scope: passphrase weakness, host OS compromise.

## 7. Known limits
Browser-only persistence (OPFS/IndexedDB); a missing browser environment is rejected loudly rather than faked.

## 8. Verification
`node --test` → suite green (vault get/put/list/remove, overwrite, clone isolation, OPFS refusal without browser).

## 9. Measured performance
Vault ops are sub-millisecond in node; browser OPFS bound by device storage.

## 10. Dependencies
**A · Pure Zero**: 0 npm deps, 0 vendor, 0 external requests (platform crypto + storage).

## 11. License
Repository LICENSE.

## 12. Changelog
- 2026-11-11 — README delivered (English); MDS-1 contract.
