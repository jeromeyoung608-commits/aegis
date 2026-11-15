<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/p2p-crypto-transfer/DELIVERY_REPORT.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# Livraison Rapport — P2P Chiffré Transfert (Geek Task #3)

**Projet**: `p2p-crypto-transfer`
**Date**: 2026-11-09
**Author**: CodeBuddy (engineering audit + build)
**Constraint conformité**: 100% natif navigateur + Node built-ins, **zéro tiers runtime ou dev dépendances**.

---

## 1 · Objectif recap

Build un minimal, zéro dépendance P2P chiffré file-transfer tool pour le LAN / no-USB,
no-cloud-drive scénario. Difficile requirements:

1. P2P transport via **WebRTC DataChannel**.
2. **Natif Web Cryptographie AES-GCM** chiffrement appliqué à **chaque bloc** avant transfert.
3. Un hand-written **backpressure** mécanisme based sur `bufferedAmount` (aucun mémoire blow-up
   quand le récepteur est slow).
4. Un minimal **signalisation serveur** est allowed, Ou un public STUN, Ou un same-machine
   **BroadcastChannel** démo.
5. **Zéro dépendance**; structuré, modular fichiers; detailed README + ce livraison rapport.

---

## 2 · Quoi était livré

| Fichier | Responsabilité |
|------|----------------|
| `index.html` | Minimal UI: mode select, salle, partagé clé, send/receive progress, journal. |
| `server.js` | Zero-dep Node signalisation + statique serveur. HTTP long-poll relais; facultatif HTTPS quand `key.pem`/`cert.pem` présent. |
| `package.json` | Aucun dépendances; `start` et `test` scripts. |
| `src/crypto.js` | Web Cryptographie: PBKDF2 clé derivation (phrase secrète + aléatoire sel) + AES-GCM per-chunk encrypt/decrypt. |
| `src/signalers.js` | Pluggable signalisation: `HttpSignaler` (serveur relais) et `BroadcastSignaler` (serveur-less same-machine). |
| `src/p2p.js` | WebRTC orchestration: Offer/Answer, ICE (non-trickle, ICE-gather-complete avant envoyer), STUN pour NAT. |
| `src/transfer.js` | Streaming bloc + chiffrer + envoyer avec `bufferedAmount` backpressure; recevoir + déchiffrer flux droit à disque via `createSink` (1 GiB-capped en mémoire `Blob` repli). |
| `src/main.js` | UI orchestration uniquement (aucun entreprise logique). |
| `tests/crypto.test.mjs` + `tests/sink.test.mjs` | Zero-dep unité tests (node --test, 11/11): cryptographie (aller-retour, wrong-clé rejet, falsification rejet, sel aller-retour, pair interop, clé-derivation) + sink (OOM-fix streaming-to-disk logique). |
| `README.md` / `DELIVERY_REPORT.md` | Documentation + ce rapport. |

---

## 3 · Geek-challenge liste de contrôle (tous rempli)

### 3.1 P2P pénétration (WebRTC)
- ✅ Connexion built sur `RTCPeerConnection` + `RTCDataChannel` (`src/p2p.js`).
- ✅ Two signalisation options livré: un **minimal zero-dep signalisation serveur** (`server.js`,
  HTTP long-poll, relays uniquement SDP/ICE) **et** un **serveur-less BroadcastChannel** mode pour
  same-machine démo — exactement le alternatives le brief allowed.
- ✅ Public gratuit **STUN** (`stun:stun.l.google.com:19302`) pour NAT reflexive candidates;
  utilisé uniquement pour ICE, jamais voit fichier bytes/keys.
- ✅ Non-trickle ICE: nous attendre pour `iceGatheringState === 'complete'` avant sending le SDP
  donc le serveur logique reste trivial (relays exactement two messages).

### 3.2 Chiffrement & chunking (Web Cryptographie AES-GCM)
- ✅ `File.stream()` est lire via `getReader()` et sliced dans **16 KiB chunks**.
- ✅ Chaque bloc est chiffré avec **AES-GCM (256-bit, 128-bit balise) et un frais aléatoire 12-octet IV**
  (`src/crypto.js` `encryptChunk`). Le clé est dérivé de le partagé phrase secrète + un aléatoire
  sel via **PBKDF2 (120,000 iterations, SHA-256)**.
