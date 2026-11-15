<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/e2e-signed-delivery/DELIVERY_REPORT.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# e2e-signed-delivery — Livraison Rapport (MDS-1)

> Vérifiable par machine livraison contrat. Reflète le 12 chapters de le README.

### 1. Quoi il résout
Un signé artefact doit survive un hop de signataire à counterparty avec son signatures et chaîne d'empreintes intact, et le récepteur doit être able à vérifier tout localement avant trusting il. Ce module assembles, transports, et vérifie signé artefacts fin à fin.

### 2. Qui achète ce
Aucun flux de travail que hands un signé, multipartie document à un autre partie au-dessus de un untrusted canal et nécessite local vérification — forensic hand-off, audit attestation, regulated document exchange.

### 3. Exécuter dans 60 secondes
```bash
cd modules/e2e-signed-delivery && node --test   # 14/14 green
python3 -m http.server 8080                     # open index.html (browser flow; Playwright skipped without a browser)
```

### 4. Intégration contrat
Pur ESM, zéro dépendances, navigateur + Node. `assembleArtifact`, `parseArtifact`, `verifyArtifact`, et le crypto/PDF helpers sont importable. Le shell appels ces après signature et avant scellage.

### 5. Architecture
document octets + trailer(signataires) → assemble → transport (P2P/relay) → analyse → vérifier (empreinte match + tous signatures). Le trailer est un array, donc multi-signataire artefacts sont natif (aucun re-wrapping pour un deuxième signataire). **Group livraison** (`src/sdk/envelope.js`): le document DEK est emballé à chaque recipient's ECDH P-256 public clé, donc un scellé blob ouvre independently pour chaque recipient; non-recipients et late-added destinataires sont rejeté. Vérifié par `tests/envelope.test.mjs` (4/4).

### 6. Garantit & menace modèle
empreinte-chain intégrité, multi-signature vérification, falsification détection. Vérifie le recomputed SHA-256 au-dessus de le PDF region contre chaque ECDSA P-256 signature au-dessus de le brut 32-octet empreinte. Hors de portée: le direct transport medium (traité par p2p-crypto-transfer / blind-relais).

### 7. Connu limites
Le browser/Playwright flux est ignoré automatiquement quand aucun navigateur est available, donc le node suite reste déterministe. Large-file stress est ne pas partie de le unité suite.

### 8. Vérification
`node --test` → **14 / 14 résumi, 0 échec** (`tests/*.test.mjs`): assemble/verify tour déclenchement, chain intégrité, falsification, multi-signataire.

### 9. Mesuré performance
Suite ~683 ms (Node 26), déterministe.

### 10. Dépendances
**Un · Pur Zéro** première partie code: 0 npm dépendances. PDF assembly utilise un **embarqué pdf-lib**, isolé sous `vendor/` et chargé via import carte uniquement — il est un externe, replaceable artefact, ne pas partie de le zéro dépendance noyau, et conserve son propre MIT licence. Ce est le unique, explicitly-marked vendor dépendance de ce module.

### 11. licence
dépôt licence. Embarqué pdf-lib conserve son propre MIT licence.

### 12. CHANGELOG
- 2026-11-13 — Livraison_Rapport livré (MDS-1); 14/14 vert; embarqué pdf-lib flagged as le uniquement vendor dépendance.
- 2026-11-13 — ajouté multi-recipient group-delivery enveloppe (`src/sdk/envelope.js` + `tests/envelope.test.mjs`, 4/4).
