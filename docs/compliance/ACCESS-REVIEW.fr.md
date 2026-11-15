<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/ACCESS-REVIEW.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Accès Revue & Compte Lifecycle

**Statut:** Émis · **Version:** 1.0 · **Dernier mis à jour:** 2026-11-14
**Produit:** Aegis — Protection de la vie privée Local données Nettoyage Moteur

Couvre operator/issuer accès à un Aegis instance et le periodic revue
requis par SOC 2 CC1.2 / CC6.1–6.3 et ISO 27001 Un.9.

---

## 1. Compte types

| Compte | But | Approvisionnement |
|---------|---------|--------------|
| `operator` | day-to-day opérations (nettoyage, signature, coffre-fort, audit export) | local `accounts` table; ou SCIM/OIDC (voir `SCIM.md`) |
| `admin` | même as opérateur + revocation/escrow admin | local `accounts` table |
| Émetteur secret (`AEGIS_ISSUER_SECRET`) | frappe session jetons (LAN clients) | environnement secret, **ne pas** un connexion compte |

Là est **aucun multi-tenant** modèle; chaque instance a son propre opérateur ensemble.

## 2. Joiner / Mover / Leaver (JML)

- **Joiner:** créer compte avec au moins privilege (`operator` sauf admin nécessaire);
  problème identifiants au-dessus de un secured canal; enregistrement propriétaire + approver.
- **Mover:** re-scope roles uniquement après approbation; jamais accumulate privileges.
- **Leaver:** désactiver le compte immédiatement; le opérateur's **piste d'audit reste
  intact** (il est protected et ne pas erasable — voir `server/store.js` `eraseSubject`);
  GDPR effacement s.applique à *données personnes concernées*, ne pas le opérateur responsabilité journal.

## 3. Periodic recertification

- **Quarterly** revue de tous operator/admin comptes: confirmer chaque est encore
  requis, rôle appropriate, et propriétaire connu.
- Retirer ou désactiver périmé comptes; document le revue (who/when/result).
- **Émetteur secret rotation** à au moins **annually** ou sur suspicion de exposure;
  rotating invalidates tous émis session jetons (TTL-bounded anyway).

## 4. Revue liste de contrôle

- [ ] Compte liste correspond approved roster (aucun orphaned comptes).
- [ ] Aucun compte contient `admin` sans un enregistré entreprise besoin.
- [ ] Émetteur secret rotated dans politique fenêtre.
- [ ] Aucun shared/generic opérateur comptes.
- [ ] Failed-login throttle actif (`auth_login_throttled` événements présent sous charge).
- [ ] audit export reviewed pour anomalous privileged actions.

## 5. Au moins privilege & separation

opérateur actions sont scope-gated (e.g. revocation/escrow require admin). Le
détecteur de falsification, append-only audit journal fournit le detective control; le revue fournit le
preventive/periodic control.
