<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/SOC2-EVIDENCE.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# SOC 2 État de préparation — Control Mapping & preuve

**Statut:** État de préparation preuve (self-assessment) · **Version:** 1.0 · **Dernier mis à jour:** 2026-11-14
**Produit:** Aegis — Protection de la vie privée Local données Nettoyage Moteur

> Ce document est **ne pas** un SOC 2 rapport ou certification. Il est un état de préparation
> carte showing, pour chaque Confiance Services Criterion (TSC), quoi est implémenté et
> où un auditor serait find preuve. Lacunes sont called hors explicitement.

## Common Critères (sécurité — CC)

| TSC | Control theme | Implémenté | preuve |
|-----|--------------|-----------|----------|
| CC1 | Control environnement / governance | Partial | `docs/compliance/` (policies), `README` gate table |
| CC2 | Communication & information | Oui | opérateur console; audit export |
| CC3 | Risque assessment | Partial | `docs/compliance/THREAT-MODEL.md`, `CRA-NIS2.md` |
| CC4 | Surveillance | Oui | empreinte-chained audit journal; `GET /healthz` liveness sonde |
| CC5 | Control activities | Oui | Bearer auth + TTL; connexion throttling; détecteur de falsification audit; path-traversal guards |
| CC6 | Logical accès | Oui | Hashed identifiants; operator/issuer scopes; session TTL; failed-login throttle |
| CC7 | Système opérations | Oui | Backup/restore (`sqlite3 .backup`); freshness-checked livraison packer |
| CC8 | Modification management | Partial | Feature-flag gating; ff-only merges; version liste de contrôle |
| CC9 | Risque mitigation | Partial | Menace modèle; aucun par défaut sortie |

## Additional TSC

- **Disponibilité (Un):** `GET /healthz` état de préparation; documenté backup/restore;
  port-collision fail-fast démarrage. _Gap:_ aucun documenté RTO/RPO SLA pourtant.
- **Confidentiality (C):** chiffrement à reste (coffre-fort); zéro-connaissance identité;
  aucun tiers sortie par par défaut.
- **Traitement Intégrité (PI):** empreinte-chained audit; RFC3161 adaptateur avec
  fail-open repli à local temps. _Gap:_ formal PI test suite pending.
- **Vie privée (P):** `PRIVACY-POLICY.md`, `DPA.md`, `ROPA.md` (ce dossier);
  GDPR données-subject effacement implémenté.

## Auditor pointers

- audit chain vérification: `GET /audit` + `GET /audit/export`; intégrité via
  in-repo `verifyAuditChain`.
- Connexion throttle: `server.js` par IP + per-(IP,utilisateur) limiter (429 + lockout).
- Détecteur de falsification opérateur audit: `server/store.js` `eraseSubject` refuses protected
  personnes concernées (HTTP 403).
- Livraison intégrité: `scripts/package-delivery.mjs` SHA256 + source-freshness.

## Lacunes fermé (ce tour)

| # | Gap | Statut | preuve |
|---|-----|--------|----------|
| 1 | Formal access-review procédure & recertification | **Fermé** | `ACCESS-REVIEW.md` (JML, quarterly recert, issuer-secret rotation) |
| 2 | Documenté incident-response runbook | **Fermé** | `INCIDENT-RESPONSE.md` (phases, SEV classes, GDPR 72h, détecteur de falsification audit forensics) |
| 3 | DR/backup RTO-RPO SLA + testé restaurer drill | **Fermé** | `DR-BACKUP.md` (`sqlite3 .backup` méthode, RTO/RPO defaults, restaurer + annuel drill) |
| 4 | Vendor / sub-sous-traitant inventory | **Fermé** | `SUBCONTRACTOR-INVENTORY.md` (aucun obligatoire runtime sub-sous-traitant; 2 opt-in sortie points, désactivé par par défaut) |

Restant pour un formal audit (operational, ne pas tooling): execute le premier
quarterly accès revue et le premier annuel restaurer drill, et avoir juridique
sign désactivé le juridique drafts (Vie privée Politique / DPA / ROPA).
