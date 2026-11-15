# Threat model

Scope: the Aegis zero-dependency gateway + shell. Out of scope: the customer's IdP,
reverse proxy, and host OS.

## Assets
1. Operator/audit database (`data/aegis.db`): accounts, sessions, audit trail.
2. Issuer secret / operator credentials — gate token minting + operator API.
3. Customer media + C2PA manifests (the provenance record itself).
4. Compliance facts + uploaded documents (`data/compliance/`).

## Threats & controls
| # | Threat | Control |
|---|---|---|
| T1 | Static path traversal exposes source/secrets | Top-level deny list + ext deny + repeated-`..` decode; verified 404/403 |
| T2 | Shipped image leaks a shared secret/DB | Delivery excludes `data/`, `config/local.json`, `*.db*`; B-03 assert |
| T3 | Forged JWT / operator session | `operatorAuthorized`; HS256-only local; OIDC rejects `HS256`/tampered |
| T4 | MFA seed theft | TOTP sealed AES-256-GCM; recovery codes salted-hash + one-time |
| T5 | Audit tampering / operator wipes own trace | Append-only; operator/system trail non-erasable (B-04) |
| T6 | Brute force / abuse | Per-IP rate limit (opt-in `AEGIS_RATE_LIMIT`); SCIM per-IP limit |
| T7 | Insecure transport | Optional TLS + HSTS; reverse-proxy TLS reference |
| T8 | Fake compliance declaration | Product never fabricates legal facts; operator supplies via console |

## Assumptions / residual risk
- The host, reverse proxy, and IdP are the customer's responsibility.
- If `AEGIS_TRUSTED_LAN=1` is set, `/session` is open to any reachable client (lab
  only) — documented and warned at boot.
- A compromised issuer secret allows token minting; rotate per RUNBOOK-KEY-ROTATION.
