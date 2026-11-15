<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/SERVICES-AGREEMENT.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Aegis — support & Services Accord

> Modèle accord. Avoir un qualifié UE attorney revue il — especially le
> responsabilité limitations — avant signature. Ce document governs **payé support
> et services uniquement**.

**Prestataire:** Jerome Young (Yang Jie), AEGIS mainteneur.
**Client:** ⟨juridique entity nom⟩.
**Effective date:** ⟨YYYY-MM-DD⟩.

Ce services accord ("Accord") est entered dans entre le Prestataire et
le Client. Il est accompanied par un Bon de commande, lequel forms partie de il.

## 1. Portée et relation à le logiciel licence

1.1 Le AEGIS logiciel ("le logiciel") est **ouvert source**, licencié sous le
**Apache licence, Version 2.0** (SPDX `Apache-2.0`). Le complet texte est dans
`LICENSE`. Rien dans ce Accord restricts, conditions ou re-licences le
Client's utiliser de le logiciel.

1.2 Le Client peut utiliser, modify, redistribute et sell le logiciel,
y compris commercially, sans paying un licence fee et sans obtaining
permission. Aucun purchase obligation arises de le logiciel's licence.

1.3 Ce Accord couvre uniquement le **services** le Prestataire exécute pour le
Client: déploiement, intégration, durcissement revue, conformité état de préparation lots,
SIEM intégration et support. Le portée de chaque engagement est indiqué dans le
Bon de commande.

1.4 Si le Client a ne pas signé un Bon de commande, aucun services sont engaged et
aucun obligation arises sous ce Accord.

## 2. Services

2.1 Le Prestataire exécute le services listed dans le Bon de commande §2 avec
reasonable skill et care, dans accordance avec le reception critères dans §4.

2.2 Services sont fourni **remotely par par défaut**. On-site work exige un
séparé statement de work.

2.3 Le Prestataire peut utiliser subcontractors pour non-specialist work (e.g. hosting
ou translation), restant responsable pour leur performance.

2.4 **Modification control.** Work outside le agreed portée est quoted separately et
begins uniquement après écrit approbation. Le Prestataire peut stop work que exceeds le
agreed portée jusqu.à le modification est approved.

## 3. Client obligations

3.1 Le Client fournit un technically competent contact, timely accès à le
cible environnement, et le information et identifiants requis pour le
engagement.

3.2 Le Client est responsable pour le juridique et contractual base sur lequel il
processes documents et personnel données. **Le Prestataire fait ne pas host Client
données** et fait ne pas processus document contenu sur le Client's behalf.

3.3 Le Client conserve un sauvegarde avant chaque engagement étape que modifies
persistent état.

## 4. Livrables et reception

4.1 Chaque engagement produces écrit livrables: un déploiement enregistrement, un
hardening-review rapport, un conformité état de préparation pack (SBOM + preuve index),
ou un support summary — as indiqué dans le Bon de commande.

4.2 Le Client a **10 entreprise jours** de livraison à accept un deliverable
ou give écrit avis de specific non-conformity. Un deliverable est accepted si
aucun avis est reçu dans que période.

4.3 Si un deliverable fait ne pas conform, le Prestataire re-performs le affected
work dans un reasonable période. Si il encore fait ne pas conform, le Client's
sole remedy pour que deliverable est un proportionate reduction de le fee pour
le affected élément.

4.4 Le handover de un déploiement follows
[`docs/DEPLOYMENT-DELIVERY-CHECKLIST.md`](./DEPLOYMENT-DELIVERY-CHECKLIST.md),
lequel les deux parties sign désactivé.

## 5. Fees, invoicing et renouvellement

5.1 Fees sont ceux dans le Bon de commande, net de VAT et excluding le taxes,
duties et levies le Client doit pay.

5.2 Invoices sont émis as indiqué dans le Bon de commande et sont payable dans 30
jours. Late payment au-delà 30 jours, après écrit avis, suspends support
services. Le Prestataire peut invoice pour work déjà exécuté.

5.3 **Renouvellement (§307 BGB — attorney revue requis).** Où le Bon de commande
selects auto-renewal: le terme fait ne pas renew silencieusement. Le Prestataire gives
écrit avis de le upcoming renouvellement **60 jours** avant terme fin; le
Client peut terminate avec effect à terme fin sur **30 days' avis**. Prix
contient pour le committed terme. Aucun prix modification à renouvellement est limité à le
modification dans le Allemand CPI (Verbraucherpreisindex) au-dessus de le prior 12 months,
appliqué par un indiqué formula, et le Client peut terminate plutôt de
accepting il. Avoid "nous peut modification prix à aucun temps" formulation — tels un clause
est generally invalid as un unreasonable standard-term disadvantage sous §307
BGB.

5.4 Expenses sont charged à coût où le Bon de commande says donc, et sont jamais
marketed up.

## 6. support et service levels

6.1 Réponse cibles par severity sont ceux dans le Bon de commande §4. Un cible est un
réponse temps, ne pas un resolution temps, sauf expressly indiqué sinon.

