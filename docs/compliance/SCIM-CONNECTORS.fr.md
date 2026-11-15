<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/SCIM-CONNECTORS.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# SCIM 2.0 connectors (approvisionnement)

`modules/scim` implémente SCIM 2.0: Utilisateur CRUD, `active:false` déprovisionnement (conserve
le piste d'audit; jamais erases il), password-login désactiver, par IP débit limite, et
`Token/{rotate,revoke}`. Testé 5/5 (`modules/scim/tests/scim.test.mjs`).

## Entra ID
1. Entreprise applications → Approvisionnement → Automatic.
2. Tenant URL: `https://<your-tenant-host>/scim/v2`; secret jeton: le Aegis SCIM jeton
   (`Token/rotate`).
3. Attribut mappings: `externalId`/`userName` → opérateur username; `active` pilote
   déprovisionnement. Sur désactiver, Aegis ensembles le compte `enabled=0` et conserve historique.

## Okta
1. Applications → Application Intégration → SCIM 2.0.
2. SCIM base URL + bearer jeton (Aegis SCIM jeton).
3. Approvisionnement fonctionnalités: Créer Users, Mise à jour Utilisateur Attributes, Deactivate Users.

## Notes
- SCIM déprovisionnement est **deactivation**, ne pas deletion — responsabilité est conservé
  (B-04). À entièrement retirer un opérateur, revoke leur SCIM jeton et le compte reste
  désactivé.
- Le SCIM jeton est un séparé secret de le émetteur secret; faire tourner il independently.
- SCIM fait ne pas octroi opérateur console accès par lui-même — il provisions comptes; MFA
  et rôle assignment follow le local/OIDC modèle.
