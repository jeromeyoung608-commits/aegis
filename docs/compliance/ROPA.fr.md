<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/ROPA.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Enregistrements de Traitement Activities (ROPA)

**Statut:** Émis · **Version:** 1.0 · **Dernier mis à jour:** 2026-11-14
**Base:** GDPR Article 30 · **responsable du traitement:** {{CONTROLLER_Juridique_Nom}} — {{CONTROLLER_Adresse}} — {{CONTROLLER_REG_Aucun}}

Ce enregistrement couvre traitement exécuté par le Aegis local données-cleansing
Service. Un row par traitement activity.

---

## Traitement activity register (Art. 30 — structuré)

| Traitement activity | But | Conservation | Destinataires | Juridique base |
| --- | --- | --- | --- | --- |
| Aegis cœur service | {{ROPA_But}} | {{ROPA_Conservation}} | {{ROPA_Destinataires}} | {{ROPA_Juridique_Base}} |

> Le quatre columns ci-dessus sont le structuré minimum le autorité de contrôle
> expects. Fill eux via le opérateur console (conformité → ROPA section); jusqu.à
> ils sont ensemble, le usine gate bloque issuing le rempli ROPA (HTTP 409 +
> `X-Aegis-Compliance: not-ready`).

---

## Activity Un — document nettoyage & délégation d'empreintes

- **Purposes:** retirer sensible attributes de documents; compute intégrité
  hashes/manifests.
- **Catégories de données personnes concernées:** individuals appearing dans Client documents.
- **Catégories de personnel données:** document contents; dérivé hashes/manifests.
- **Destinataires:** aucun par par défaut (local traitement).
- **Transferts:** aucun (opt-in TSA envoie empreinte uniquement).
- **Conservation:** par responsable du traitement politique; erasable sur requête.
- **Transfert base:** aucun — local traitement; le uniquement facultatif cross-border flux est le TSA empreinte (responsable du traitement responsabilité, SCC).
- **sécurité:** chiffrement à reste; zéro par défaut sortie.

## Activity B — opérateur authentication & accès

- **Purposes:** authenticate operators/issuers; authorise actions.
- **Catégories de données personnes concernées:** Client staff (opérateurs).
- **Catégories de personnel données:** compte identifiers; hashed identifiants;
  session jetons.
- **Destinataires:** aucun externe.
- **Transferts:** aucun.
- **Conservation:** comptes conservé par politique; sessions TTL-bound.
- **Transfert base:** aucun — local traitement.
- **sécurité:** credential délégation d'empreintes; bearer auth avec TTL; connexion throttling.

## Activity C — audit & responsabilité logging

- **Purposes:** maintain un détecteur de falsification, empreinte-chained responsabilité trail.
- **Catégories de données personnes concernées:** opérateurs (as actors dans audit événements).
- **Catégories de personnel données:** action métadonnées, distant adresse, subject.
- **Destinataires:** responsable du traitement (via `/audit/export`).
- **Transferts:** aucun.
- **Conservation:** rolling; **operator/system événements sont détecteur de falsification et
  append-only, et ne pas erasable** (forensic-integrity control).
- **Transfert base:** aucun — local traitement.
- **sécurité:** empreinte-chained journal; export protégé par opérateur portée.

## Activity D — Facultatif RFC3161 timestamping (opt-in)

- **Purposes:** lier cleansed artefacts à un trusted horodatage.
- **Catégories de personnel données:** aucun dans clair — uniquement un **empreinte** est envoyé.
- **Destinataires:** Client-configured TSA point de terminaison.
- **Transferts:** à le configuré TSA (Client responsabilité pour SCC).
- **Conservation:** horodatage receipt stocké avec le artefact.
- **Transfert base:** à le configuré TSA uniquement (Client responsabilité, SCC).
- **sécurité:** outbound désactivé par par défaut (`gateway.externalTsa.enabled=false`).

---

_Terminé ROPA à être signé par le responsable du traitement's DPO et kept available à le
autorité de contrôle._
