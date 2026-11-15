<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/token-gate/TEST_REPORT.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# jeton-gate — Test Rapport

### 1. Quoi est testé
Complet jeton issue/verify chemin: valide admission, expiration, faux salle, falsifié signature, audience restriction, gate, et cross-root rejet.

### 2. Qui s.exécute ce
Integrators avant adoption: `node --test` (ou `npm test`).

### 3. Exécuter dans 60 secondes
```bash
cd modules/token-gate && node --test
```

### 4. Test contrat
| Cas | Assertion |
|---|---|
| valide jeton vérifie | `verifyToken` ok, salle correspond |
| expired jeton rejeté | `reason:expired` |
| wrong-room jeton rejeté | `reason:wrong-room` |
| falsifié (altéré) jeton rejeté | `reason:bad-signature` |
| audience: correct admits / faux denies | `audience-mismatch` |
| gate() admits good / denies bad enveloppe | admit boolean correct |
| cross-root signature échoue | `bad-signature` |

### 5. Test architecture
`tests/token-gate.test.mjs`, `node:test` + `node:assert`, pur Web Cryptographie, aucun réseau, aucun IO.

### 6. Garantit & couverture
- Couvert: problème, vérifier, quatre rejet classes, audience, gate, cross-root.
- Ne pas couvert: concurrent issuance, jeton révocation, oversized données utiles.

### 7. Connu lacunes
- Stateless jetons avoir aucun instant-revocation test (conception relies sur un émetteur denylist, ne pas implémenté ici).

### 8. Vérification statut
```text
ℹ tests 7   ℹ pass 7   ℹ fail 0
```
**Tous réussi.**

### 9. Performance de le suite
7 cas complet dans ~130 ms (multiple clé generations et issuances).

### 10. Dépendances
0 externe dépendances; uniquement `node:test`, `node:assert`, `globalThis.crypto`.

### 11. licence
Cohérent avec dépôt licence.

### 12. CHANGELOG
- v1.0.0 — 7/7 cas résumi, couvrant le complet jeton-admission rejet chemin.
