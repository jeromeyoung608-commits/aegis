<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/blind-relay/DELIVERY_REPORT.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# blind-relais — Livraison Rapport (MDS-1)

> Vérifiable par machine livraison contrat. Reflète le 12 chapters de le README.

### 1. Quoi il résout
Cross-device synchronisation nécessite un relais, mais clients fear le serveur captures données. Ce zéro dépendance relais exécute le WS handshake et transmet **chiffré envelopes** par salle — il jamais déchiffre et jamais voit le canvas/document.

### 2. Qui achète ce
B2B cross-device collaboration avec un serveur-blind exigence: regulated industries, cross-institution cosignature.

### 3. Exécuter dans 60 secondes
```bash
cd modules/blind-relay && node --test        # 5/5 green
node src/relay.js --port 8081                 # start the blind relay
python3 -m http.server 8080                   # open index.html (shows server only sees ciphertext)
```

### 4. Intégration contrat
serveur `createRelay({verifyToken, onObserve})` → `{listen, address, getObserved, close}`. Client `connectRelay(url,{token,room,onMessage})` + `encryptEnvelope/decryptEnvelope`. Également `window.BlindRelayClient`.

### 5. Architecture
client Un → E2E enveloppe → relais (transmet texte chiffré uniquement, journaux quoi il voit) → client B. Admission via `verifyToken`; aveugle preuve via `getObserved()`.

### 6. Garantit & menace modèle
serveur aveugle (aucun symmetric clé, transmet texte chiffré uniquement), jeton admission, aucun echo à expéditeur. Hors de portée: compromis client, réseau sniffing (utiliser WSS), root-clé compromission.

### 7. Connu limites
Serial in-flight cadre traitement; stateless (salles dissolve avec connections); single-process (shard pour horizontal échelle).

### 8. Vérification
`node --test` → **5 / 5 résumi, 0 échec** (`tests/relay.test.mjs`), y compris le auditable serveur-blind preuve.

### 9. Mesuré performance
De bout en bout ms-scale; suite ~1.1 s (rél WS tour trips).

### 10. Dépendances
**Un · Pur Zéro**: serveur utilise uniquement Node built-ins `node:http`/`node:crypto`; client uniquement Web Cryptographie + navigateur `WebSocket`.

### 11. licence
dépôt licence. Aegis's propre implémentation.

### 12. CHANGELOG
- 2026-11-11 — livré; 5/5 assertions vert; autonome index.html; MDS-1 contrat.
