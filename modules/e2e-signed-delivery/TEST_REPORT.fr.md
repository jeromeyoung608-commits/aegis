<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/e2e-signed-delivery/TEST_REPORT.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# e2e-signed-delivery — Test Rapport

> Vérifiable par machine form mirroring le 12-chapter README.

### 1. Quoi est testé
De bout en bout artefact assembly et vérification: document packaging, multi-signataire trailer, empreinte-chain intégrité, signature vérification, falsification détection, et le parse/verify tour déclenchement.

### 2. Qui s.exécute ce
Integrators / sécurité audit: `node --test` (ou `npm test`).

### 3. Exécuter dans 60 secondes
```bash
cd modules/e2e-signed-delivery && node --test
```

### 4. Test contrat
| Cas | Assertion |
|---|---|
| assemble + vérifier tour déclenchement | produit artefact vérifie `ok:true` |
| multi-signataire trailer | tous `trailer.signers` validate |
| empreinte-chain intégrité | tampering avec aucun lien échoue vérifier |
| altéré signature | `ok:false`, reason ensemble |
| analyse / vérifier separation | `parseArtifact` retourne docBytes + trailer |

### 5. Test architecture
`tests/*.test.mjs` en utilisant `node:test` + `node:assert`, pur Web Cryptographie, aucun réseau. Le heavy browser/Playwright flux est ignoré dans CI (aucun navigateur), donc le suite reste déterministe et fast.

### 6. Garantit & couverture
- Couvert: assemble, vérifier, chain intégrité, falsification, multi-signataire.
- Ne pas couvert ici: le visuel navigateur flux (ignoré sans un navigateur), large-file stress.

### 7. Connu lacunes
- Playwright-driven UI flux est protégé derrière un navigateur disponibilité vérifier et ignoré sinon.

### 8. Vérification statut
```text
ℹ tests 14   ℹ pass 14   ℹ fail 0
```
**Tous réussi.**

### 9. Performance de le suite
~683 ms (Node 26), déterministe.

### 10. Dépendances
0 externe test dépendances; `node:test`, `node:assert`, `globalThis.crypto`. Première partie code est **Un · Pur Zéro** (embarqué pdf-lib via import carte uniquement).

### 11. licence
dépôt licence. Embarqué pdf-lib conserve son propre MIT licence.

### 12. CHANGELOG
- 2026-11-11 — vérifié 14/14 vert; Test_Rapport livré.
