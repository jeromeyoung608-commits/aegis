# Aegis HTTP API

Aegis ships a single, **zero-dependency** Node server (`server.js`) that serves the
static shell and all module assets and exposes the JSON API below. All timestamps are
ISO-8601 UTC. All request/response bodies are JSON unless noted.

> Base URL: the server root (default `http://localhost:8099`). Bind host and TLS are
> deployment concerns — see `SECURITY.md` and `CONFIGURE-BEFORE-DEPLOY.md`.

## Authentication model

- **Issuer secret** (`AEGIS_ISSUER_SECRET`): an operator bearer token. Operator
  endpoints expect `Authorization: Bearer <issuer-secret>`.
- **Operator login**: `POST /auth/login` issues a session token after credential
  check; 5 failed attempts trigger a 10-minute lockout (`429`).
- **MFA**: TOTP enroll/verify under `/auth/mfa/*`; OIDC is `503` until configured.
- Unauthenticated requests to protected routes return `401`.

## Endpoints

### Auth
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/auth/login` | none | body ≤ 1 MB, else `413` |
| POST | `/auth/logout` | session | — |
| GET  | `/auth/me` | session | current identity |
| GET/POST | `/auth/oidc/start`, `/auth/oidc/callback` | none | `503` if unconfigured |
| GET/POST | `/auth/mfa/enroll`, `/auth/mfa/verify`, `/auth/mfa/disable` | session | TOTP |

### Audit & export
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/audit` | operator | list events |
| GET | `/audit/export.json`, `/audit/export.csv` | operator | CSV/JSON |
| POST | `/audit/erase` | operator | erase a data subject (GDPR erasure) |
| POST | `/audit/tombstone`, `/audit/purge` | operator | retention controls |
| GET | `/export/bundle` | operator | GDPR Art.20 portability bundle (now carries `provenance`) |

### Compliance
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET/PUT | `/api/compliance` | operator | operator facts (legal name, DPO, SLA, EU rep…) |
| GET | `/api/compliance/doc/<KIND>` | operator | `409` until facts/artifact supplied; `200` + `X-Aegis-Source: uploaded` when an upload satisfies it |
| GET | `/api/compliance/template/<KIND>` | operator | unfilled template (`{{…}}`) |
| GET | `/api/compliance/status` | operator | lists `missing` facts |
| GET/POST | `/api/compliance/dpia` | operator | DPIA record |
| POST | `/api/compliance/upload` | operator | base64 document; **exempt** from the 1 MB cap |
| GET | `/api/compliance/logo` | none | logo asset (`204` if unset) |

`KIND ∈ {ROPA, DPA, SLA, PRIVACY-POLICY, SCC, DPIA}`.

### Sessions, signaling, relay
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET/POST | `/session` | issuer | issue/verify a session token |
| POST | `/signal` | token | WebRTC signaling (`204`) |
| POST | `/relay` | token | blind relay forwarding |

### Admin & config
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/admin/db-backup` | operator | encrypted backup |
| GET/PUT | `/api/config` | operator | GET never returns `issuerSecret` |
| GET | `/api/sessions` | operator | active sessions |
| GET/POST | `/scim/Users`, `/scim/*` | `AEGIS_SCIM_TOKEN` | SCIM 2.0 (revoked on rotate) |

### Observability & TSA
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/metrics` | `AEGIS_METRICS_TOKEN` | **fail-closed** — `401` without token |
| POST/GET | `/adapter/tsa/submit`, `/adapter/tsa/verify` | none | RFC 3161 timestamping |

### Static assets
All static files under `/aegis-shell/`, `/modules/`, `/docs/` are served for
`GET`/`HEAD` only; other methods return `405`. Private paths (`/server.js`,
`/config/`, `/data/`, `*.db`) return `404`.

## Error envelope

```json
{ "error": "human-readable reason", "code": "OPTIONAL_CODE" }
```

Common codes: `401` unauthorized, `403` forbidden (e.g. erase of protected subject),
`409` compliance gate not satisfied, `413` payload too large, `429` rate-limited,
`503` feature unconfigured.
