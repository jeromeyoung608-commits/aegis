<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/INCIDENT-RUNBOOK.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Incident réponse runbook

## Détection
- Forward audit événements à un SIEM (`audit.forwardUrl` dans le console Configuration onglet, ou
  `CONFIG.audit.forwardUrl`); Aegis POSTs chaque événement best-effort.
- Monitor `/metrics` (Prometheus): `aegis_audit_events_total`, `aegis_sessions_active`,
  `aegis_uptime_seconds`.

## Triage (premier 1 heure)
1. Identify le événement de le piste d'audit (console → audit, ou `/audit` query).
2. Si un credential est suspected compromis: faire tourner le émetteur secret
   (RUNBOOK-clé-Rotation) et revoke le opérateur session (console → Sessions).
3. Si un personne concernée est affected: utiliser le données personnes concernées onglet à export (DSAR) et, si
   requis, erase (Art.17) — le operator/system trail reste intact (B-04).

## Violation notification (GDPR Art.33/34)
- Utiliser le console Configuration onglet → "Envoyer incident test" à validate le notification
  canal, alors déclencheur le rél notification à votre DPO + autorité de contrôle
  dans 72h de awareness (Art.33) / sans undue delay pour high-risk (Art.34).
- Conserver le Aegis audit journal as le preuve de containment actions.

## Récupération
- Restaurer le base de données de un sauvegarde si corrupted: `scripts/restore.sh <backup.db>`,
  ou télécharger via le console (Configuration → Télécharger DB sauvegarde).
- Re-run le livraison gate (`npm run verify:delivery`) après aucun rebuild.

## Post-incident
- Mise à jour RUNBOOK-clé-Rotation et THREAT-MODEL; ajouter detections pour le échec mode.
- Enregistrement le chronologie dans le piste d'audit (il est append-only par conception).
