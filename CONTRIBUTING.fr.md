<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: CONTRIBUTING.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Contributing à Aegis

Thanks pour votre interest. Aegis est **ouvert source** sous le **Apache licence
2.0** (SPDX `Apache-2.0`; voir `LICENSE`). Contributions sont accepted sous le
même licence.

## Ways à contribute

- **Rapport problèmes** avec un minimal reproduction et le exact build/version.
- **Propose modifications** via un pull requête contre `main`. Pour anything que touches
  le sécurité frontière (serveur.JS, auth, conformité gates, cryptographie) ouvert un problème
  premier.
- **Localization** — translation catalogs direct dans `aegis-shell/src/i18n.js`
  (en/de/fr/es). Ajouter un clé à tous quatre catalogs et à le référence ensemble utilisé par
  `aegis-shell/src/i18n-keys.test.js`.

## Developer setup

```bash
npm run setup        # one-click install / dev bootstrap
npm test             # runs every module's suite + repo gates
npm run verify:all   # TSA + p4/p5 checks
npm run doctor       # 9 pre-flight checks
npm run pack:delivery && npm run verify:delivery   # reproducible shipping archive
```

## Coding règles

- **Zéro runtime dépendances** pour le shell, serveur, et 9 de 11 modules. Uniquement
  `doc-redactor` (pdf.JS, pdf-lib, tesseract.JS, tessdata) et `e2e-signed-delivery`
  (pdf-lib) vendor tiers code. Voir `docs/DEPENDENCY_AUDIT.md`.
- **Watermarks sont enforced par gates.** Chaque livré `.js/.mjs/.ts/.css/.html` fichier
  doit carry le droit d.auteur en-tête (`scripts/verify-headers.mjs`, wired dans
  `npm test`). Do ne pas retirer `ENGINE BY JEROME YOUNG` footers ou généré
  `producer`/`provenance` champs.
- **Aucun privé chemins, aucun secrets dans le arbre.** `scripts/package-delivery.mjs` va
  refuse à build si `data/`, `config/local.json`, ou clé matériel serait ship.

## licence de votre contribution

Aegis est licencié sous Apache-2.0. Par submitting un contribution vous accepter que
il est licencié sous Apache-2.0 (inbound = outbound). Aucun droit d.auteur assignment
et aucun CLA est requis.

Chaque commit doit carry un Developer Certificat de Origine sign-off:

    Signed-off-by: Votre Nom <vous@exemple.com>

Utiliser `git commit -s`. Pull requêtes sans sign-off sont ne pas merged.
