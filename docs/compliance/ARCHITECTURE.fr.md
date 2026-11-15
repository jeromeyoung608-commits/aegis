<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/ARCHITECTURE.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Architecture

Aegis est un unique Node.js processus (`server.js`) avec **zéro npm dépendances** —
uniquement `node:*` built-ins. Il sert two surfaces de un port: le `aegis-shell`
workbench/console (statique) et le JSON API.

## Layers
- **Transport** — `http`/`https` (facultatif TLS de `AEGIS_TLS_DIR`); COOP/COEP +
  per-response nonce CSP.
- **Statique** — `serveStatic` confined à le Web racine avec un **premier niveau deny liste**
  (`config`, `data`, `server`) et un deny-extension liste (`.db*`) — privé chemins sont
  jamais servi (B-01~B-04).
- **API** — opérateur-gated endpoints (`operatorAuthorized`): conformité, sessions,
  configuration, admin sauvegarde; plus OIDC, SCIM, TSA, séquestre, audit, MFA.
- **Magasin** — embedded `node:sqlite` (`server/store.js`): comptes (TOTP scellé
  AES-256-GCM), sessions, piste d'audit (append-only, non-erasable pour opérateurs),
  revocations, séquestre, SCIM jetons, MFA récupération codes.
- **Modules** — `modules/oidc` (RS256 `id_token` vérification via `node:crypto`),
  `modules/scim` (SCIM 2.0 CRUD + déprovisionnement).
- **Adapters** — `adapters/tsa-rfc3161` (RFC 3161 horodatage signing/verification).

## Confiance boundaries
- Le Web racine est untrusted entrée; le deny liste est le difficile frontière.
- opérateur endpoints require un session ou le émetteur secret — un presentation rôle
  switch dans le shell est **ne pas** un access-control frontière.
- `data/` et `config/` sont runtime volumes, excluded de le livraison paquet
  (B-03): aucun opérateur secret ou fact ever distribue.

## Identité & approvisionnement
Local comptes (`npm run setup`), OIDC (opt-in), SCIM approvisionnement, TOTP MFA, GDPR
effacement avec tombstone délégation d'empreintes. Voir `docs/compliance/OIDC-PROVIDERS.md` et
`SCIM-CONNECTORS.md`.
