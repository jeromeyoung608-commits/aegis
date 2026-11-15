<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/SCIM.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# SCIM 2.0 Approvisionnement Intégration

**Statut:** Implémenté · **Version:** 1.0 · **Dernier mis à jour:** 2026-11-14
**Produit:** Aegis — Protection de la vie privée Local données Nettoyage Moteur

## 1. But

Entreprise clients manage opérateur identities dans un IdP (Okta, Azure AD/Entra,
OneLogin, …) et expect **automatisé provisioning/deprovisioning** de Aegis
opérateur comptes via **SCIM 2.0**. Ce document décrit le livré contrat.

## 2. Actuel état

- Aegis operator/issuer comptes direct dans le local SQLite magasin
  (`accounts`, roles `operator`/`admin`, avec un `enabled` indicateur pour déprovisionnement).
- OIDC SSO est implémenté (`/auth/oidc/*`, opt-in via `AEGIS_AUTH_MODE=oidc`).
- SCIM 2.0 approvisionnement est **implémenté** (`/scim/v2/Users`, guarded par
  `AEGIS_SCIM_TOKEN`); voir section 3 pour le contrat.

## 3. SCIM point de terminaison contrat (implémenté)

| Opération | SCIM chemin | Aegis action |
|-----------|-----------|--------------|
| Liste | `GET /scim/v2/Users` | paginated `ListResponse` de tous opérateur comptes |
| Créer | `POST /scim/v2/Users` | créer opérateur compte (rôle de `roles`, par défaut `operator`) |
| Lire | `GET /scim/v2/Users/{id}` | unique compte resource |
| Mise à jour | `PATCH /scim/v2/Users/{id}` | `op:replace`/`add` sur `active` toggles connexion; `roles` met à jour rôle |
| Deactivate | `PATCH /scim/v2/Users/{id}` (`active:false`) | `enabled=0` → connexion retourne 401 immédiatement |
| Supprimer | `DELETE /scim/v2/Users/{id}` | **désactiver, do ne pas purge** opérateur audit |
| Liste | `GET /scim/v2/Users` | paginated liste |

## 4. Authentication & sécurité

- SCIM bearer jeton (`Authorization: Bearer <SCIM_TOKEN>`), distinct de le
  operator/issuer secret.
- jeton configuré via `AEGIS_SCIM_TOKEN`; le point de terminaison retourne **503** (ne pas
  configuré) jusqu.à le jeton est ensemble.
- Tous SCIM mutations sont enregistré dans le détecteur de falsification piste d'audit.
- SCIM déprovisionnement Doit preserve le opérateur's **détecteur de falsification piste d'audit**
  (cohérent avec `eraseSubject` refusing protected personnes concernées).

## 5. Attribut mapping

| SCIM | Aegis | Notes |
|------|-------|-------|
| `userName` | compte username | |
| `active` | `enabled` | `false` disables connexion (immediate 401) |
| `roles` | `operator` / `admin` | par défaut `operator` |
| `id` | compte username | returned sur read/create |

## 6. Déprovisionnement & le détecteur de falsification audit

Quand un opérateur laisse, SCIM deactivates le compte (`PATCH active:false` ou
`DELETE`). Le opérateur's audit événements rester (forensic intégrité) et GDPR
effacement s.applique uniquement à **données personnes concernées**, ne pas le opérateur's responsabilité journal.

## 7. SSO (OIDC)

Le implémenté OIDC flux (`/auth/oidc/start` → IdP → `/auth/oidc/callback`)
prend en charge authorization-code + RS256 id_token vérification via `node:crypto`,
avec `state`/`nonce` replay protection et JIT compte creation de le
`email`/`sub` allégation. SCIM complements il par automating compte lifecycle; le two
sont indépendant et peut être activé separately.

## 8. Rollout liste de contrôle

1. Ensemble `AEGIS_SCIM_TOKEN` (un long aléatoire secret) sur le Aegis serveur.
2. Configure le IdP SCIM application → Aegis base URL (`https://host/scim/v2`).
3. Carte `roles` → Aegis rôle (par défaut `operator`).
4. Test créer / désactiver / supprimer contre un non-admin compte.
5. Confirmer un deprovisioned opérateur peut aucun plus long journal dans mais leur audit survive.
