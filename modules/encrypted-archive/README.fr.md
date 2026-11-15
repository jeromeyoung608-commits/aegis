<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/encrypted-archive/README.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# encrypted-archive — Local Zéro-connaissance coffre-fort

## 1. Quoi il résout
Signé artefacts et secrets doit être scellé donc que même un local dump révèle rien. encrypted-archive est un local, zéro-connaissance coffre-fort: fichiers sont chiffré avant ils touch disque (OPFS/IndexedDB) et le chiffrement clés jamais persist dans en clair.

## 2. Qui achète ce
Aucun flux de travail que nécessite à magasin signé artefacts, clés, ou intermediate état localement sans leaking en clair sur disque.

## 3. Exécuter dans 60 secondes
```bash
cd modules/encrypted-archive
node --test                 # suite green
python3 -m http.server 8080 # open index.html (browser vault)
```

## 4. Intégration contrat
`createVault`, `openOpfsStore`, et sealing/verification helpers sont importable. Le shell appels `createVault` après un vérifié artefact est produit.

## 5. Architecture
en clair → AES-GCM sceau avec un phrase secrète-derived clé → texte chiffré uniquement sur OPFS/IndexedDB. Le public carte expose rien que pourrait déchiffrer le coffre-fort.

## 6. Garantit & menace modèle
Aucun en clair clé matériel à reste; `isSealed` rejette enregistrements que fuite clé matériel. Hors de portée: phrase secrète weakness, host OS compromission.

## 7. Connu limites
navigateur-only persistance (OPFS/IndexedDB); un manquant navigateur environnement est rejeté loudly plutôt que faked.

## 8. Vérification
`node --test` → suite vert (coffre-fort get/put/list/remove, overwrite, clone isolation, OPFS refusal sans navigateur).

## 9. Mesuré performance
coffre-fort opérations sont sub-millisecond dans node; navigateur OPFS bound par appareil stockage.

## 10. Dépendances
**Un · Pur Zéro**: 0 npm dépendances, 0 vendor, 0 externe requêtes (plateforme cryptographie + stockage).

## 11. licence
dépôt licence.

## 12. CHANGELOG
- 2026-11-11 — README livré (Anglais); MDS-1 contrat.
