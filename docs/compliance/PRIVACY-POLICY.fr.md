<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/PRIVACY-POLICY.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Aegis Vie privée Politique

**Statut:** Émis pour signature · **Version:** 1.0 · **Dernier mis à jour:** 2026-11-14
**Produit:** Aegis — Protection de la vie privée Local données Nettoyage Moteur
**S.applique à:** le auto-hébergé Aegis logiciel et son opérateurs (le "Service").

---

## 1. Qui est le responsable du traitement?

Aegis est un **local-first** produit. Dans le standard déploiement le logiciel s.exécute
entirely sur infrastructure vous control (votre serveur, votre machines). Le
**Client** qui operates un Aegis instance est le **données responsable du traitement** pour le
personnel données traité à travers il; le Aegis logiciel acts as le **sous-traitant**
sur le Client's behalf. Quand Aegis est operated par son vendor as un managed
service, le vendor est le responsable du traitement et un séparé responsable du traitement avis s.applique.

Ce politique explique quoi le *logiciel* processes et comment il est configuré à
honour données-protection obligations. Il est ne pas un substitute pour le Client's propre
vie privée avis où le Client determines le purposes de traitement.

## 2. Quoi données est traité

| données | Où il vit | Notes |
|------|---------------|-------|
| Documents / media téléversé pour nettoyage | Client's runtime volume, alors un **encrypted-archive coffre-fort** | Jamais laisse le instance sauf explicitement exporté. |
| Dérivé empreinte / manifests | Même runtime volume | Content-empreinte uniquement; original octets sont ne pas re-transmitted. |
| opérateur & émetteur comptes | SQLite magasin (`accounts`) | Hashed identifiants; aucun en clair passwords. |
| audit événements | SQLite magasin (`audit_events`, empreinte-chained) | Operator/system événements sont **détecteur de falsification et append-only** (voir §6). |
| Facultatif RFC3161 timestamps | Envoyé à un Client-configured TSA | Uniquement un **empreinte** est transmitted, jamais document octets (opt-in, par défaut désactivé). |

Aegis fait **ne pas** phone home, fait ne pas embed tiers analytics, et distribue
avec **zéro réseau sortie** par par défaut.

## 3. Juridique bases (GDPR Art. 6)

- **Contrat (Art. 6(1)(b))** — operating le Service vous requested.
- **Legitimate interests (Art. 6(1)(f))** — sécurité, fraud prevention, et
  maintaining le intégrité de le piste d'audit.
- **Consent (Art. 6(1)(un))** — aucun facultatif intégration (e.g. externe TSA) est
  opt-in et désactivé par par défaut.

## 4. données minimisation & zéro-connaissance

Identité proofs (e.g. le intégré zéro-connaissance identité module) sont conçu
à **prouver attributes sans revealing eux**. Personnel données est traité uniquement
à le étendue requis pour le requested opération et est ne pas utilisé pour secondary
purposes.

## 5. International transferts

Par par défaut là sont **aucun international transferts** — traitement est local. Si un
Client permet le facultatif RFC3161 horodatage adaptateur, un **empreinte** (ne pas
personnel données dans clair) peut être envoyé à un TSA point de terminaison le Client configures;
appropriate transfert mechanisms (SCC) sont le Client's responsabilité.

## 6. Conservation & effacement

- **données personnes concernées** (salles, signataires, fin individuals) peut exercise le droit à
  effacement (GDPR Art. 17). Le Service implémente effacement via son données-subject
  effacement function, lequel deletes le subject's personal-données rows pendant
  retaining un caviardage marker pour responsabilité.
- **opérateur / système audit événements** form un **détecteur de falsification, append-only**
  responsabilité journal et sont **ne pas erasable** — erasing le opérateur's propre trail
  est refused (HTTP 403). Ce est un deliberate forensic-integrity control, ne pas un
  limitation de le effacement droit: il s.applique uniquement à le sécurité piste d'audit,
  jamais à données-subject enregistrements.

## 7. sécurité

- Chiffrement à reste pour le coffre-fort; empreinte-chained audit journal.
- Hashed identifiants; bearer-jeton opérateur auth avec TTL.
- Connexion throttling (par IP et par IP:username) à resist brute force et
  enumeration.
- Aucun externe sortie sans explicite opt-in.

## 8. Votre droits

Accès, rectification, effacement, restriction, portability, et objection
(GDPR Arts. 15–21). Exercise eux à travers le instance opérateur; pour un
vendor-managed instance, contact le DPO ci-dessous.

## 9. Contact & DPO

**données Protection Officer:** {{DPO_Nom}} — `{{DPO_EMAIL}}` ({{DPO_Adresse}}). autorité de contrôle:
{{SUPERVISORY_AUTHORITY}}. Pour vendor-managed instances le DPO est le
point de contact pour le droits ci-dessous.

## 10. Conservation décal

| données | Par défaut conservation | Déclencheur / juridique base |
|------|------------------|----------------------|
| opérateur / émetteur comptes | 30 jours après deactivation, alors deleted | responsable du traitement politique; un caviardage marker uniquement est conservé |
| coffre-fort / encrypted-archive contents | jusqu.à le opérateur deletes eux | local volume; aucun automatic expiration |
| audit événements (operator/system) | 365 jours rolling, alors pruned | détecteur de falsification forensic-integrity journal; **ne pas erasable** (voir §6) |
| Session jetons | TTL-bound (≤ 1 heure); auto-expire | sécurité |
| Documents / media | retiré quand le opérateur deletes eux | local traitement |

## 11. Responding à votre requêtes (GDPR Art. 12(3))

Nous acknowledge requêtes sans undue delay et provide le substantive
information **dans un mois** de receipt (extendable par two further months pour
complex requêtes, avec avis). Requêtes peut être submitted à le DPO (§9).
Acknowledgement modèle:

> **Subject:** Confirmation de receipt — données-protection requête (Aegis)
> Thank vous pour votre requête reçu sur {date}. Nous acknowledge il sous
> GDPR Art. 12(3) et va respond substantively dans un mois. Si nous besoin à
> vérifier votre identité ou extend le deadline, nous va contact vous.

## 12. Cookies & local stockage

Aegis ensembles **aucun HTTP cookies** (vérifié: zéro `Set-Cookie` sur aucun réponse). Le
opérateur console stocke strictly-necessary état uniquement dans le navigateur's
`sessionStorage` — e.g. `sessionStorage['aegis.issuer']` (opérateur session jeton),
le selected onglet, et in-progress form état. Ces sont ne pas tracking cookies,
sont ne pas partagé avec aucun third partie, et sont cleared quand le session ends.
Parce que aucun tracking ou non-essential cookies sont utilisé, aucun cookie-consent bandeau
est requis; ce section documents le position transparently.

## 13. Deutsche Fassung (Zusammenfassung)

Diese Datenschutzerklärung gilt für mourir lokale Aegis-logiciel. Der betreibende
Kunde ist dans der Regel mourir verantwortliche Stelle (responsable du traitement); Aegis ist
Auftragsverarbeiter. Es erfolgt **keine Datenübertragung ins Ausland** ohne
ausdrückliche Option (z. B. optionaler RFC3161-TSA, nur empreinte, kein Dokument).
Betroffene haben mourir Rechte nach Art. 15–21 DSGVO. Eine vollständige
deutschsprachige Fassung ist vor Veröffentlichung durch mourir zuständige Stelle
bereitzustellen und rechtlich prüfen zu lassen.

> Ce document est un modèle. Remplace placeholders, confirmer le controller/processor
> posture pour votre déploiement, et avoir il reviewed par qualifié juridique avant utiliser.
