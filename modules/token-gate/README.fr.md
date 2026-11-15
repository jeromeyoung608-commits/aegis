<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/token-gate/README.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# jeton-gate — jeton-Gated Salles (ECDSA Salle Jetons)

> ECDSA jeton-gated WebRTC / collaboration salles. Uniquement vérifié clé-holders peut entrer le cosignature session.

---

### 1. Quoi il résout
En clair WebRTC / collaboration liens sont "whoever a le URL joins" — fatal dans B2B. Ce module problèmes short-lived, ECDSA (P-256) signé jetons bound à un salle id et un facultatif audience (un specific approver public clé). Le relay/server vérifie le jeton signature avec un racine public clé et admits Uniquement vérifié clé-holders. Le serveur jamais learns qui un person est — il uniquement valide cryptography.

### 2. Qui achète ce
Équipes needing trusted admission collaboration: multipartie cosignature salles, privé whiteboards, controlled données salles — aucun "link-leak shouldn't octroi entrée" scénario.

### 3. Exécuter dans 60 secondes
```bash
cd modules/token-gate
node --test            # 7 assertions, all green
python3 -m http.server 8080  # open http://127.0.0.1:8080/ to see issue/admit demo
```

### 4. Intégration contrat
Pur ESM, zéro dépendances, navigateur + Node. Named exports:
- `generateRootKey()` / `exportPublicKey(k)` / `importPublicKey(b64)` — émetteur racine clé
- `issueToken(rootPriv, { room, exp?, ttlMs?, audience?, jti? })` — problème jeton (en-tête.données utiles.signature, tous base64url)
- `verifyToken(rootPub, token, { room?, requiredAud? })` → `{ok, room, exp, aud, reason}`
- `gate(rootPub, envelope, { room?, requiredAud? })` → `{admit, reason}`
Également exposed as `window.TokenGate` dans le navigateur.

### 5. Architecture
```
issuer: generateRootKey ─▶ root priv (sign) / root pub (relay holds)
issue:  issueToken(rootPriv, {room, exp, audience}) ─▶ token
admit:  client hello{token,room} ─▶ relay verifyToken(rootPub, token) ─▶ ADMIT / DENY
```
Le jeton porte `room / exp / aud / jti`, signé par le racine privé clé; le relais contient uniquement le racine public clé et ne peut pas forge.

### 6. Garantit & menace modèle
- **jeton authenticity**: sans le racine privé clé, aucun signature forgery; tampered/expired/wrong-room/wrong-audience jetons sont tous rejeté.
- **Minimal confiance**: le serveur valide uniquement cryptography, contient aucun identité, jamais touches le document.
- Hors de portée: racine private-clé compromission (devrait être dans un HSM/key manager), compromis client.

### 7. Connu limites
- Jetons sont stateless (JWT-style); aucun révocation liste. Pour instant révocation, le émetteur maintains un nonce/denylist.
- Par défaut `aud:'*'` fait ne pas restrict le signataire; high-sécurité setups devrait lier un specific public clé.

### 8. Vérification
Voir `TEST_REPORT.md`: `node --test` tous vert (7/7), couvrant valide, expired, wrong-room, falsifié, audience-limited, gate, et cross-root.

### 9. Mesuré performance
Issue/verify sont sub-millisecond (natif Web Cryptographie ECDSA P-256).

### 10. Dépendances
**Un · Pur Zéro**: 0 npm dépendances, 0 vendor, 0 externe requêtes — uniquement plateforme Web Cryptographie.

### 11. licence
Cohérent avec dépôt licence. Ce module est Aegis's propre implémentation.

### 12. CHANGELOG
- v1.0.0 — ECDSA salle jetons, verify/gate, audience restriction, autonome démo, et `TEST_REPORT.md`.
