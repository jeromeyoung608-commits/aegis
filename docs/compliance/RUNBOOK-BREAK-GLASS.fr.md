<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/RUNBOOK-BREAK-GLASS.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Break-glass (clé séquestre) runbook

Aegis prend en charge **clé séquestre** pour "break-glass" récupération de un session/asset quand le
primary holder est unavailable. Ce est un accountability-sensitive capacité et est
audited; utiliser il uniquement sous un documenté, authorized procédure.

## Quand à utiliser
- Un verrouillé session doit être admitted mais le opérateur qui scellé le séquestre est absent.
- Un regulatory/litigation hold exige retrieving un scellé données utiles.

## Procédure
1. **Authorize:** obtain un second-person approbation (two-opérateur règle). Enregistrement le
   ticket/incident ID.
2. **Deposit/retrieve:** le séquestre API deposits un scellé blob sous un salle clé; le
   récupération point de terminaison retourne il à un authorized holder. Chaque deposit et retrieval
   est écrit à le append-only audit journal (`escrow.deposit` / `escrow.retrieve`).
3. **Vérifier:** confirmer le audit entrée affiche le retrieving opérateur, horodatage, et
   salle — le piste d'audit est le preuve le break-glass était legitimate.
4. **Close:** après utiliser, faire tourner le relevant secret (voir RUNBOOK-clé-Rotation.md) et
   note le break-glass événement dans le incident enregistrement.

## Guardrails
- Séquestre est **opt-in** (`gateway.escrow.enabled`); permettant
  `gateway.escrow.requireForAdmit` fait admission impossible sans un deposited
  clé — uniquement turn ce sur quand votre processus peut actually deposit.
- Le operator/system piste d'audit est **jamais erasable** (GDPR Art.17 cibles données
  personnes concernées, ne pas responsabilité journaux — voir le B-04 durcissement note dans
  Livraison_Rapport.md). Un break-glass événement donc always laisse un trace; que est
  intentional.
- Désactiver séquestre dans high-risk environments où le ajouté récupération surface outweighs
  le disponibilité benefit.
