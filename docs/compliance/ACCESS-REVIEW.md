<!-- Issued — adjust cadence and approver matrix to the operating entity's policy. -->

# Access Review & Account Lifecycle

**Status:** Issued · **Version:** 1.0 · **Last updated:** 2026-11-14
**Product:** Aegis — Privacy-First Local Data Cleansing Engine

Covers operator/issuer access to an Aegis instance and the periodic review
required by SOC 2 CC1.2 / CC6.1–6.3 and ISO 27001 A.9.

---

## 1. Account types

| Account | Purpose | Provisioning |
|---------|---------|--------------|
| `operator` | day-to-day operations (cleansing, signing, vault, audit export) | local `accounts` table; or SCIM/OIDC (see `SCIM.md`) |
| `admin` | same as operator + revocation/escrow admin | local `accounts` table |
| Issuer secret (`AEGIS_ISSUER_SECRET`) | mints session tokens (LAN clients) | environment secret, **not** a login account |

There is **no multi-tenant** model; each instance has its own operator set.

## 2. Joiner / Mover / Leaver (JML)

- **Joiner:** create account with least privilege (`operator` unless admin needed);
  issue credentials over a secured channel; record owner + approver.
- **Mover:** re-scope roles only after approval; never accumulate privileges.
- **Leaver:** disable the account immediately; the operator's **audit trail stays
  intact** (it is protected and not erasable — see `server/store.js` `eraseSubject`);
  GDPR erasure applies to *data subjects*, not the operator accountability log.

## 3. Periodic recertification

- **Quarterly** review of all operator/admin accounts: confirm each is still
  required, role appropriate, and owner known.
- Remove or disable stale accounts; document the review (who/when/result).
- **Issuer secret rotation** at least **annually** or on suspicion of exposure;
  rotating invalidates all issued session tokens (TTL-bounded anyway).

## 4. Review checklist

- [ ] Account list matches approved roster (no orphaned accounts).
- [ ] No account holds `admin` without a recorded business need.
- [ ] Issuer secret rotated within policy window.
- [ ] No shared/generic operator accounts.
- [ ] Failed-login throttle active (`auth_login_throttled` events present under load).
- [ ] Audit export reviewed for anomalous privileged actions.

## 5. Least privilege & separation

Operator actions are scope-gated (e.g. revocation/escrow require admin). The
tamper-evident, append-only audit log provides the detective control; the review provides the
preventive/periodic control.
