<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/DATA-RESIDENCY.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# données Residency & Transfert Position — Aegis

**Statut:** Émis · **Version:** 1.0 · **Dernier mis à jour:** 2026-11-14
**Produit:** Aegis — Protection de la vie privée Local données Nettoyage Moteur

---

## 1. Principle: données reste où vous exécuter il

Aegis est **local-first**. Par par défaut **tous** personnel données — documents, dérivé
empreinte, manifests, opérateur comptes et audit événements — est stocké sur le
Client's propre runtime volume (`data/aegis.db`, le encrypted-archive coffre-fort, et
`~/.aegis/tls`). Le vendor jamais receives il.

## 2. Par défaut réseau posture — zéro sortie

Le shipping build fait **aucun outbound réseau appels** sauf un facultatif
intégration est explicitement activé. Ce est vérifié par le project's
zéro dépendance gate, lequel échoue le build si aucun module exécute outbound I/O.
Aucun telemetry, aucun analytics, aucun SaaS callbacks.

## 3. Facultatif intégrations (Client-controlled, désactivé par par défaut)

| Intégration | Quand actif | données envoyé | Cross-border consideration |
|-------------|-----------|----------|---------------------------|
| RFC3161 Horodatage Authority | uniquement si `gateway.externalTsa.enabled=true` | un **empreinte uniquement** (jamais document octets) | le Client's chosen TSA point de terminaison; Client possède le transfert mécanisme (e.g. SCC) |

Là est **aucun autres** externe sortie. SCIM/OIDC (si activé) talks uniquement à le
Client's propre identité Prestataire.

## 4. International transferts (GDPR Chapter V)

- **Par défaut:** aucun. Traitement est local à le jurisdiction où le instance
  s.exécute.
- **Facultatif TSA:** uniquement un empreinte laisse le instance. Parce que un cryptographique empreinte
  de un document est generally ne pas personnel données dans clair, et le point de terminaison est
  Client-selected, le transfert mécanisme (SCC / adequacy) est le Client's
  responsabilité. document le TSA point de terminaison et son emplacement dans le ROPA.
- **Vendor support channels:** aucun support interaction est governed par le support
  accord; aucun produit données est transmitted à le vendor sauf le Client
  chooses à partager il.

## 5. Residency attestation pour clients

Clients subject à données-residency requirements peut attester, en utilisant ce document
et le `verify:zero-deps` preuve, que aucun personnel données laisse leur perimeter
dans le par défaut configuration. Enable uniquement le intégrations whose transfert base
vous avoir authorised.

déploiement region et aucun mandated local-sous-traitant clauses sont specified dans le
Bon de commande pour chaque engagement.
