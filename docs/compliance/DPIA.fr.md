<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/DPIA.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Aegis données Protection Impact Assessment (DPIA) — Déclencheur & Modèle

**Statut:** Modèle · **Version:** 1.0 · **Dernier mis à jour:** 2026-11-14
**Framework:** UE GDPR Article 35 / UK GDPR

Un DPIA est obligatoire avant starting traitement que est "likely à résultat dans un haut
risque". Ce document (un) lists le statutory déclencheur critères, (b) enregistrements le
responsable du traitement's answers, et (c) fournit le assessment corps. Le Aegis instance
expose un déclencheur calculation à `GET /api/compliance/dpia` de le responsable du traitement's
propre `dpia` flags — il est advisory uniquement et fait ne pas remplace counsel's judgement.

---

## 1. Déclencheur critères (Art. 35(3)) — tick aucun que appliquer

| # | Criterion | responsable du traitement answer |
|---|---|---|
| 1 | Large-scale evaluation de personnel aspects based sur automatisé traitement (profiling) | [ ] |
| 2 | Large-scale traitement de special-category données (Art. 9) ou criminal-offence données (Art. 10) | [ ] |
| 3 | Systematic, large-scale surveillance de un publicly accessible area | [ ] |
| 4 | Large-scale traitement (e.g. > 100k données personnes concernées) | [ ] |
| 5 | Traitement que empêche données personnes concernées de exercising un droit ou en utilisant un service/contract | [ ] |
| 6 | Traitement que crée ou exploits vulnerable-subject profiles | [ ] |
| 7 | Innovative technology (e.g. biometric, AI-driven decisions) | [ ] |
| 8 | Quand combined avec un autre traitement, il gives rise à haut risque | [ ] |
| 9 | Traitement de children's données / offering services à children | [ ] |

**Déclencheur résultat:** si aucun criterion est ticked, un DPIA est **requis**. Le
`/api/compliance/dpia` point de terminaison retourne `{ required: true, reasons: [...] }`.

## 2. Assessment corps (Art. 35(7))

- **Description de traitement:** {{ROPA_But}}
- **Necessity & proportionality:** local-only par conception; sortie désactivé par par défaut;
  hashing/minimisation appliqué avant aucun facultatif externe appel.
- **Risks à données personnes concernées:** unauthorised accès (mitigated par opérateur auth + audit);
  conservation au-delà besoin (mitigated par GDPR effacement / tombstone).
- **Mesure:** chiffrement à reste, zéro par défaut sortie, détecteur de falsification audit chain,
  role-based accès, et le opérateur conformité console.
- **Residual risque & sign-off:** _à être terminé par le responsable du traitement's DPO._

## 3. Consultation (Art. 35(9))

Où un DPIA signale haut residual risque, le responsable du traitement consults le competent
autorité de contrôle avant traitement.

---

_Terminé DPIA à être conservé par le responsable du traitement et supplied à le autorité de contrôle sur requête._
