<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/THREAT-MODEL.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Menace modèle

Portée: le Aegis zéro dépendance gateway + shell. Hors de portée: le Client's IdP,
inverser proxy, et host OS.

## Actifs
1. Operator/audit base de données (`data/aegis.db`): comptes, sessions, piste d'audit.
2. Émetteur secret / opérateur identifiants — gate jeton minting + opérateur API.
3. Client media + C2PA manifests (le provenance enregistrement lui-même).
4. conformité faits + téléversé documents (`data/compliance/`).

## Threats & contrôles
| # | Menace | Control |
|---|---|---|
| T1 | Statique chemin traversal expose source/secrets | Premier niveau deny liste + ext deny + repeated-`..` decode; vérifié 404/403 |
| T2 | Livré image leaks un partagé secret/DB | Livraison exclut `data/`, `config/local.json`, `*.db*`; B-03 assert |
| T3 | Falsifié JWT / opérateur session | `operatorAuthorized`; HS256-uniquement local; OIDC rejette `HS256`/altéré |
| T4 | MFA seed theft | TOTP scellé AES-256-GCM; récupération codes salted-empreinte + one-time |
| T5 | audit tampering / opérateur wipes propre trace | Append-only; operator/system trail non-erasable (B-04) |
| T6 | Brute force / abuse | Par IP débit limite (opt-in `AEGIS_RATE_LIMIT`); SCIM par IP limite |
| T7 | Insecure transport | Facultatif TLS + HSTS; reverse-proxy TLS référence |
| T8 | Fake conformité declaration | Produit jamais fabricates juridique faits; opérateur supplies via console |

## Assumptions / residual risque
- Le host, inverser proxy, et IdP sont le Client's responsabilité.
- Si `AEGIS_TRUSTED_LAN=1` est ensemble, `/session` est ouvert à aucun reachable client (lab
  uniquement) — documenté et warned à démarrage.
- Un compromis émetteur secret allows jeton minting; faire tourner par RUNBOOK-clé-Rotation.
