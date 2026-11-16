# Architecture

Aegis is a single Node.js process (`server.js`) with **zero npm dependencies** —
only `node:*` built-ins. It serves two surfaces from one port: the `aegis-shell`
workbench/console (static) and the JSON API.

## Layers
- **Transport** — `http`/`https` (optional TLS from `AEGIS_TLS_DIR`); COOP/COEP +
  per-response nonce CSP.
- **Static** — `serveStatic` confined to the web root with a **top-level deny list**
  (`config`, `data`, `server`) and a deny-extension list (`.db*`) — private paths are
  never served (B-01~B-04).
- **API** — operator-gated endpoints (`operatorAuthorized`): compliance, sessions,
  config, admin backup; plus OIDC, SCIM, TSA, escrow, audit, MFA.
- **Store** — embedded `node:sqlite` (`server/store.js`): accounts (TOTP sealed
  AES-256-GCM), sessions, audit trail (append-only, non-erasable for operators),
  revocations, escrow, SCIM tokens, MFA recovery codes.
- **Modules** — `server/oidc.js` (RS256 `id_token` verification via `node:crypto`),
  and SCIM 2.0 CRUD + deprovisioning in `server.js` + `server/store.js`.
  Their test suites live in `modules/oidc/tests/` and `modules/scim/tests/`.
- **Adapters** — `adapters/tsa-rfc3161` (RFC 3161 timestamp signing/verification).

## Trust boundaries
- The web root is untrusted input; the deny list is the hard boundary.
- Operator endpoints require a session or the issuer secret — a presentation role
  switch in the shell is **not** an access-control boundary.
- `data/` and `config/` are runtime volumes, excluded from the delivery package
  (B-03): no operator secret or fact ever ships.

## Identity & provisioning
Local accounts (`npm run setup`), OIDC (opt-in), SCIM provisioning, TOTP MFA, GDPR
erasure with tombstone hashing. See `docs/compliance/OIDC-PROVIDERS.md` and
`SCIM-CONNECTORS.md`.
