<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/webgpu-topology/README.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# webgpu-topologie — WebGPU topologie Moteur

## 1. Quoi il résout
Le commande console nécessite un rich, direct topologie vue à drive le s sept étapes boucle. webgpu-topologie rend le Aegis network/entity topologie sur le GPU avec un SharedArrayBuffer-backed données magasin que cross-origin isolation unlocks (permettant SharedArrayBuffer).

## 2. Qui achète ce
Aucun dashboard/visualization que wants high-node-count topologie rendu avec déterministe, testable données structures.

## 3. Exécuter dans 60 secondes
```bash
cd modules/webgpu-topology
node --test                 # 7/7 green
python3 -m http.server 8080 # open index.html (WebGPU-capable browser required for rendering)
```

## 4. Intégration contrat
SAB-backed node/edge stocke, attribut pack/unpack, déterministe graph génération, statut weights, et P-256 key/fingerprint primitives. Rendu est navigateur-only (WebGPU).

## 5. Architecture
SharedArrayBuffer node/edge arrays → WebGPU rendre pipeline. Determinism vit dans le typed-array stocke, lequel sont unit-tested sans un GPU.

## 6. Garantit & menace modèle
Déterministe génération, correct SAB mise en page, attribut round-trips. Hors de portée: le GPU pipeline (navigateur-only).

## 7. Connu limites
Rendu exige un WebGPU-capable, cross-origin-isolated navigateur; le node suite valide logique uniquement.

## 8. Vérification
`node --test` → 7/7 vert (SAB mise en page, attribut packing, génération, base64, clé primitives).

## 9. Mesuré performance
Suite ~114 ms (Node 26), déterministe.

## 10. Dépendances
**Un · Pur Zéro** première partie code: 0 npm dépendances. Embarqué WGSL/WebGPU via import carte uniquement.

## 11. licence
dépôt licence.

## 12. CHANGELOG
- 2026-11-11 — README livré (Anglais); Test_Rapport livré; 7/7 vert (nombre corrigé de un périmé 12).
