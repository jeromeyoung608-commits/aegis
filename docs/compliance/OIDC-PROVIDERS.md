# OIDC provider configuration (real IdP)

Aegis supports OIDC (auth-code flow, RS256 `id_token` verification via `node:crypto`)
behind `AEGIS_AUTH_MODE=oidc`. The mock flow is covered by `modules/oidc/tests/oidc.test.mjs`
(6/6). This note shows how to point it at a real IdP. The product never fakes an IdP —
the customer's tenant is required.

## Required environment

```
AEGIS_AUTH_MODE=oidc
AEGIS_OIDC_ISSUER=https://<your-idp>/.well-known/openid-configuration   # or the issuer base
AEGIS_OIDC_CLIENT_ID=<client-id>
AEGIS_OIDC_CLIENT_SECRET=<client-secret>        # confidential client
AEGIS_OIDC_REDIRECT_URI=https://<your-tenant-host>/auth/oidc/callback
AEGIS_OIDC_DEFAULT_ROLE=operator                # role granted to new IdP users
```

`server.js` discovers `.well-known/openid-configuration` (or `o.issuer`), then
`token_endpoint` + `jwks_uri`, exchanges the code, and verifies the `id_token`:
issuer, audience (`client_id`), expiry, `nonce`, and the RS256 signature against the
JWKS. `HS256` and any tampered/timed-out token are rejected.

## Entra ID (Azure AD / Microsoft Entra)

1. App registrations → New registration. Redirect URI (Web): `AEGIS_OIDC_REDIRECT_URI`.
2. Certificates & secrets → New client secret → copy into `AEGIS_OIDC_CLIENT_SECRET`.
3. `AEGIS_OIDC_ISSUANCE`/`ISSUER` = `https://login.microsoftonline.com/<tenant>/v2.0`.
4. Token → ID token (implicit grant off; we use auth-code + PKCE-free confidential).
5. Manifest: `accessTokenAcceptedVersion` 2; `signInAudience` single/multi-tenant as needed.
6. Under Expose an API, the `client_id` is the audience (`aud`) Aegis verifies.

## Okta

1. Applications → Create App Integration → OIDC → Web.
2. Sign-in redirect URI: `AEGIS_OIDC_REDIRECT_URI`; Grant type: Authorization Code.
3. `AEGIS_OIDC_ISSUER` = `https://<subdomain>.okta.com/oauth2/default` (or the
   authorization-server issuer). `AEGIS_OIDC_CLIENT_ID`/`SECRET` from the app.
4. Assign users/groups; Aegis creates a local operator session on first login.

## Keycloak

1. Realm → Clients → Create → Client type OpenID Connect, client auth On.
2. Valid redirect URIs: `AEGIS_OIDC_REDIRECT_URI`.
3. `AEGIS_OIDC_ISSUER` = `https://keycloak.example/realms/<realm>`.
4. Credentials → Client Secret → `AEGIS_OIDC_CLIENT_SECRET`.

## SCIM 2.0 provisioning / deprovisioning

`modules/scim/` implements CRUD + `active:false` deprovisioning (keeps the audit
trail; never erases it), password-login disable, per-IP rate limit, and
`Token/{rotate,revoke}`. Tested 5/5 (`modules/scim/tests/scim.test.mjs`). Connector
guides for Entra/Okta are in `docs/compliance/SCIM-CONNECTORS.md`.

## Notes

- The username is taken from the `email` claim, falling back to `sub`. Ensure the IdP
  releases `email` (or map a claim).
- Operator MFA (`server/totp.js`) is independent of IdP MFA; enforce MFA at the IdP or
  enable Aegis TOTP (`AEGIS_MFA_KEY` + operator enroll via the console).
- Rotate `AEGIS_OIDC_CLIENT_SECRET` like any other secret — it is never baked into the
  image (see `ACR-PRIVATE-REGISTRY.md`).
