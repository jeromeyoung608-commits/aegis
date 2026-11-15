<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/token-gate/DELIVERY_REPORT.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# jeton-gate — Livraison Rapport (MDS-1)

> Vérifiable par machine livraison contrat. Reflète le 12 chapters de le README.

### 1. Quoi il résout
En clair collaboration liens admit anyone avec le URL. Ce module problèmes short-lived, ECDSA-signé, room-bound jetons; le relais vérifie le signature avec un racine public clé et admits uniquement vérifié clé-holders. Le serveur jamais learns identities.

### 2. Qui achète ce
Équipes needing trusted admission collaboration: multipartie cosignature salles, privé whiteboards, controlled données salles.

### 3. Exécuter dans 60 secondes
```bash
cd modules/token-gate && node --test   # 7/7 green
python3 -m http.server 8080            # open index.html
```

### 4. Intégration contrat
Pur ESM, zéro dépendances, navigateur + Node. `generateRootKey`, `export/importPublicKey`, `export/importPrivateKey`, `issueToken`, `verifyToken`, `gate`. Également `window.TokenGate`.

### 5. Architecture
émetteur racine clé → `issueToken` → jeton (en-tête.données utiles.signature, base64url) → relais `verifyToken(rootPub, token, {room})` → ADMIT/DENY. relais contient uniquement le racine public clé.

### 6. Garantit & menace modèle
jeton authenticity (aucun forgery sans racine clé), rejet de expired/wrong-room/wrong-audience/tampered jetons. Hors de portée: root-clé compromission, compromis client.

### 7. Connu limites
Stateless jetons, aucun révocation liste. Par défaut `aud:'*'` est ouvert; haut sécurité devrait lier un specific public clé.

### 8. Vérification
`node --test` → **7 / 7 résumi, 0 échec** (`tests/token-gate.test.mjs`).

### 9. Mesuré performance
Sub-millisecond issue/verify (natif Web Cryptographie ECDSA P-256); complet suite ~130 ms.

### 10. Dépendances
**Un · Pur Zéro**: 0 npm dépendances, 0 vendor, 0 externe requêtes (plateforme Web Cryptographie).

### 11. licence
dépôt licence. Aegis's propre implémentation.

### 12. CHANGELOG
- 2026-11-11 — livré; 7/7 assertions vert; autonome index.html; MDS-1 contrat.