- ✅ Wire framing par bloc: `[uint32 seq | 12-byte IV | ciphertext]`. Sequence numbers faire
  out-of-order arrival sûr même though DataChannel est reliable+ordered.
- ✅ Le sel est public (envoyé dans le JSON `meta` message); le phrase secrète est **jamais transmitted**.
  Un compromis signalisation serveur donc ne peut pas déchiffrer anything.

### 3.3 Backpressure (bufferedAmount)
- ✅ Hand-written flux control dans `src/transfer.js` `sendFile`:
  - `HIGH_WATER = 16 MiB`: quand `dc.bufferedAmount` exceeds il, le expéditeur **stops reading**
    de le Fichier stream et `await`s le `bufferedamountlow` événement.
  - `LOW_WATER = 1 MiB`: `dc.bufferedAmountLowThreshold` ensemble à ce; le `bufferedamountlow`
    événement resumes sending.
  - Résultat: le expéditeur jamais overwhelms le canal ou exhausts RAM même si le récepteur est slow.
- ✅ UI surfaces le backpressure état via un journal ligne ("Récepteur est slow — backpressure engaged").

### 3.4 Zéro dépendance
- ✅ `package.json` a vide `dependencies`.
- ✅ `server.js` utilise uniquement `node:http`, `node:https`, `node:fs`, `node:path`, `node:url`.
- ✅ navigateur code utilise uniquement WebRTC + Web Cryptographie (plateforme APIs, ne pas libraries).
- ✅ Tests exécuter sur `node --test` avec aucun installed packages (`npm test` → 11/11 résumi: cryptographie + sink).

---

## 4 · Vérification exécuté

- `node --test` → **11/11 résumi**: cryptographie tests (aller-retour, wrong-clé rejet, falsification rejet, sel aller-retour, pair interop, clé-derivation) + sink tests (OOM-fix streaming-to-disk logique).
- `node --check` sur chaque `.js` fichier → tous analyse cleanly (aucun syntax erreurs).
- Statique revue de le sécurité modèle: confirmé signalisation serveur relays opaque SDP/ICE uniquement;
  fichier octets + clé matériel jamais leave le navigateur; wrong-key/tampered chunks échec GCM auth.

> Note: direct WebRTC de bout en bout transfert exige un secure-context navigateur (HTTPS ou localhost)
> et était validated par code revue + unit-tested cryptographie. Un manuel deux onglets/ two-machine exécuter est
> recommended as le final smoke test test (étapes dans README §3).

---

## 5 · Connu limitations (honête disclosure)
- Sequential transferts uniquement (un fichier par canal à un temps); concurrent bidirectional métadonnées
  isolation est ne pas implémenté mais est un easy extension (voir README §5).
- **Récepteur Out-of-memory — Corrigé (était le "mémoire hog" bug)**: le récepteur utilisé à tampon chaque
  bloc dans un array et assemble un `Blob` à le fin — un 4 GB fichier serait Out-of-memory le onglet. Il maintenant
  ouvre un sink sur le premier déchiffré bloc et flux droit à disque
  (`src/transfer.js` `createSink`): Chromium utilise `showSaveFilePicker()` →
  `FileSystemWritableFileStream` (unbounded, aucun reassembly tampon); tous autres browsers fall
  retour à un en mémoire `Blob **capped at 1 GiB**` que lève un crisp, actionable erreur ci-dessus
  le cap plutôt de crashing. Le un caveat — `showSaveFilePicker` nécessite un utilisateur gesture — est
  traité par un "💾 Choisir save emplacement" bouton que pre-locks le writer avant le pair
  envoie. Voir README §6 pour le complet risque note.
- Public STUN uniquement; symmetric NAT serait besoin un TURN serveur (hors de zero-dep portée).
- Signalisation serveur est en mémoire, single-process, unauthenticated — suitable pour intranet/demo;
  production nécessite salle auth + scaling.

---

## 6 · Suggested prochain étapes (facultatif)
1. Multi-file / dossier batch avec per-file `meta`.
2. Resume capacité via `resumeFrom` offset dans `meta`.
3. Salle authentication + ephemeral jeton sur le signalisation serveur.
4. WASM-accelerated bloc délégation d'empreintes pour very haut throughput.
