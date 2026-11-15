<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/ORDER-FORM-TEMPLATE.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Aegis — Bon de commande (modèle)

> Modèle uniquement. Avoir juridique revue avant utiliser. Ce form accompanies le
> **Aegis Payé support & Services Conditions** ([`COMMERCIAL-LICENSE.md`](../COMMERCIAL-LICENSE.md))
> et le complet accord ([`docs/SERVICES-AGREEMENT.md`](./SERVICES-AGREEMENT.md)).

Le Aegis **logiciel est ouvert source sous Apache-2.0** — ce form couvre payé
support et services uniquement. Aucun licence fee est due; aucun purchase obligation
existe pour en cours d.exécution le logiciel.

---

## 1. Parties

| | |
|---|---|
| **Prestataire** | Jerome Young (Yang Jie), AEGIS mainteneur — adresse par `SECURITY.md` / `.well-known/security.txt` |
| **Client** | ⟨juridique entity nom⟩ |
| **Enregistré adresse** | ⟨adresse⟩ |
| **Country / VAT ID** | ⟨country⟩ / ⟨VAT ID⟩ |
| **Client contact** | ⟨nom, rôle, e-mail, phone⟩ |
| **Technical contact** | ⟨nom, rôle, e-mail, phone⟩ — day-to-day livraison contact |

## 2. Services ordered

Select un plan; le portée ci-dessous reflète [`PRICING.md`](../PRICING.md). Couverture
est expressed as deployments et services inclus — **ne pas** un poste nombre, et il
fait ne pas limite comment beaucoup opérateurs utiliser le logiciel.

| Plan | Couverture | Annuel fee (net, ex-VAT) | Réponse cible | Selected |
|---|---|---|---|---|
| Starter | 1 équipe / 1 déploiement | €4,900 | best-effort / community | ☐ |
| Entreprise | up à 5 deployments | €24,000 | 2 entreprise jours | ☐ |
| Entreprise | unlimited | €75,000+ (quoted) | 4h Sev-1 / 1d Sev-2 | ☐ |

### 2.1 Inclus livrables

☐ déploiement & intégration (environnement, module wiring, one-click installer)
☐ Durcissement revue (CSP / COOP-COEP / clé handling / scellage configuration)
☐ conformité état de préparation pack — SBOM + CRA preuve matériel
☐ SIEM intégration (journal forwarding)
☐ Annuel support (voir §4)
☐ conformité lots par an: ⟨n⟩  ☐ Extra pack: quoted

### 2.2 Explicitement ne pas inclus

- Tiers pénétration test ou ACR/CRA attestation — engagement-specific, quoted separately.
- German-language localisation de conformité modèles au-delà quoi distribue dans le produit.
- Custom produit development au-delà le portée ci-dessus (available as un separately
  scoped statement de work).

## 3. Fees et payment

| | |
|---|---|
| Annuel service fee | € ⟨amount⟩ (net, exclusive de VAT) |
| One-off onboarding fee | € ⟨amount⟩ ☐ aucun |
| Billing frequency | ☐ annuel dans advance ☐ monthly ☐ par milestone (SOW) |
| Payment conditions | 30 jours de invoice date |
| Currency | EUR |

Prix hold pour le committed terme. Renouvellement et price-change handling follow
§5 de le services accord (Allemand CPI-linked cap, 60-jour advance avis, 30-jour
résiliation droit).

## 4. support et service levels

| Severity | Definition | Réponse cible (plan) |
|---|---|---|
| Sev-1 | Produit unusable ou preuve chain cassé | ⟨par plan⟩ |
| Sev-2 | Major fonctionnalité degraded, aucun données perte | ⟨par plan⟩ |
| Sev-3 | Minor défaut ou question | ⟨par plan⟩ |
| Sev-4 | Fonctionnalité requête / advisory | prochain planned version |

Escalation chemin et on-call arrangements (Entreprise uniquement): ⟨fill⟩.

## 5. Terme

| | |
|---|---|
| Démarrage date | ⟨YYYY-MM-DD⟩ |
| Initial terme | 12 months ☐ ⟨n⟩ months |
| Auto-renewal | ☐ oui ☐ aucun — si oui, voir §5 de le services accord |

## 6. Commercial et juridique conditions

1. Le **Aegis logiciel est licencié sous Apache-2.0** (SPDX `Apache-2.0`) —
   voir [`LICENSE`](../LICENSE). Le Client peut utiliser, modify, redistribute et
   sell il, y compris commercially, sans paying un licence fee.
2. Ce Bon de commande governs **services uniquement**, sous le
   [services accord](./SERVICES-AGREEMENT.md).
3. Responsabilité est capped as indiqué dans le services accord; le cap amount est
   enregistré dans un exécuté décal: € ⟨amount ou "as indiqué dans le exécuté décal">⟩.
4. Le Client conserve tous droits sous Apache-2.0. Aucun marque droits sont
   granted; voir [`TRADEMARK.md`](../TRADEMARK.md).
5. données handling: le Prestataire fait ne pas host Client données. déploiement et
   support work est exécuté sur le Client's infrastructure ou sous le
   Client's control. Voir §8 de le services accord.
6. Prestataire invoices et livraison rapports sont fourni as **PDF avec un SHA256
   empreinte**; le Client peut publish le empreinte.

## 7. Signatures

| | Prestataire | Client |
|---|---|---|
| Nom | Jerome Young (Yang Jie) | ⟨nom⟩ |
| Title | mainteneur | ⟨title⟩ |
| signature | | |
| Date | | |

---

*Non-binding jusqu.à signé par les deux parties. Prix shown sont liste prix et peut
être adjusted pour portée; voir `PRICING.md` pour le indicative structure.*
