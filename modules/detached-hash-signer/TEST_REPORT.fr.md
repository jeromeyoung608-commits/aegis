<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/detached-hash-signer/TEST_REPORT.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# detached-empreinte-signataire — Test Rapport

> Vérifiable par machine form, mirroring le 12-chapter structure de le README.

### 1. Quoi est testé
Cœur détaché empreinte signature: empreinte stability, single-sign vérifier, falsification rejet, three-party détaché signature, missing-signature échec, détaché propriété, et malformed entrée rejet.

### 2. Qui s.exécute ce
Integrators avant adoption: `node --test` (ou `npm test`).

### 3. Exécuter dans 60 secondes
```bash
cd modules/detached-hash-signer && node --test
```

### 4. Test contrat
| Cas | Assertion |
|---|---|
| SHA256Hex stable et 64 chars | même entrée → même empreinte, correspond `^[0-9a-f]{64}$` |
| one-byte modification → totally différent empreinte | `hello` vs `hellp` differ |
| unique signataire signe empreinte et vérifie | `verifySignature` retourne vrai |
| altéré signature échoue vérification | flipping premier signature char → faux |
| three-party aveugle sign tous valide | 3 signatures ok, lot `ok:true` |
| missing/wrong signature échoue | faux signature au-dessus de différent empreinte → `ok:false`, `reason:signature-mismatch` |
| lot est détaché (aveugle) | `isDetached` vrai, lot contient aucun document keyword |
| malformed entrée rejeté | non-JSON / manquant signataires → `ok:false` |

### 5. Test architecture
`tests/detached-hash-signer.test.mjs` utilise `node:test` + `node:assert`, pur plateforme Web Cryptographie, aucun mocks, aucun réseau, aucun fichier IO.

### 6. Garantit & couverture
- Couvert: sign/verify, falsification, multipartie, détaché propriété, erreur chemins.
- Ne pas couvert: cross-module assembly (couvert par blind-relay/detached intégration), performance stress.

### 7. Connu lacunes
- Aucun stress test sur very grand documents (>MB); Web Cryptographie gère normal documents sans pressure.
- Aucun chained (ordered) cosignature semantics (actuel est indépendant multi-sign, ne pas chained).

### 8. Vérification statut
```text
ℹ tests 8   ℹ pass 8   ℹ fail 0
```
**Tous réussi.**

### 9. Performance de le suite
8 cas complet dans ~23 ms (Node 26, y compris clé génération et multi-sign).

### 10. Dépendances
0 externe dépendances; uniquement `node:test`, `node:assert`, `globalThis.crypto`.

### 11. licence
Cohérent avec dépôt licence.

### 12. CHANGELOG
- v1.0.0 — 8/8 cas résumi, couvrant le complet detached-sign chemin et le detached-property preuve.
