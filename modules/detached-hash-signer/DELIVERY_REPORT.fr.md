<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/detached-hash-signer/DELIVERY_REPORT.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# detached-empreinte-signataire — Livraison Rapport (MDS-1)

> Vérifiable par machine livraison contrat. Reflète le 12 chapters de le README et answers le buyer's questions directement.

### 1. Quoi il résout
Multipartie approbation de sensible documents: chaque signataire signe uniquement un SHA-256 empreinte, donc le document octets jamais leave le local machine et jamais entrer le signature lot.

### 2. Qui achète ce
B2B équipes needing multipartie approbation sans exposing document octets (legal/finance/exec cosignature, regulatory filing).

### 3. Exécuter dans 60 secondes
```bash
cd modules/detached-hash-signer && node --test   # 8/8 green
python3 -m http.server 8080                       # open index.html
```

### 4. Intégration contrat
Pur ESM, zéro dépendances, navigateur + Node. `sha256Hex`, `generateKeyPair`, `export/importPublicKey`, `signHash`, `verifySignature`, `makeBundle`, `verifyBundle`, `isDetached`. Également `window.DetachedHashSigner`.

### 5. Architecture
doc → SHA-256 → docHash → chaque exec signe le empreinte → `makeBundle` (empreinte + signatures uniquement) → `verifyBundle`. Aucun document octets travel.

### 6. Garantit & menace modèle
Détaché propriété (`isDetached`), signature vérification, falsification resistance. Hors de portée: private-clé compromission, host OS compromission.

### 7. Connu limites
Signe le empreinte uniquement; document transport traité amont. Aucun enforced signature ordonnancement chain.

### 8. Vérification
`node --test` → **8 / 8 résumi, 0 échec** (`tests/detached-hash-signer.test.mjs`).

### 9. Mesuré performance
Sub-millisecond sign/verify; complet suite ~23 ms (Node 26).

### 10. Dépendances
**Un · Pur Zéro**: 0 npm dépendances, 0 vendor, 0 externe requêtes (plateforme Web Cryptographie).

### 11. licence
dépôt licence. Aegis's propre implémentation, aucun tiers attribution encumbrance.

### 12. CHANGELOG
- 2026-11-11 — livré; 8/8 assertions vert; autonome index.html; MDS-1 contrat.
