<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/e2e-signed-delivery/README.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# e2e-signed-delivery — De bout en bout Signé Artefact Livraison

## 1. Quoi il résout
Un signé artefact doit survive un hop de signataire à counterparty avec son signatures et chaîne d'empreintes intact, et le récepteur doit être able à vérifier tout localement avant trusting il. Ce module assembles, transports, et vérifie signé artefacts fin à fin.

## 2. Qui achète ce
Aucun flux de travail que hands un signé, multipartie document à un autre partie au-dessus de un untrusted canal et nécessite local vérification.

## 3. Exécuter dans 60 secondes
```bash
cd modules/e2e-signed-delivery
node --test                 # 14/14 green
python3 -m http.server 8080 # open index.html (browser flow; Playwright path skipped without browser)
```

## 4. Intégration contrat
`assembleArtifact`, `parseArtifact`, `verifyArtifact`, et le crypto/PDF helpers sont importable. Le shell appels ces après signature et avant scellage.

## 5. Architecture
document octets + trailer(signataires) → assemble → transport (P2P/relay) → analyse → vérifier (empreinte match + tous signatures). Le trailer est un array, donc multi-signataire artefacts sont natif.

**Group livraison:** `src/sdk/envelope.js` wraps le document DEK à N recipients' ECDH P-256 public clés (frais ephemeral ECDH par recipient, AES-GCM-wrapped DEK). Un scellé blob ouvre independently pour chaque recipient — aucun partagé phrase secrète, aucun per-recipient re-encryption. Aucun recipient ne pas listed à sceau temps est rejeté, et le enveloppe est fermé (adding un recipient plus tard fait ne pas octroi accès).

## 6. Garantit & menace modèle
empreinte-chain intégrité, multi-signature vérification, falsification détection. Hors de portée: le direct transport medium (traité par p2p-crypto-transfer / blind-relais).

## 7. Connu limites
Le browser/Playwright flux est ignoré automatiquement quand aucun navigateur est available, donc le node suite reste déterministe.

## 8. Vérification
`node --test` → 14/14 vert (assemble/verify tour déclenchement, chain intégrité, falsification, multi-signataire).

## 9. Mesuré performance
Suite ~683 ms (Node 26), déterministe.

## 10. Dépendances
**Un · Pur Zéro** première partie code: 0 npm dépendances. Embarqué pdf-lib via import carte uniquement.

## 11. licence
dépôt licence. Embarqué pdf-lib conserve son propre MIT licence.

## 12. CHANGELOG
- 2026-11-11 — README livré (Anglais); Test_Rapport livré; 14/14 vert.
