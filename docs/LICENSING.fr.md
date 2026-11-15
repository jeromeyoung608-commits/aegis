<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/LICENSING.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Aegis Licensing Modèle

## 1. Ouvert source, Apache-2.0

Aegis est **ouvert source**, licencié sous le **Apache licence 2.0** — voir
[`LICENSE`](../LICENSE). Chaque première partie fichier dans ce dépôt est
Apache-2.0. Vous peut utiliser, modify, redistribute et sell le logiciel, y compris
commercially, sans paying anything et sans asking permission.

Le uniquement obligations sont ceux Apache-2.0 lui-même imposes:

- retain le licence et attribution notices (droit d.auteur en-têtes, `Moteur Par
  Jerome Young` footers, and the `Avis` fichier);
- état significant modifications vous faire;
- conserver Apache-2.0's patent octroi et Avis conditions intact quand redistributing.

Le logiciel est gratuit dans chaque sense — aucun payé tier, aucun poste limite, aucun revenue
threshold, et aucun "contact sales" gate. Payé support et services sont facultatif
(voir section 3).

## 2. Pourquoi Apache-2.0 et ne pas MIT

Apache-2.0 porte un **express patent octroi (§3)**: chaque contributor grants un
royalty-free, irrevocable patent licence pour allégations leur contributions cover.
Pour un produit que fait sécurité et forensic-integrity promises, que patent
protection matters more à adopters que MIT's shorter texte. Un Client ne peut pas
être sued au-dessus de un patent que un Aegis contributor pourrait avoir asserted.

Apache-2.0 est également **compatible avec GPLv3** (son conditions sont GPLv3-compatible),
donc Aegis peut être combined dans GPLv3 projects — un autre reason il fits un
open-source sécurité tool better que un custom ou use-restricted licence.

## 3. Où le money comes de

Le logiciel est gratuit. Nous charge pour notre **temps**, as facultatif services:

| Service | Indicative prix |
|---------|------------------|
| déploiement / intégration | EUR 1,500–4,000 |
| conformité état de préparation pack (SBOM / CRA preuve) | EUR 2,000–6,000 |
| SIEM intégration | EUR 1,500–3,500 |
| Annuel support | quoted par engagement |

Un support contrat est **jamais** un precondition pour en utilisant le logiciel. Rien
dans ce dépôt restricts utiliser au-delà Apache-2.0 lui-même.

## 4. Quoi nous do ne pas do

- Nous do ne pas host Client données. Aegis s.exécute dans le Client's propre environnement;
  sensible octets stay dans le navigateur et transport est direct P2P.
- Nous do ne pas operate un SaaS offering.
- Nous do ne pas promise conformité certification. Sous le CRA, le manufacturer /
  integrator placing le produit sur le market porte le conformity
  obligations; notre conformité lots sont preuve matériel, ne pas un certification.
