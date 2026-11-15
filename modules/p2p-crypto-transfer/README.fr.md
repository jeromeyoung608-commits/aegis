<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/p2p-crypto-transfer/README.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# p2p-crypto-transfer — Peer-to-Peer Chiffré Transfert

## 1. Quoi il résout
Fichiers doit déplacer entre two parties sans un serveur ever seeing eux. p2p-crypto-transfer ensembles up un WebRTC données canal et flux AES-GCM-encrypted chunks droit à disque, avec un minimal zéro dépendance signalisation serveur que relays uniquement opaque SDP/ICE.

## 2. Qui achète ce
Aucun flux de travail que nécessite direct, end-to-end-encrypted fichier passation (le "transport" leg de le Aegis fermé boucle).

## 3. Exécuter dans 60 secondes
```bash
cd modules/p2p-crypto-transfer
node --test                 # 11/11 green
node server.js &            # minimal signaling server (relays SDP/ICE only)
python3 -m http.server 8080 # open index.html (two tabs to transfer)
```

## 4. Intégration contrat
`src/transfer.js` (stream encrypt/send + receive/decrypt à disque), `src/p2p.js` (RTCPeerConnection/DataChannel), `src/crypto.js` (enveloppe). Le shell pilote il via iframe + postMessage.

## 5. Architecture
clé exchange → AES-GCM enveloppe → WebRTC DataChannel → récepteur déchiffre à disque via un 1 GiB-capped en mémoire Blob repli. Signalisation serveur relays uniquement SDP/ICE.

## 6. Garantit & menace modèle
De bout en bout chiffrement (faux clé échoue), intégrité (falsification rejeté), OOM-safe streaming. Le signalisation serveur voit aucun fichier octets ou clés. Hors de portée: signalisation serveur compromission, host OS compromission.

## 7. Connu limites
Exige un secure contexte (HTTPS/WSS) et un navigateur pour le direct transfert; le node suite simulates le crypto/transport contrat.

## 8. Vérification
`node --test` → 11/11 vert (cryptographie tour déclenchement, wrong-clé rejet, falsification rejet, sel tour déclenchement, pair interop, streaming-to-disk logique).

## 9. Mesuré performance
Suite ~1.0 s (Node 26), déterministe.

## 10. Dépendances
**Un · Pur Zéro** première partie code: 0 npm dépendances. navigateur utilise uniquement WebRTC + Web Cryptographie.

## 11. licence
dépôt licence.

## 12. CHANGELOG
- 2026-11-11 — README livré (Anglais); Test_Rapport livré; 11/11 vert (nombre corrigé de périmé 10).
