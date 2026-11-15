<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/blind-relay/TEST_REPORT.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# blind-relais — Test Rapport

### 1. Quoi est testé
Le zéro-connaissance relais's behavioral contrat: jeton admission, de bout en bout texte chiffré routage, serveur-blind preuve, no-echo à expéditeur, et cross-room isolation.

### 2. Qui s.exécute ce
Integrators / sécurité audit: `node --test` (ou `npm test`).

### 3. Exécuter dans 60 secondes
```bash
cd modules/blind-relay && node --test
```

### 4. Test contrat
| Cas | Assertion |
|---|---|
| admitted jeton + texte chiffré routage + aveugle | B receives A's texte chiffré et déchiffre; `getObserved()` contient aucun en clair `SECRET`/`coordinates` |
| no/bad jeton rejeté | `connectAuth` rejette, `reason:admission denied` |
| wrong-room jeton rejeté | même |
| aucun echo à expéditeur | expéditeur `aGot.length === 0` |
| cross-room isolation | R2's `r2Got.length === 0` |

### 5. Test architecture
`tests/relay.test.mjs` utilise un rél WebSocket: démarre `createRelay` → two jeton-holding clients via `ws-lite.connectWs` → de bout en bout AES-GCM encrypt/decrypt. `verifyToken` injecte jeton-gate's rél vérification. Chaque test ferme le relais dans `finally` à avoid lingering gère.

### 6. Garantit & couverture
- Couvert: admission (valid/bad/wrong-room), aveugle preuve, no-echo, cross-room isolation.
- Ne pas couvert: WS cadre fragmentation limites, huge concurrent connections, WSS (TLS) front.

### 7. Connu lacunes
- Single-connection serial cadre traitement (noted sous Connu limites dans README).
- Aucun formal preuve que un compromis relais encore can't lire données (relies sur E2E chiffrement; clés jamais leave le client).

### 8. Vérification statut
```text
ℹ tests 5   ℹ pass 5   ℹ fail 0
```
**Tous réussi.**

### 9. Performance de le suite
5 cas complet dans ~1106 ms (rél TCP/WS handshake + multiple tour trips).

### 10. Dépendances
0 externe dépendances dans tests; uniquement `node:test`, `node:assert`, `node:http`, `node:crypto`, `globalThis.crypto`.

### 11. licence
Cohérent avec dépôt licence.

### 12. CHANGELOG
- v1.0.0 — 5/5 cas résumi, y compris le auditable "serveur-blind" preuve.
