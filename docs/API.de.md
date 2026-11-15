<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/API.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# Aegis HTTP API

Aegis liefert aus ein einzeln, **null Abhängigkeiten** Node Server (`server.js`) das liefert aus der
statisch Shell und alle Modul Assets und offenlegt der JSON API unten. Alle timestamps sind
ISO-8601 UTC. Alle request/response bodies sind JSON sofern noted.

> Basis URL: Server Wurzel (Standard `http://localhost:8099`). Binden host und TLS sind
> Bereitstellung concerns — siehe `SECURITY.md` und `CONFIGURE-BEFORE-DEPLOY.md`.

## Authentication Modell

- **Aussteller Geheimnis** (`AEGIS_ISSUER_SECRET`): ein Bediener bearer Token. Bediener
  endpoints expect `Authorization: Bearer <issuer-secret>`.
- **Bediener Anmeldung**: `POST /auth/login` Probleme ein Sitzung Token nach credential
  prüfen; 5 fehlgeschlagen attempts Auslöser ein 10-Minute lockout (`429`).
- **MFA**: TOTP enroll/verify unter `/auth/mfa/*`; OIDC ist `503` bis konfiguriert.
- Unauthenticated Anfragen zu protected routes zurückgeben `401`.

## Endpoints

### Auth
| Methode | Pfad | Auth | Notizen |
|--------|------|------|-------|
| Veröffentlichen | `/auth/login` | keiner | Rumpf ≤ 1 MB, sonst `413` |
| Veröffentlichen | `/auth/logout` | Sitzung | — |
| Holen | `/auth/me` | Sitzung | aktuell Identität |
| GET/POST | `/auth/oidc/start`, `/auth/oidc/callback` | keiner | `503` wenn unconfigured |
| GET/POST | `/auth/mfa/enroll`, `/auth/mfa/verify`, `/auth/mfa/disable` | Sitzung | TOTP |

### Audit & Export
| Methode | Pfad | Auth | Notizen |
|--------|------|------|-------|
| Holen | `/audit` | Bediener | Liste Ereignisse |
| Holen | `/audit/export.json`, `/audit/export.csv` | Bediener | CSV/JSON |
| Veröffentlichen | `/audit/erase` | Bediener | erase ein betroffene Person (GDPR Löschung) |
| Veröffentlichen | `/audit/tombstone`, `/audit/purge` | Bediener | Aufbewahrung Kontrollen |
| Holen | `/export/bundle` | Bediener | GDPR Art.20 portability Paket (jetzt trägt `provenance`) |

### Compliance
| Methode | Pfad | Auth | Notizen |
|--------|------|------|-------|
| GET/PUT | `/api/compliance` | Bediener | Bediener Fakten (rechtlich Name, DPO, SLA, EU rep…) |
| Holen | `/api/compliance/doc/<KIND>` | Bediener | `409` bis facts/artifact supplied; `200` + `X-Aegis-Source: uploaded` wenn ein Upload satisfies es |
| Holen | `/api/compliance/template/<KIND>` | Bediener | unfilled Vorlage (`{{…}}`) |
| Holen | `/api/compliance/status` | Bediener | lists `missing` Fakten |
| GET/POST | `/api/compliance/dpia` | Bediener | DPIA Datensatz |
| Veröffentlichen | `/api/compliance/upload` | Bediener | Basis64 Dokument; **exempt** von der 1 MB cap |
| Holen | `/api/compliance/logo` | keiner | logo asset (`204` wenn unset) |

`KIND ∈ {ROPA, DPA, SLA, PRIVACY-POLICY, SCC, DPIA}`.

### Sitzungen, Signalisierung, Relay
| Methode | Pfad | Auth | Notizen |
|--------|------|------|-------|
| GET/POST | `/session` | Aussteller | issue/verify ein Sitzung Token |
| Veröffentlichen | `/signal` | Token | WebRTC Signalisierung (`204`) |
| Veröffentlichen | `/relay` | Token | blind Relay forwarding |

### Admin & Konfiguration
| Methode | Pfad | Auth | Notizen |
|--------|------|------|-------|
| Veröffentlichen | `/api/admin/db-backup` | Bediener | verschlüsselt Sicherung |
| GET/PUT | `/api/config` | Bediener | Holen niemals gibt zurück `issuerSecret` |
| Holen | `/api/sessions` | Bediener | aktiv Sitzungen |
| GET/POST | `/scim/Users`, `/scim/*` | `AEGIS_SCIM_TOKEN` | SCIM 2.0 (revoked auf rotieren) |

### Observability & TSA
| Methode | Pfad | Auth | Notizen |
|--------|------|------|-------|
| Holen | `/metrics` | `AEGIS_METRICS_TOKEN` | **Fail-Closed** — `401` ohne Token |
| POST/GET | `/adapter/tsa/submit`, `/adapter/tsa/verify` | keiner | RFC 3161 timestamping |

### Statisch Assets
Alle statisch Dateien unter `/aegis-shell/`, `/modules/`, `/docs/` sind ausgeliefert für
`GET`/`HEAD` nur; andere methods zurückgeben `405`. Privat Pfade (`/server.js`,
`/config/`, `/data/`, `*.db`) zurückgeben `404`.

## Fehler Umschlag

```json
{ "error": "human-readable reason", "code": "OPTIONAL_CODE" }
```

Common codes: `401` unauthorized, `403` forbidden (e.g. erase von protected subject),
`409` Compliance Gate nicht satisfied, `413` Nutzdaten too groß, `429` rate-limited,
`503` Funktion unconfigured.
