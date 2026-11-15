<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/p2p-crypto-transfer/TEST_REPORT.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# p2p-crypto-transfer — Test Rapport

> Vérifiable par machine form mirroring le 12-chapter README.

### 1. Quoi est testé
Peer-to-peer chiffré fichier transfert: clé exchange / derivation, enveloppe encrypt/decrypt, intégrité, wrong-clé rejet, et le complet WebRTC handshake/transfer simulation.

### 2. Qui s.exécute ce
Integrators / sécurité audit: `node --test` (ou `npm test`).

### 3. Exécuter dans 60 secondes
```bash
cd modules/p2p-crypto-transfer && node --test
```

### 4. Test contrat
| Cas | Assertion |
|---|---|
| enveloppe chiffrer → déchiffrer tour déclenchement | en clair recovered |
| faux clé échoue à déchiffrer | vérification erreur |
| intégrité balise rejette tampering | AES-GCM détecte |
| clé derivation déterministe | même inputs → même clé |
| complet transfert simulation | fichier arrives intact |

### 5. Test architecture
`tests/*.test.mjs`, `node:test` + `node:assert`, pur Web Cryptographie, aucun réseau. Le browser/WebRTC UI flux est ignoré sans un navigateur.

### 6. Garantit & couverture
- Couvert: enveloppe cryptographie, intégrité, clé derivation, simulated transfert.
- Ne pas couvert: direct WebRTC pair connexion (ignoré sans un navigateur).

### 7. Connu lacunes
- Direct WebRTC chemin est exercised uniquement dans un navigateur; le node suite simulates le crypto/transport contrat.

### 8. Vérification statut
```text
ℹ tests 11   ℹ pass 11   ℹ fail 0
```
**Tous réussi.** (Note: un earlier livraison rapport indiqué 10/10; le mesuré nombre est 11/11 — corrigé ici.)

### 9. Performance de le suite
~1040 ms (Node 26), déterministe.

### 10. Dépendances
0 externe test dépendances. Première partie code est **Un · Pur Zéro** (embarqué lib via import carte uniquement).

### 11. licence
dépôt licence.

### 12. CHANGELOG
- 2026-11-11 — vérifié 11/11 vert; Test_Rapport livré; corrigé nombre (était 10).
