<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/SLA.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Service Niveau Accord (SLA) — Aegis

**Statut:** Émis · **Version:** 1.0 · **Dernier mis à jour:** 2026-11-14
**Modèle:** auto-hébergé / Client-operated (le Client possède le runtime)

## 0. Operational contact

- **SLA contact mailbox:** {{SLA_MAILBOX}}
- **opérateur timezone:** {{SLA_TIMEZONE}}

---

## 1. Portée & responsabilité split

Aegis est livré as **logiciel le Client operates sur son propre infrastructure**.
Donc disponibilité, sauvegarde et incident handling sont le **Client's**
operational responsabilité, supported par le vendor as described ci-dessous.

| Area | Client | Vendor |
|------|----------|--------|
| Host disponibilité / uptime | possède (leur VM/hardware) | — |
| Sauvegarde & restaurer de le runtime volume | possède (procédure fourni) | documents `sqlite3 .backup` + restaurer drill |
| sécurité patching de le OS/runtime | possède | distribue dépendance met à jour + advisories |
| Produit défaut / panne causality | diagnoses avec vendor | fournit fixes par support tier |
| Disponibilité surveillance | possède | expose `GET /healthz` sonde |

## 2. Disponibilité cible (référence)

Pour un single-node auto-hébergé déploiement avec le documenté sauvegarde dans place, le
référence disponibilité objectif est **99.5%** de scheduled uptime par mois
(exclut planned maintenance et Client-side infrastructure faults). Ce est un
**cible**, ne pas un contractual penalty sauf le commercial accord states un.

## 3. support réponse times (référence)

| Priority | Exemple | Réponse objectif |
|----------|---------|-------------------|
| P1 — SEV1 (données perte / violation / exploited vuln) | confirmé violation, coffre-fort corruption | **4 hours** acknowledgement, continuous jusqu.à resolved |
| P2 — SEV2 (major fonctionnalité cassé, aucun données perte) | un module échoue à charge | 1 entreprise jour |
| P3 — SEV3 (degraded) | slow export | 3 entreprise jours |
| P4 — SEV4 (cosmetic/doc) | formulation | prochain version |

## 4. Surveillance

Le vendor supplies un **liveness/readiness sonde**: `GET /healthz` retourne
`{ ok, uptimeSeconds, db, version, ts }` et peut sit derrière un charge balancer. Le
Client wires alerts à il.

## 5. Modification management

Releases sont tagged et reproductible; le livraison paquet est integrity-checked
(`verify:delivery`). Le Client contrôles quand à appliquer met à jour.

## 6. Exclusions

Le vendor fait **ne pas** warrant uptime de Client-owned infrastructure, nor
disponibilité de Client-configured facultatif intégrations (e.g. un tiers
TSA). Force majeure s.applique.

> Note: remplace réponse times, penalties et applicable conditions avec le signé
> accord; juridique revue avant publication.
