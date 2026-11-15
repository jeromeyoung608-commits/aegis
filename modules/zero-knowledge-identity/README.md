# zero-knowledge-identity — Locally Self-Custodied Key Primitives

> **Terminology**: the directory name is historical. This module wraps keys locally
> with PBKDF2 + AES-GCM; it performs **no zero-knowledge proof** and implements no
> server protocol. Say "locally self-custodied keys". See `docs/CLAIMS-WORDING.md`.

## 1. What it solves
Signing and verification need keys that never sit in plaintext and identities that survive reload without leaking. zero-knowledge-identity wraps passphrase-protected keys, stable public fingerprints, and sealed (public-only) records.

## 2. Who buys this
Any module that needs non-extractable key material, a human-checkable fingerprint, and a safe-to-share public identity card.

## 3. Run in 60 seconds
```bash
cd modules/zero-knowledge-identity
node --test                 # suite green
python3 -m http.server 8080 # open index.html (browser identity UI)
```

## 4. Integration contract
Key generation, passphrase wrapping/unwrapping, fingerprint, and sealed-record construction are importable. e2e-signed-delivery consumes the crypto layer.

## 5. Architecture
private key → AES-GCM wrap with passphrase → blob (no plaintext PKCS#8) → fingerprint from public key → sealed public card. Reload re-derives the key from the passphrase.

## 6. Guarantees & threat model
Plaintext PKCS#8 is wiped before wrapping resolves; wrong passphrase fails loudly; sealed records reject any key material leak. Out of scope: passphrase weakness.

## 7. Known limits
Security rests on passphrase strength and a non-compromised host.

## 8. Verification
`node --test` → suite green (wrap/unwrap, fingerprint stability, reload, leak detection).

## 9. Measured performance
Wrapping/verification are tens of milliseconds (native Web Crypto).

## 10. Dependencies
**A · Pure Zero**: 0 npm deps, 0 vendor, 0 external requests (platform Web Crypto).

## 11. License
Repository LICENSE.

## 12. Changelog
- 2026-11-11 — README delivered (English); MDS-1 contract.
