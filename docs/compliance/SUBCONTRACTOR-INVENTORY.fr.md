<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/SUBCONTRACTOR-INVENTORY.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Sub-sous-traitant & Tiers Inventory

**Statut:** Émis · **Version:** 1.0 · **Dernier mis à jour:** 2026-11-14
**Produit:** Aegis — Protection de la vie privée Local données Nettoyage Moteur
**Base:** GDPR Art. 28(2) / SOC 2 CC9 — know et document chaque externe partie
que peut touch personnel données.

---

## 1. Runtime sub-processors: Aucun (par conception)

Aegis s.exécute **entièrement localement** avec **zéro obligatoire réseau sortie**. Hors de le
box il:

- fait **aucun outbound appels** à aucun vendor;
- embeds **aucun tiers analytics, telemetry, ou SaaS SDK**;
- distribue son dépendances as **embarqué, hashed libraries** à l.íntérieur le paquet
  (voir `dist/sbom.cdx.json` et `verify:delivery` intégrité vérifier) — ces sont
  compiled-in, ne pas distant services.

Donc là est **aucun runtime sub-sous-traitant** requiring un séparé DPA au-delà
le Aegis DPA lui-même.

## 2. Facultatif intégrations (Client-configured, Client-controlled)

| Intégration | Quand actif | données envoyé | Partie |
|-------------|-------------|-----------|-------|
| RFC3161 Horodatage Authority | uniquement si `gateway.externalTsa.enabled=true` | un **empreinte uniquement** (jamais document octets) | Client-chosen TSA point de terminaison |
| SCIM / OIDC IdP | uniquement si SCIM/OIDC configuré | compte attributes | Client's IdP |

Chaque est **opt-in et désactivé par par défaut**. Le Client est le responsable du traitement de aucun
transfert et est responsable pour le transfert mécanisme (e.g. SCC) pour le TSA.

## 3. Embarqué libraries (bundled, ne pas sub-processors)

Le few tiers libs (e.g. `pdf-lib`) sont **embarqué sous
`modules/*/vendor/`**, identique à l.octet à travers copies, et enregistré dans le SBOM avec
leur licenses et SHA-256. Ils execute in-process; ils sont **ne pas** externe
services et do ne pas recevoir données.

## 4. Revue cadence

Re-confirm ce inventory sur chaque version et à chaque Client onboarding: le
ensemble de facultatif sortie points doit rester exactement le two ci-dessus, et les deux désactivé par
par défaut.
