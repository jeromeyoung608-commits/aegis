<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/API.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Aegis HTTP API

Aegis distribue un unique, **zéro dépendance** Node serveur (`server.js`) que sert le
statique shell et tous module actifs et expose le JSON API ci-dessous. Tous timestamps sont
ISO-8601 UTC. Tous request/response bodies sont JSON sauf noted.

> Base URL: le serveur racine (par défaut `http://localhost:8099`). Lier host et TLS sont
> déploiement concerns — voir `SECURITY.md` et `CONFIGURE-BEFORE-DEPLOY.md`.

## Authentication modèle

- **Émetteur secret** (`AEGIS_ISSUER_SECRET`): un opérateur bearer jeton. opérateur
  endpoints expect `Authorization: Bearer <issuer-secret>`.
- **opérateur connexion**: `POST /auth/login` problèmes un session jeton après credential
  vérifier; 5 échoué attempts déclencheur un 10-minute lockout (`429`).
- **MFA**: TOTP enroll/verify sous `/auth/mfa/*`; OIDC est `503` jusqu.à configuré.
- Unauthenticated requêtes à protected routes retourner `401`.

## Endpoints

### Auth
| Méthode | Chemin | Auth | Notes |
|--------|------|------|-------|
| Publier | `/auth/login` | aucun | corps ≤ 1 MB, sinon `413` |
| Publier | `/auth/logout` | session | — |
| Obtenir | `/auth/me` | session | actuel identité |
| GET/POST | `/auth/oidc/start`, `/auth/oidc/callback` | aucun | `503` si unconfigured |
| GET/POST | `/auth/mfa/enroll`, `/auth/mfa/verify`, `/auth/mfa/disable` | session | TOTP |

### audit & export
| Méthode | Chemin | Auth | Notes |
|--------|------|------|-------|
| Obtenir | `/audit` | opérateur | liste événements |
| Obtenir | `/audit/export.json`, `/audit/export.csv` | opérateur | CSV/JSON |
| Publier | `/audit/erase` | opérateur | erase un personne concernée (GDPR effacement) |
| Publier | `/audit/tombstone`, `/audit/purge` | opérateur | conservation contrôles |
| Obtenir | `/export/bundle` | opérateur | GDPR Art.20 portability lot (maintenant porte `provenance`) |

### conformité
| Méthode | Chemin | Auth | Notes |
|--------|------|------|-------|
| GET/PUT | `/api/compliance` | opérateur | opérateur faits (juridique nom, DPO, SLA, UE rep…) |
| Obtenir | `/api/compliance/doc/<KIND>` | opérateur | `409` jusqu.à facts/artifact supplied; `200` + `X-Aegis-Source: uploaded` quand un téléversement satisfies il |
| Obtenir | `/api/compliance/template/<KIND>` | opérateur | unfilled modèle (`{{…}}`) |
| Obtenir | `/api/compliance/status` | opérateur | lists `missing` faits |
| GET/POST | `/api/compliance/dpia` | opérateur | DPIA enregistrement |
| Publier | `/api/compliance/upload` | opérateur | base64 document; **exempt** de le 1 MB cap |
| Obtenir | `/api/compliance/logo` | aucun | logo asset (`204` si unset) |

`KIND ∈ {ROPA, DPA, SLA, PRIVACY-POLICY, SCC, DPIA}`.

### Sessions, signalisation, relais
| Méthode | Chemin | Auth | Notes |
|--------|------|------|-------|
| GET/POST | `/session` | émetteur | issue/verify un session jeton |
| Publier | `/signal` | jeton | WebRTC signalisation (`204`) |
| Publier | `/relay` | jeton | aveugle relais forwarding |

### Admin & configuration
| Méthode | Chemin | Auth | Notes |
|--------|------|------|-------|
| Publier | `/api/admin/db-backup` | opérateur | chiffré sauvegarde |
| GET/PUT | `/api/config` | opérateur | Obtenir jamais retourne `issuerSecret` |
| Obtenir | `/api/sessions` | opérateur | actif sessions |
| GET/POST | `/scim/Users`, `/scim/*` | `AEGIS_SCIM_TOKEN` | SCIM 2.0 (revoked sur faire tourner) |

### Observability & TSA
| Méthode | Chemin | Auth | Notes |
|--------|------|------|-------|
| Obtenir | `/metrics` | `AEGIS_METRICS_TOKEN` | **fail-closed** — `401` sans jeton |
| POST/GET | `/adapter/tsa/submit`, `/adapter/tsa/verify` | aucun | RFC 3161 timestamping |

### Statique actifs
Tous statique fichiers sous `/aegis-shell/`, `/modules/`, `/docs/` sont servi pour
`GET`/`HEAD` uniquement; autres methods retourner `405`. Privé chemins (`/server.js`,
`/config/`, `/data/`, `*.db`) retourner `404`.

## Erreur enveloppe

```json
{ "error": "human-readable reason", "code": "OPTIONAL_CODE" }
```

Common codes: `401` unauthorized, `403` forbidden (e.g. erase de protected subject),
`409` conformité gate ne pas satisfied, `413` données utiles too grand, `429` rate-limited,
`503` fonctionnalité unconfigured.
