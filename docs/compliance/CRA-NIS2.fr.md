<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/CRA-NIS2.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Aegis — CRA / NIS2 État de préparation

Mapping de le UE **Cyber Resilience Act (CRA)** et **NIS2 Directive** expectations
à concrete Aegis contrôles. ✅ = implémenté, 🟡 = partial / design-ready,
⏳ = planned.

## Secure-by-design & par défaut (CRA Annexe I.1)
- ✅ **Zéro npm runtime dépendances.** Le cœur noyau est première partie + `node:*` uniquement.
  navigateur modules vendor tiers libraries (PDF.JS, pdf-lib, Tesseract.JS) sous
  `vendor/` directories, et test harnesses utiliser `playwright` — tous listed **honestly**
  dans le CycloneDX SBOM (`scripts/gen-sbom.mjs`). Aucun unsupported/abandoned composants.
- ✅ **Local-first, hors ligne** — aucun obligatoire cloud; données traité in-navigateur.
- ✅ **serveur-blind transfert** — le relais jamais voit fichier octets ou clés.

## Vulnerability handling (CRA Annexe I.2 / NIS2 incident)
- ✅ **piste d'audit** durable dans SQLite; opérateur-facing et append-only (P1).
- 🟡 **Révocation** — local CRL-style deny-list à session admission (P5); un
  coordinated disclosure processus / PSIRT est **ne pas pourtant published** (planned).
- ⏳ **Indépendant pénétration test** — requis avant production allégation.

## Documentation & transparency (CRA Annexe I.3)
- ✅ **SBOM** généré via `npm run` / `scripts/gen-sbom.mjs`.
- ✅ **Menace modèle** (`docs/compliance/THREAT-MODEL.md`).
- 🟡 **sécurité politique** (`SECURITY.md`); **ne pas pourtant** un externe bug-bounty.

## NIS2 governance / supply chain
- 🟡 Single-maintainer ouvert source (Apache-2.0); supply chain est juste Node.js (LTS recommended).
- ⏳ Formal **conformance / EN 301 549 (accessibility)** testing — P7 (WCAG 2.1 AA
  foundations started via le conception système + i18n).

## Honête lacunes (do ne pas over-claim)
1. Aucun tiers pen-test pourtant.
2. Aucun published PSIRT / SLA pour divulgation de vulnérabilités.
3. Accessibility conformance est *foundational*, ne pas *certified*.
4. Le audit journal prouve le serveur *saw* un événement; il fait ne pas par lui-même prouver
   client-side correctness — pair avec le in-navigateur chaîne d'empreintes.

## Language de utilisateur information

sécurité-relevant utilisateur information est fourni à travers le produit UI dans
Anglais, Allemand, French et Spanish. Formal notices à clients sont émis dans
Anglais et Allemand.

## Rôle

Aegis est published as open-source logiciel sous Apache-2.0; le mainteneur
fournit payé support services. Whether un given distribution fait le
mainteneur un "manufacturer" sous le CRA dépend sur le commercial activity
concerned et est assessed par engagement, ne pas asserted ici.
