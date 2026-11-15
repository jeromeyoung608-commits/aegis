<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/blind-relay/README.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# blind-relais — serveur-Blind Texte chiffré relais

> **Terminology**: "aveugle" décrit transport blindness (le relais transmet
> texte chiffré il ne peut pas lire), ne pas un blind-signature scheme et ne pas un
> zéro-connaissance preuve. Voir `docs/CLAIMS-WORDING.md`.

> serveur-blind WebSocket relais pour cross-device synchronisation. Le serveur routes chiffré packets et jamais voit le canvas état.

---

### 1. Quoi il résout
Multi-device synchronisation nécessite un relais, mais beaucoup clients fear WebSockets parce que ils worry le serveur va capture données. Ce module est un **zéro dépendance** relais: il uniquement exécute le WebSocket handshake et transmet **chiffré envelopes** par salle — il jamais déchiffre et jamais voit le canvas état ou document contenu. Paired avec jeton-gate pour admission et blind-relay/client pour de bout en bout enveloppe cryptographie.

### 2. Qui achète ce
B2B needing cross-device collaboration avec un "serveur-blind" exigence: regulated industries, cross-institution cosignature, aucun "relais ne peut pas être trusted" conformité scénario.

### 3. Exécuter dans 60 secondes
```bash
cd modules/blind-relay
node --test                                   # 5 assertions, all green
node src/relay.js --port 8081                 # start the zero-dependency blind relay
# browser demo (shows the server only sees ciphertext): python3 -m http.server 8080
```
Facultatif jeton-gated admission:
```bash
AEGIS_ROOT_PUB=<base64url-SPKI> node src/relay.js --port 8081
```

### 4. Intégration contrat
- **serveur (Node)**: `createRelay({ verifyToken, onObserve })` → `{ listen(port?), address(), getObserved(), close() }`. Inject `verifyToken(token, room)` (par défaut: ouvert; recommend injecting jeton-gate's `verifyToken`).
- **Client (browser/Node)**: `src/ws-lite.js` `connectWs(url, handlers)` (test/tooling); `src/client.js` `connectRelay(url,{token,room,onMessage})` + `encryptEnvelope/decryptEnvelope` (navigateur; également `window.BlindRelayClient`).

### 5. Architecture
```
client A ──E2E-encrypted envelope──▶ relay (forwards ciphertext only, logs what it sees) ──▶ client B
                                     │
                                     ├─ admission: verifyToken(token,room)
                                     └─ blind proof: getObserved() holds only ciphertext
```
Le relais est "aveugle": sur receiving un `data` enveloppe il transmet il verbatim à autres same-room pairs, jamais parsing ou decrypting. Salle état vit uniquement dans actif sockets.

### 6. Garantit & menace modèle
- **serveur aveugle**: le relais contient aucun symmetric clé; il transmet uniquement client-encrypted envelopes; `getObserved()` est auditable preuve il uniquement ever saw texte chiffré.
- **Admission**: quand `verifyToken` est injecté, no/malformed/expired jetons sont rejeté à le hello étape (close + disconnect).
- **Aucun echo**: messages go uniquement à autres same-room pairs, jamais retour à le expéditeur.
- Hors de portée: compromis client, réseau-layer sniffing (clients devrait utiliser HTTPS/WSS), racine private-clé compromission.

### 7. Connu limites
- In-flight frames sur un unique connexion sont traité serially (hello doit arrive avant welcome, alors données); extreme high-volume tiny-frame throughput est ne pas stress-tested.
- Le relais est stateless: salles dissolve avec connections, aucun base de données.
- Ce est un single-process relais; horizontal échelle nécessite salle→relais sharding dans front.

### 8. Vérification
Voir `TEST_REPORT.md`: `node --test` tous vert (5/5), couvrant admission, texte chiffré routage, aveugle preuve, no-echo, et cross-room isolation.

### 9. Mesuré performance
De bout en bout handshake + forward est milliseconds; le suite de 5 cas s.exécute dans ~1.1 s (multiple rél WebSocket tour trips).

### 10. Dépendances
**Un · Pur Zéro**: serveur utilise uniquement Node built-ins `node:http` / `node:crypto`; client utilise uniquement plateforme Web Cryptographie et le navigateur `WebSocket`. 0 npm dépendances, 0 vendor.

### 11. licence
Cohérent avec dépôt licence. Ce module est Aegis's propre implémentation.

### 12. CHANGELOG
- v1.0.0 — zéro dépendance WS relais, jeton admission, blind-visible journal, navigateur démo, et `TEST_REPORT.md`.