6.2 support couvre le deployed version de le logiciel et le configurations
livré sous ce engagement. support pour tiers composants est fourni
à le étendue le Prestataire peut influence il; le Client reste responsable
pour licensing et support de ceux composants sous leur propre conditions.

6.3 Le Prestataire peut suspend support pour un sustained sécurité problème dans le
Client's environnement où continued opération serait expose le Prestataire's
autres clients; le Prestataire gives avis et atténue où practicable.

## 7. Confidentiality

7.1 Chaque partie conserve le other's non-public information confidential, utilise il
uniquement pour ce engagement, et protects il à au moins à le même standard il
s.applique à son propre confidential information de que type.

7.2 Le obligation survive résiliation pour trois years.

7.3 Ces obligations do ne pas appliquer à information que est public, independently
developed, lawfully reçu de un third partie, ou requis à être disclosed par
loi (où le disclosing partie gives prompt avis où lawful).

7.4 **Client données traité pendant un déploiement reste le Client's données.**
Le Prestataire fait ne pas host il et fait ne pas retain copies après le engagement
sauf agreed dans writing.

## 8. Intellectual propriété et marque

8.1 Le logiciel, y compris son documentation, reste licencié sous
Apache-2.0. Le Prestataire grants aucun additional intellectual-property droits dans
le logiciel au-delà que licence.

8.2 Livrables produit specifically pour le Client dans le course de un
engagement sont fourni à le Client sous le Apache-2.0 licence, à le
étendue ils contenir Prestataire matériel. Le Prestataire peut reuse general
know-how, methods et non-Client-specific composants.

8.3 Le Prestataire conserve tous droits dans le AEGIS nom, logo et le
"Moteur Par Jerome Young" attribution mark. Le Apache-2.0 licence grants aucun
marque droits. Le Client peut état factually que un déploiement est "based
sur Aegis" ou "powered par Aegis", fourni le attribution notices requis par
Apache-2.0 sont conservé.

8.4 Neither partie peut utiliser le other's marques dans un way que suggests endorsement.

## 9. Warranties et responsabilité

9.1 Le logiciel et le services sont fourni "AS Est", sans garantie de aucun
type, à le maximum étendue permitted par loi.

9.2 Le Prestataire warrants que il va perform le services avec reasonable
skill et care, et que livrables va materially conform à le
reception critères dans §4 pour 30 jours après livraison.

9.3 À le maximum étendue permitted par loi, le Prestataire est **ne pas liable** pour
indirect, incidental, special ou consequential damages, ou pour perte de profit,
revenue, données ou entreprise interruption, arising de le logiciel ou le
services.

9.4 Le Prestataire's aggregate responsabilité sous ce Accord est limité à le
cap indiqué dans le Bon de commande / exécuté décal pour le applicable engagement.

9.5 Rien dans ce clause limites responsabilité que ne peut pas être excluded par
applicable loi (intent, gross negligence, death ou personnel injury caused par
negligence, produit responsabilité sous ProdHaftG, fraud, ou le simple-negligence
violation de un cardinal obligation — le latter limité à typical foreseeable
perte).

## 10. Terme et résiliation

10.1 Ce Accord s.exécute pour le terme indiqué dans le Bon de commande et terminates
sur completion de le services ou expiration de que terme.

10.2 Either partie peut terminate pour matériel violation avec un 14-jour cure période.
Le Prestataire peut suspend services pour non-payment après écrit avis et un
14-jour cure période.

10.3 Sur résiliation le Prestataire délivre le work dans progress et le
livrables produit, et le Client pays pour services exécuté up à que
date.

10.4 Résiliation fait ne pas affect le Client's droits sous le Apache-2.0
licence à le logiciel, nor §§7 (confidentiality), 9 (responsabilité) ou 11
(applicable loi).

## 11. Applicable loi et disputes

11.1 Ce Accord est governed par le laws de le Federal Republic de Germany,
excluding son conflict-of-laws règles et le UN CISG.

11.2 Le courts de le Prestataire's enregistré poste avoir exclusive jurisdiction,
sauf obligatoire local consumer ou données-protection loi fournit sinon.

11.3 Le parties va attempt à resolve aucun dispute par good-faith negotiation
dans 30 jours de écrit avis de le dispute, avant commencing proceedings.

## 12. General

12.1 Ce Accord et son Bon de commande sont le entire accord entre le
parties sur leur subject matter et supersede earlier discussions.

12.2 Amendments doit être dans writing et signé par les deux parties.

12.3 Si un provision est unenforceable, il est modifié à le minimum étendue
necessary; le reste reste dans force.

12.4 Neither partie peut assign ce Accord sans le other's prior écrit
consent, except à un successor dans un entreprise transfert de substantially tous
actifs.

12.5 Le Prestataire peut référence le Client as un référence Client, avec le
Client's écrit approbation de le formulation, sauf le Client objects.

## 13. Signatures

| | Prestataire | Client |
|---|---|---|
| Nom | Jerome Young (Yang Jie) | ⟨nom⟩ |
| Title | mainteneur | ⟨title⟩ |
| signature | | |
| Date | | |

---

*Ce est un commercial-structure modèle, ne pas juridique advice. Avoir un qualifié
German/EU attorney revue il avant signature.*
