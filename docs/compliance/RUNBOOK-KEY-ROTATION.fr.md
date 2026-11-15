<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/RUNBOOK-KEY-ROTATION.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# clé rotation runbook

Aegis utilise trois indépendant secret classes. Faire tourner chaque sur un décal (e.g. 90–365
jours) et après aucun suspected compromission.

## 1. Émetteur secret (`AEGIS_ISSUER_SECRET`)
Contrôles `/session` jeton minting (LAN signalisation) et quelques opérateur endpoints.
- **Faire tourner:** ensemble un nouveau valeur dans le déploiement secret/env et restart.
- **Effect:** tous previously minted LAN signalisation jetons become invalid → re-mint sur
  le établi. opérateur console sessions (SQLite-stored) sont unaffected.
- **Vérifier:** `curl -fsS "http://host/session?room=x"` avec le ancien secret → 401.

## 2. opérateur identifiants (`npm run setup` comptes)
Local comptes sont scellé (AES-256-GCM, clé = `AEGIS_MFA_KEY` ou émetteur secret).
- **Faire tourner password:** re-run `npm run setup` pour que compte, ou modification via le
  compte magasin.
- **Faire tourner MFA:** opérateur re-enrolls TOTP dans le console (`/auth/mfa/enroll`); ancien
  factor + récupération codes sont cleared et 10 nouveau récupération codes sont émis. Un
  opérateur peut force-reset un autre opérateur's MFA de le console (Configuration → Admin
  reset MFA).
- **MFA clé (`AEGIS_MFA_KEY`):** rotating il invalidates Tous enrolled TOTP seeds
  (ils sont scellé avec il). Communicate un reset fenêtre.

## 3. TLS privé clé
Uniquement utilisé si `AEGIS_TLS_DIR` (`~/.aegis/tls`) contient `key.pem`/`cert.pem`.
- **Faire tourner:** remplace le PEMs et restart. Pour public TLS, prefer terminating à un
  inverser proxy (deploy/reverse-proxy) et rotating là — le application alors s.exécute en clair
  HTTP derrière il.

## 4. SCIM approvisionnement jeton
`modules/scim` problèmes jetons avec `/Token/{rotate,revoke}`. Faire tourner via le console
ou API; revoke immédiatement sur offboarding/compromise (revoked jetons ne peut pas authenticate,
mais historique est conservé pour le piste d'audit).

## Cadence & preuve
- Décal rotations; enregistrement chaque dans le audit journal (le produit audits config/secret
  modifications as `config.updated`, `auth_mfa_*`, `session.revoke`).
- Jamais bake secrets dans le image — push à votre propre registry et inject à runtime
  (docs/compliance/ACR-PRIVATE-REGISTRY.md). Un livré partagé secret est le B-03 classe
  de défaut ce runbook existe à prevent.
