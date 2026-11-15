<!-- SCIM 2.0 provisioning integration — implemented in server.js (handler guarded by AEGIS_SCIM_TOKEN). -->

# SCIM 2.0 Provisioning Integration

**Status:** Implemented · **Version:** 1.0 · **Last updated:** 2026-11-14
**Product:** Aegis — Privacy-First Local Data Cleansing Engine

## 1. Purpose

Enterprise customers manage operator identities in an IdP (Okta, Azure AD/Entra,
OneLogin, …) and expect **automated provisioning/deprovisioning** of Aegis
operator accounts via **SCIM 2.0**. This document describes the shipped contract.

## 2. Current state

- Aegis operator/issuer accounts live in the local SQLite store
  (`accounts`, roles `operator`/`admin`, with an `enabled` flag for deprovisioning).
- OIDC SSO is implemented (`/auth/oidc/*`, opt-in via `AEGIS_AUTH_MODE=oidc`).
- SCIM 2.0 provisioning is **implemented** (`/scim/v2/Users`, guarded by
  `AEGIS_SCIM_TOKEN`); see section 3 for the contract.

## 3. SCIM endpoint contract (implemented)

| Operation | SCIM path | Aegis action |
|-----------|-----------|--------------|
| List | `GET /scim/v2/Users` | paginated `ListResponse` of all operator accounts |
| Create | `POST /scim/v2/Users` | create operator account (role from `roles`, default `operator`) |
| Read | `GET /scim/v2/Users/{id}` | single account resource |
| Update | `PATCH /scim/v2/Users/{id}` | `op:replace`/`add` on `active` toggles login; `roles` updates role |
| Deactivate | `PATCH /scim/v2/Users/{id}` (`active:false`) | `enabled=0` → login returns 401 immediately |
| Delete | `DELETE /scim/v2/Users/{id}` | **disable, do not purge** operator audit |
| List | `GET /scim/v2/Users` | paginated list |

## 4. Authentication & security

- SCIM bearer token (`Authorization: Bearer <SCIM_TOKEN>`), distinct from the
  operator/issuer secret.
- Token configured via `AEGIS_SCIM_TOKEN`; the endpoint returns **503** (not
  configured) until the token is set.
- All SCIM mutations are recorded in the tamper-evident audit trail.
- SCIM deprovisioning MUST preserve the operator's **tamper-evident audit trail**
  (consistent with `eraseSubject` refusing protected subjects).

## 5. Attribute mapping

| SCIM | Aegis | Notes |
|------|-------|-------|
| `userName` | account username | |
| `active` | `enabled` | `false` disables login (immediate 401) |
| `roles` | `operator` / `admin` | default `operator` |
| `id` | account username | returned on read/create |

## 6. Deprovisioning & the tamper-evident audit

When an operator leaves, SCIM deactivates the account (`PATCH active:false` or
`DELETE`). The operator's audit events remain (forensic integrity) and GDPR
erasure applies only to **data subjects**, not the operator's accountability log.

## 7. SSO (OIDC)

The implemented OIDC flow (`/auth/oidc/start` → IdP → `/auth/oidc/callback`)
supports authorization-code + RS256 id_token verification via `node:crypto`,
with `state`/`nonce` replay protection and JIT account creation from the
`email`/`sub` claim. SCIM complements it by automating account lifecycle; the two
are independent and can be enabled separately.

## 8. Rollout checklist

1. Set `AEGIS_SCIM_TOKEN` (a long random secret) on the Aegis server.
2. Configure the IdP SCIM app → Aegis base URL (`https://host/scim/v2`).
3. Map `roles` → Aegis role (default `operator`).
4. Test create / disable / delete against a non-admin account.
5. Confirm a deprovisioned operator can no longer log in but their audit survives.
