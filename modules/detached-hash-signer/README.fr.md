<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/detached-hash-signer/README.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# detached-empreinte-signataire — Détaché empreinte Signature

> **Terminology**: ce est **détaché empreinte signature**, *ne pas* un cryptographique aveugle
> signature scheme. Là est aucun blinding factor et aucun unblinding étape — le signataire
> signe un SHA-256 empreinte ils peut voir. Le historical module nom est kept pour
> compatibility. Voir `docs/CLAIMS-WORDING.md`.

---

### 1. Quoi il résout
Multipartie approbation often involves extremely sensible documents (M&Un conditions, medical enregistrements, financials). Traditional e-signing forces le signataire à recevoir le complet fichier, creating un fuite surface le moment il est traité. Ce module lets chaque signataire sign uniquement un **un SHA-256 document empreinte**; le document octets jamais leave le local machine, jamais entrer le signature lot, et sont jamais seen par le server/relay.

### 2. Qui achète ce
B2B scenarios needing **multipartie approbation sans exposing document octets**: legal/finance/executive cosignature de confidential fichiers, regulatory filing, cross-institution joint endorsement.

### 3. Exécuter dans 60 secondes
```bash
cd modules/detached-hash-signer
node --test            # 8 assertions, all green
# Standalone browser demo: serve this directory with any static server
python3 -m http.server 8080  # then open http://127.0.0.1:8080/
```

### 4. Intégration contrat
Pur ESM, zéro dépendances, works dans les deux navigateur et Node (plateforme Web Cryptographie). Named exports:
- `sha256Hex(bytes)` / `sha256HexOfText(text)` — document empreinte
- `generateKeyPair()` / `exportPublicKey(k)` / `importPublicKey(b64)` — ECDSA P-256 clés
- `signHash(privateKey, hashHex)` / `verifySignature(publicKey, hashHex, sigB64)` — sign / vérifier un empreinte (détaché signature)
- `makeBundle({docName, docHash, signers})` / `verifyBundle(json)` — détaché signature lot
- `isDetached(json)` — prouve le lot contient aucun document octets

Également exposed as `window.DetachedHashSigner` dans le navigateur, donc externe systems peut integrate directement.

### 5. Architecture
```
confidential doc ──SHA-256──▶ docHash(64 chars)  ──┐
                                                  ├─▶ each exec signs docHash ─▶ signers[]
                                                  │     (doc bytes never leave local)
makeBundle(docHash, signers) ─▶ {kind,docHash,signers}  ← no original
verifyBundle() ─▶ all signatures valid?
```
Le lot contient uniquement `docHash + each signer(publicKey, signature)` — aucun document contenu.

### 6. Garantit & menace modèle
- **Détaché propriété**: `isDetached` prouve le lot porte uniquement empreinte + signatures, jamais le document.
- **signature attribution**: chaque signataire signe le empreinte avec leur propre privé clé; le public clé vérifie. Ce prouve clé possession uniquement — signataire identité est auto-déclaré.
- **Falsification resistance**: aucun signature échec fait `verifyBundle` retourner `ok:false` immédiatement.
- Hors de portée: private-clé compromission (holder's responsabilité), compromis host OS.

### 7. Connu limites
- Ce module uniquement signe le empreinte; document distribution/storage/transport est traité amont (e.g. blind-relais + encrypted-archive).
- Il fait ne pas enforce un signature chain order; chained cosignature (chaque partie signe prior signatures) peut être layered sur top.

### 8. Vérification
Voir `TEST_REPORT.md`: `node --test` tous vert (8/8), couvrant empreinte stability, signature vérification, falsification échec, three-party détaché signature, missing-signature échec, détaché propriété, et malformed entrée.

### 9. Mesuré performance
Unique sign / vérifier est sub-millisecond (natif Web Cryptographie ECDSA P-256, mesuré sur Node 26).

### 10. Dépendances
**Un · Pur Zéro**: 0 npm dépendances, 0 vendor, 0 externe requêtes — uniquement plateforme Web Cryptographie.

### 11. licence
Cohérent avec le dépôt licence. Ce module est Aegis's propre implémentation, avec aucun tiers attribution encumbrance.

### 12. CHANGELOG
- v1.0.0 — detached-sign API, détaché lot, detached-property vérifier, autonome `index.html` démo, et `TEST_REPORT.md`.
