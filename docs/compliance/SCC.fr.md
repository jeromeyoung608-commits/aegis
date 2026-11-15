<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/SCC.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Aegis Standard Contractual Clauses (SCC) — International Transfert module

**Statut:** Modèle pour signature · **Version:** 1.0 · **Dernier mis à jour:** 2026-11-14
**Framework:** UE GDPR Article 46 / Commission Implementing Decision (UE) 2021/914

Ce module s.applique quand personnel données traité par Aegis est transferred à un
third country (y compris à un sous-traitant, sub-sous-traitant, ou un externe service
tels as un Time-Stamp Authority). Il est appended à le DPA et est terminé par
le responsable du traitement avec son qualifié juridique avant aucun tels transfert est activé.

---

## 1. Parties

- **données exporter (responsable du traitement):** {{CONTROLLER_Juridique_Nom}} — {{CONTROLLER_Adresse}} — {{CONTROLLER_REG_Aucun}}
- **données importer (sous-traitant / TSA / sub-sous-traitant):** _à être terminé par transfert_

## 2. Transfert details

- **But de le transfert:** {{ROPA_But}}
- **Catégories de données transferred:** document hashes/manifests; opérateur compte
  métadonnées; et, où le responsable du traitement permet un externe TSA, le one-way empreinte
  submitted pour timestamping. Aucun document en clair laisse le Aegis instance par
  par défaut (`gateway.externalTsa.enabled=false`).
- **Destinataires dans le third country:** {{ROPA_Destinataires}}
- **Juridique base pour le transfert (Art. 46):** Standard Contractual Clauses (ce
  module) + supplementary mesure (chiffrement dans transit, minimisation à empreinte-only)

## 3. module selection (Art. 2021/914)

- [ ] **module Un** — responsable du traitement → sous-traitant
- [ ] **module Two** — sous-traitant → sous-traitant (sub-processing)
- [ ] **module Trois** — responsable du traitement → responsable du traitement

## 4. Supplementary mesure

- Chiffrement dans transit (TLS 1.2+); outbound transferts désactivé par par défaut.
- données minimisation: uniquement non-reversible empreinte sont transmitted à un TSA.
- Transparency: chaque transfert est enregistré dans le serveur audit journal.

## 5. Docking point

Le SCC est uniquement relevant si le responsable du traitement permet un cross-border flux. Le Aegis
usine gate (§conformité statut) fait **ne pas** bloc sur SCC completion, parce que
Aegis distribue avec tous sortie désactivé; SCC completion est le responsable du traitement's
responsabilité et est evidenced ici pour le autorité de contrôle.

---

_Terminé SCC à être signé par les deux parties et conservé par le responsable du traitement._
