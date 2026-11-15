# Key rotation runbook

Aegis uses three independent secret classes. Rotate each on a schedule (e.g. 90–365
days) and after any suspected compromise.

## 1. Issuer secret (`AEGIS_ISSUER_SECRET`)
Controls `/session` token minting (LAN signaling) and some operator endpoints.
- **Rotate:** set a new value in the deployment secret/env and restart.
- **Effect:** all previously minted LAN signaling tokens become invalid → re-mint on
  the workbench. Operator console sessions (SQLite-stored) are unaffected.
- **Verify:** `curl -fsS "http://host/session?room=x"` with the old secret → 401.

## 2. Operator credentials (`npm run setup` accounts)
Local accounts are sealed (AES-256-GCM, key = `AEGIS_MFA_KEY` or issuer secret).
- **Rotate password:** re-run `npm run setup` for that account, or change via the
  account store.
- **Rotate MFA:** operator re-enrolls TOTP in the console (`/auth/mfa/enroll`); old
  factor + recovery codes are cleared and 10 new recovery codes are issued. An
  operator can force-reset another operator's MFA from the console (Config → Admin
  reset MFA).
- **MFA key (`AEGIS_MFA_KEY`):** rotating it invalidates ALL enrolled TOTP seeds
  (they are sealed with it). Communicate a reset window.

## 3. TLS private key
Only used if `AEGIS_TLS_DIR` (`~/.aegis/tls`) holds `key.pem`/`cert.pem`.
- **Rotate:** replace the PEMs and restart. For public TLS, prefer terminating at a
  reverse proxy (deploy/reverse-proxy) and rotating there — the app then runs plain
  HTTP behind it.

## 4. SCIM provisioning token
`modules/scim` issues tokens with `/Token/{rotate,revoke}`. Rotate via the console
or API; revoke immediately on离职/compromise (revoked tokens cannot authenticate,
but history is retained for the audit trail).

## Cadence & evidence
- Schedule rotations; record each in the audit log (the product audits config/secret
  changes as `config.updated`, `auth_mfa_*`, `session.revoke`).
- Never bake secrets into the image — push to your own registry and inject at runtime
  (docs/compliance/ACR-PRIVATE-REGISTRY.md). A shipped shared secret is the B-03 class
  of defect this runbook exists to prevent.
