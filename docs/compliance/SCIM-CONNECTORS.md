# SCIM 2.0 connectors (provisioning)

SCIM 2.0 is implemented in `server.js` (routes) + `server/store.js` (persistence): User CRUD, `active:false` deprovisioning (keeps
the audit trail; never erases it), password-login disable, per-IP rate limit, and
`Token/{rotate,revoke}`. Tested 5/5 (`modules/scim/tests/scim.test.mjs`).

## Entra ID
1. Enterprise applications → Provisioning → Automatic.
2. Tenant URL: `https://<your-tenant-host>/scim/v2`; Secret token: the Aegis SCIM token
   (`Token/rotate`).
3. Attribute mappings: `externalId`/`userName` → operator username; `active` drives
   deprovisioning. On disable, Aegis sets the account `enabled=0` and keeps history.

## Okta
1. Applications → App Integration → SCIM 2.0.
2. SCIM base URL + bearer token (Aegis SCIM token).
3. Provisioning features: Create Users, Update User Attributes, Deactivate Users.

## Notes
- SCIM deprovisioning is **deactivation**, not deletion — accountability is retained
  (B-04). To fully remove an operator, revoke their SCIM token and the account stays
  disabled.
- The SCIM token is a separate secret from the issuer secret; rotate it independently.
- SCIM does not grant operator console access by itself — it provisions accounts; MFA
  and role assignment follow the local/OIDC model.
