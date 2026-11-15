<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/API.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Aegis HTTP API

Aegis envía un único, **sin dependencias** Node servidor (`server.js`) que sirve el
estático shell y todos módulo activos y expone el JSON API abajo. Todos timestamps son
ISO-8601 UTC. Todos request/response bodies son JSON a menos que noted.

> Base URL: el servidor raíz (predeterminado `http://localhost:8099`). Enlazar host y TLS son
> despliegue concerns — véase `SECURITY.md` y `CONFIGURE-BEFORE-DEPLOY.md`.

## Authentication modelo

- **Emisor secreto** (`AEGIS_ISSUER_SECRET`): un operador bearer token. operador
  endpoints expect `Authorization: Bearer <issuer-secret>`.
- **operador inicio de sesión**: `POST /auth/login` problemas un sesión token después credential
  comprobar; 5 fallido attempts disparador un 10-minuto lockout (`429`).
- **MFA**: TOTP enroll/verify bajo `/auth/mfa/*`; OIDC es `503` hasta configurado.
- Unauthenticated solicitudes a protected routes devolver `401`.

## Endpoints

### Auth
| Método | Ruta | Auth | Notas |
|--------|------|------|-------|
| Publicar | `/auth/login` | ninguno | cuerpo ≤ 1 MB, si no `413` |
| Publicar | `/auth/logout` | sesión | — |
| Obtener | `/auth/me` | sesión | actual identidad |
| GET/POST | `/auth/oidc/start`, `/auth/oidc/callback` | ninguno | `503` si unconfigured |
| GET/POST | `/auth/mfa/enroll`, `/auth/mfa/verify`, `/auth/mfa/disable` | sesión | TOTP |

### auditoríun & exportación
| Método | Ruta | Auth | Notas |
|--------|------|------|-------|
| Obtener | `/audit` | operador | lista eventos |
| Obtener | `/audit/export.json`, `/audit/export.csv` | operador | CSV/JSON |
| Publicar | `/audit/erase` | operador | erase un interesado (GDPR borrado) |
| Publicar | `/audit/tombstone`, `/audit/purge` | operador | retención controles |
| Obtener | `/export/bundle` | operador | GDPR Art.20 portability paquete (ahora transporta `provenance`) |

### cumplimiento
| Método | Ruta | Auth | Notas |
|--------|------|------|-------|
| GET/PUT | `/api/compliance` | operador | operador hechos (legal nombre, DPO, SLA, UE rep…) |
| Obtener | `/api/compliance/doc/<KIND>` | operador | `409` hasta facts/artifact supplied; `200` + `X-Aegis-Source: uploaded` cuando un subida satisfies esto |
| Obtener | `/api/compliance/template/<KIND>` | operador | unfilled plantilla (`{{…}}`) |
| Obtener | `/api/compliance/status` | operador | lists `missing` hechos |
| GET/POST | `/api/compliance/dpia` | operador | DPIA registro |
| Publicar | `/api/compliance/upload` | operador | base64 documento; **exempt** de el 1 MB cap |
| Obtener | `/api/compliance/logo` | ninguno | logo asset (`204` si unset) |

`KIND ∈ {ROPA, DPA, SLA, PRIVACY-POLICY, SCC, DPIA}`.

### Sesiones, señalización, relé
| Método | Ruta | Auth | Notas |
|--------|------|------|-------|
| GET/POST | `/session` | emisor | issue/verify un sesión token |
| Publicar | `/signal` | token | WebRTC señalización (`204`) |
| Publicar | `/relay` | token | ciego relé forwarding |

### Admin & configuración
| Método | Ruta | Auth | Notas |
|--------|------|------|-------|
| Publicar | `/api/admin/db-backup` | operador | cifrado copia de seguridad |
| GET/PUT | `/api/config` | operador | Obtener nunca retorna `issuerSecret` |
| Obtener | `/api/sessions` | operador | activo sesiones |
| GET/POST | `/scim/Users`, `/scim/*` | `AEGIS_SCIM_TOKEN` | SCIM 2.0 (revoked en rotar) |

### Observability & TSA
| Método | Ruta | Auth | Notas |
|--------|------|------|-------|
| Obtener | `/metrics` | `AEGIS_METRICS_TOKEN` | **fail-closed** — `401` sin token |
| POST/GET | `/adapter/tsa/submit`, `/adapter/tsa/verify` | ninguno | RFC 3161 timestamping |

### Estático activos
Todos estático archivos bajo `/aegis-shell/`, `/modules/`, `/docs/` son servido para
`GET`/`HEAD` solo; otros methods devolver `405`. Privado rutas (`/server.js`,
`/config/`, `/data/`, `*.db`) devolver `404`.

## Error sobre

```json
{ "error": "human-readable reason", "code": "OPTIONAL_CODE" }
```

Common codes: `401` unauthorized, `403` forbidden (e.g. erase de protected subject),
`409` cumplimiento puerta de calidad no satisfied, `413` carga útil too grande, `429` rate-limited,
`503` funcionalidad unconfigured.
