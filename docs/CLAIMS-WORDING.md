# Aegis — claims wording (normative)

**Status**: normative wording baseline, 2026-11-13. Applies to README, delivery
reports, UI copy, comments and sales material. Technical behaviour is unchanged;
only the words used to describe it are corrected.

This file exists because three terms were used as marketing shorthand for things
Aegis does **not** implement. Directory and module names are historical and are
kept (renaming them would break imports and tests), but they must never be read
as cryptographic claims.

## 1. Forbidden claims and required replacements

| Do not say | Why it is wrong | Say instead |
|---|---|---|
| `forward secrecy` | One PBKDF2 session key is reused for every chunk. A fresh IV per chunk prevents IV reuse; it does not provide key erasure or compromise-resistance. | **per-chunk authenticated encryption with a fresh random IV** (add "no forward secrecy" when the threat model is discussed) |
| `blind signature` | There is no blinding factor and no unblinding step. The signer signs a hash they can see. | **detached hash signing** (add "not a cryptographic blind signature scheme") |
| `immutable` / `Immutable Audit Trail` | A hash chain is tamper-evident, not immutable: an operator with write access can recompute the whole chain. With `hmacKey` set it is HMAC-bound; without it, plain SHA-256 links are only a detection aid. | **tamper-evident hash chain** (and state which mode is in use) |
| `Prove who signed it` | ECDSA verifies possession of a key, not a legal identity. No CA, no KYC. | **verify integrity against a self-asserted signer key** (`trust: 'self-asserted'`) |
| `Role views are enforced` | Role switching is CSS-level presentation only. | **role views change the UI only — not an access-control boundary** |
| `zero-knowledge` | The module wraps keys locally; it performs no ZK proof and has no server protocol. | **locally self-custodied keys** (directory name `zero-knowledge-identity` is historical) |
| `Blind relay` (as a crypto claim) | The relay forwards ciphertext it cannot read; that is transport blindness, not a blind-signature scheme. | **server-blind ciphertext relay** |

## 2. Wording that stays (verified by audit)

- `destructive redaction` — byte-level verification passed; the exported PDF has
  no recoverable text layer.
- `server never sees plaintext` — the relay forwards ciphertext only.
- `100k+ nodes at 60fps` — measured 100k / 54–60fps.

## 3. Naming exception

`modules/detached-hash-signer`, `modules/blind-relay` and
`modules/zero-knowledge-identity` keep their directory names for compatibility.
Every user-facing document must pair the name with the accurate term above and
must not describe the implementation as forward-secret, blind-signature or
zero-knowledge cryptography.

## 4. Scope

These are wording corrections only. No API, export, file path, wire format,
crypto primitive or access-control decision is changed by this baseline.
