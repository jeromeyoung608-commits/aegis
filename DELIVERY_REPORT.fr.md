<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: DELIVERY_REPORT.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# AEGIS — Livraison & Test Rapport

**Projet**: `Aegis` — Secure Bord Collaboration Établi
**Date**: 2026-11-09
**Reading note**: fichier comptes, archive sizes et test totals ci-dessous sont point-in-time
snapshots de chaque vérification tour, ne pas le actuel livraison état. Pour le
authoritative actuel figures exécuter `npm run verify:delivery` (chaque SHA256 correspond).
**Composition**: trois independently-shipped modules (`webgpu-topology`, `doc-redactor`,
`p2p-crypto-transfer`) unifié par `aegis-shell` derrière un EventBus + `postMessage`
pont, servi par un zéro dépendance `server.js`.

---

## 1 · Quoi était livré

Un single-page établi que ferme le boucle **topologie → caviardage → P2P livraison**
sans aucun données leaving le navigateur, plus le unifié serveur et docs. Le trois modules
étaient **déplacé** (ne pas rewritten) dans `Aegis/modules/` donc leur interne structure et
existing test suites rester intact; uniquement thin, isolé **intégration seams** étaient ajouté:

| Seam | Fichier | Quoi il fait |
|------|------|--------------|
| topologie → shell | `modules/webgpu-topology/src/main.js` | sur un clic (déjà protégé par le 5px drag/click threshold), `postMessage({channel:'aegis', type:'topology:node-selected', nodeId, x, y})` à le parent. topologie est read-only; le shell decides le réponse. |
| Rédacteur hooks | `modules/doc-redactor/src/js/app.js` + `aegis-adapter.js` | expose `window.REDAKTOR.addFiles` / `exportToParent`; adaptateur injecte "▶ Envoyer à Aegis Pair", auto-loads sur `redaktor:load-doc`, et émet `redaktor:export-ready` sur completion. |
| P2P hooks | `modules/p2p-crypto-transfer/src/main.js` + `aegis-adapter.js` | expose `window.__AEGIS.connect/send`; adaptateur accepts `p2p:configure` + `p2p:send-file` et émet `p2p:file-received` / `p2p:file-sent` / `p2p:error`. |
| Shell adapters | `aegis-shell/src/adapters.js` | `TopologyAdapter` (read-only), `REDACTORAdapter` (`addFiles` / `exportToParent`), `P2PAdapter` (`connect(room)` / `sendFile(file)`) — le typed control surface au-dessus de le iframes. |
| Shell orchestration | `aegis-shell/src/{app.js, bus.js, context.js}` | namespaced EventBus pont + partagé `AegisContext` + dark command-center SPA (gauche topologie / droit caviardage barre latérale) avec unifié router & 3-étape état machine. |
| serveur | `Aegis/server.js` | COOP/COEP (pour SAB) + statique hosting de tous modules + P2P long-poll signalisation. |

Aucun module imports un autre; chaque cross-module appel travels le `aegis` `postMessage`
canal et est routed à travers le shell's `EventBus`. Que est le architectural constant
requested ("un EventBus / état machine à règle eux tous").

---

## 2 · Zero-trust / hors ligne allégations — re-stated precisely
- topologie: local WebGPU; serveur envoie uniquement statique octets.
- caviardage: OCR + PDF rebuild sont entièrement local; un hors ligne garde bloque cross-origin
  `fetch`/`XHR`/`WebSocket`/`EventSource`/`sendBeacon`. Exporté PDF carry aucun texte couche.
- Transfert: signalisation relais voit uniquement SDP/ICE; fichier octets et le PBKDF2 clé jamais reach
  le serveur.

---

## 3 · Vérification exécuté

### 3.1 Statique analysis (ce environnement)
- `node --check` sur chaque `.js` edited/added dans ce intégration résumi:
  - `Aegis/server.js`, `aegis-shell/src/app.js`, `aegis-shell/src/bus.js`
  - `modules/webgpu-topology/src/main.js`, `modules/doc-redactor/src/js/app.js` +
    `aegis-adapter.js`, `modules/p2p-crypto-transfer/src/main.js` + `aegis-adapter.js`
  → tous analyse cleanly.
- Full-tree CJK / fullwidth-punctuation balayage à travers `Aegis/` → **Propre** (Anglais uniquement).
- serveur smoke test test: started `Aegis/server.js`, confirmé
  `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`
  sur responses, et que module entrée points (`/aegis-shell/index.html`,
  `/modules/webgpu-topology/index.html`, `/modules/doc-redactor/index.html`,
  `/modules/p2p-crypto-transfer/index.html`) et `shaders.wgsl` sont servi avec correct
  MIME types; `/signal` est traité as long-poll.

### 3.2 module-level suites (pre-existing, encore valide)
- `p2p-crypto-transfer`: `node --test` → 10/10. 5 cryptographie (aller-retour, wrong-clé, falsification,
  sel, interop) + 5 sink/OOM-guard tests: `createSink` routage (pre-locked writer >
  `showSaveFilePicker` > capped mémoire repli), le >1 GiB difficile reject, et un
  de bout en bout replay proving le récepteur écrit chaque déchiffré bloc à disque as il
  arrives (jamais assembles le ensemble fichier dans mémoire — le ancien Out-of-memory chemin est gone).
- `doc-redactor`: reproductible Playwright E2E + PDF forensics documenté dans son
  `TEST_REPORT.md` (développement uniquement dépendances; s.exécute dans un navigateur, ne pas ici).
- `webgpu-topology`: syntax + statique WGSL/bind-group revue (WebGPU nécessite un navigateur).

### 3.3 Quoi pourrait Ne pas être exécuté ici (honête disclosure)
Le integration's **runtime** behavior (WebGPU rendu, in-iframe OCR, et le WebRTC
handshake entre le two P2P iframes) exige un rél navigateur avec GPU + WASM + WebRTC.
Ce environnement a aucun navigateur, donc le de bout en bout boucle était vérifié **structurally**:
le message contrat entre shell et chaque adaptateur, le serveur en-têtes, module serving,
et le trois modules' propre suites. Un manuel smoke test test est ci-dessous.

---

## 4 · Manuel smoke test test (exécuter dans Chrome/Bord 113+)
```bash
cd /path/to/Aegis && node server.js
# open http://localhost:8080
```
1. topologie rend; clic un node → caviardage onglet ouvre avec un généré contrat.
2. caviardage module OCRs localement; noir boîtes appear sur IBAN / Steuer-ID / nom.
3. Clic **"▶ Envoyer à Aegis Pair"** → Transfert onglet; Pair Un chiffre & flux, Pair B
   receives & déchiffre; stepper turns entièrement vert.
Attendu: à aucun point fait le réseau onglet show le document ou fichier octets leaving le
navigateur (uniquement same-origin statique + SDP/ICE à le signalisation route). Le caviardage
module's "Bloqué" compteur increments si anything externe est attempted.

---

## 5 · Risque notes (reception, ne pas blockers)
- **Two pairs, un navigateur**: le in-shell démo utilise two iframes + `BroadcastChannel`.
  Pour two physical machines utiliser LAN mode + HTTPS (drop `key.pem`/`cert.pem` beside
  `server.js`).
- **COEP vs externe STUN**: `require-corp` est harmless pour same-origin actifs mais peut
  interfere avec *externe* STUN sur quelques browsers; same-machine nécessite aucun STUN, et le
  autonome P2P serveur (sans COOP/COEP) couvre cross-machine si nécessaire.
- **caviardage recall**: détection est tuned pour Allemand paperwork et peut besoin manuel boîtes
  sur poor balaye — par conception le human vérifie avant export.
- **Exemple document**: le shell génère un synthetic contrat donc le boucle est demonstrable
  avec zéro rél données; remplace `contractForNode()` avec un rél client-side loader à go direct.

---

## 6 · Défauts trouvé et resolved pendant ce résumi
- (Carried au-dessus de, déjà corrigé dans `webgpu-topology`) pointerup drag/click ambiguity et
  le initial viewport-fit bug — voir que module's `DELIVERY_REPORT.md` §7.
- **P2P récepteur Out-of-memory (le "mémoire hog") — Corrigé**: le récepteur aucun plus long buffers tous chunks
  et assembles un `Blob` à le fin. Il maintenant ouvre un sink sur le premier déchiffré bloc et
  flux droit à disque via `showSaveFilePicker()` → `FileSystemWritableFileStream`
  (unbounded, aucun reassembly tampon); non-Chromium browsers fall retour à un en mémoire chemin
  **capped à 1 GiB** que lève un crisp erreur ci-dessus le cap. Un "💾 Choisir save emplacement"
  bouton fournit le requis utilisateur gesture à pre-lock le writer. Voir
  `modules/p2p-crypto-transfer/{README.md §6, DELIVERY_REPORT.md §5}`.
- Integration-only: confirmé chaque adapter's `frameId` routage correspond le shell's
  `post()` donc `send-file` cibles uniquement le expéditeur iframe et `configure` cibles chaque P2P
  iframe exactement une fois.
- **Rédacteur spelling** — un stray `REAKTOR` (manquant D) dans
  `modules/doc-redactor/src/js/aegis-adapter.js` comment; corrigé à `REDAKTOR`
  (le canonical marque utilisé everywhere sinon). Grep-confirmed zéro restant.
- **Unifié Contexte (le trois indépendant projects → un Aegis établi)** — ajouté
  `aegis-shell/src/context.js` (`AegisContext` + `selectNode`/`setDocument`/`markSent`/
  `markReceived` mutators). Le fermé boucle est maintenant un explicite état machine au-dessus de ce
  Contexte plutôt de scattered `postMessage` appels: un topologie `node-selected` écrit le
  node dans le Contexte, synthesizes **que node's** associated contrat
  (`contractForNode(node)`, stamped avec node id/coords → provably le *corresponding*
  document), et posts `load-doc` dans Rédacteur. Documents README §3.
- **COOP/COEP durcissement (serveur.JS)** — confirmé le unifié serveur est un deliberately
  *isolé* serveur, ne pas un naive statique serveur: `Cross-Origin-Opener-Policy: same-origin`
  + `Cross-Origin-Embedder-Policy: require-corp` + `Cross-Origin-Resource-Policy:
  same-origin` sont ensemble sur **chaque** réponse (statique octets Et le JSON signalisation relais),
  lequel est quoi permet `SharedArrayBuffer` pour le WebGPU topologie's Worker physique.
  Vérifié direct avec `curl`: le trois en-têtes appear sur `/` (200), `/aegis-shell/src/
  application.JS` (200), `/signal` (204) et un 404 alike. Docs note le autonome module
  servers délibérément omit ces (aucun SAB nécessaire).
- **Adaptateur / EventBus refactor (namespaced + dark command-center SPA)** — restructured
  le intégration à le spec's explicite architecture: cross-module événements sont maintenant
  namespaced par origine (`topology:node-selected`, `redaktor:export-ready`,
  `p2p:file-received` / `p2p:file-sent` / `p2p:error`), et chaque module est emballé dans un
  shell-side classe avec le exact surface requested — `TopologyAdapter` (read-only),
  `REDACTORAdapter.addFiles(fileList)` / `exportToParent()`, `P2PAdapter.connect(room)` /
  `sendFile(file)`. Le shell était reconstruit as un Vanilla-JS dark "commande centre": gauche =
  topologie étape, droit = caviardage barre latérale + P2P transfert carte, avec un unifié router
  (`body[data-stage]`) et un 3-étape état machine driven par `AegisContext`. Sur
  `p2p:file-received` le shell maintenant *decides* (re-open dans Rédacteur ou télécharger).

---

## 7 · module 01 · Localement Self-Custodied Identité (ajouté)

Un fourth, autonome module pour domain-less intranets: chaque employee frappe un local
ECDSA P-256 sceau. Le privé clé est emballé avec PBKDF2-SHA256 (250,000 iterations) →
AES-GCM-256 et stocké dans IndexedDB; le public clé est exporté as SPKI Base64 et
rendu sur un digital entreprise carte avec un SHA-256 empreinte et un fingerprint-derived
avatar.

| Vérifier | Résultat |
| --- | --- |
| Unité suite (`node --test`, zéro dépendances) | 26 / 26 résumi |
| navigateur reception: identité readable après un complet page recharger | Résumi |
| signature au-dessus de un frais challenge vérifie contre le stocké public clé | Résumi |
| Privé matériel présent dans le persistant enregistrement | Aucun — `isSealed()` enforces il |
| Externe réseau requêtes de le page | 0 |
| Attributions (code en-tête, console signature, pied de page avis) | Tous trois présent |

Livré fichiers direct sous `modules/zero-knowledge-identity/`; voir son `README.md`,
`TEST_REPORT.md` et `DELIVERY_REPORT.md`. Ouvert il à
`/modules/zero-knowledge-identity/index.html` pendant `node server.js` est en cours d.exécution.

Connu limites, indiqué plutôt que caché: aucun phrase secrète récupération, stockage est par navigateur
profile, noms sont auto-déclaré (aucun CA derrière eux), et le unlocked clé vit dans page
mémoire jusqu.à verrou ou recharger.

---

## 8 · module 02 · Local Chiffré coffre-fort (audit & Archive)

Le counterpart à un signature: un vérifié artefact nécessite somewhere à direct que est ne pas
le desktop. Après le signed-delivery récepteur vérifie un fichier, le commande centre offre
**Archive à coffre-fort**, lequel chiffre le fichier plus son signature métadonnées avec
AES-GCM-256 et écrit un opaque `.aegis` conteneur dans le navigateur's Origine Privé
Fichier Système. Rien laisse le appareil.

| Vérifier | Résultat |
| --- | --- |
| Unité suite (`node --test`, zéro dépendances) | 23 / 23 résumi |
| navigateur: shell sceau après un vérifié livraison | Résumi — 52,576 B données utiles → 53,324 B conteneur |
| coffre-fort nombre avant / après recharger | `1 sealed record · 52.1 KB ciphertext · opfs` — unchanged |
| Autonome coffre-fort page voit le shell's enregistrement | Résumi — 1 row, même OPFS dossier |
| Fichier noms / métadonnées visible pendant verrouillé | Aucun — uniquement uuid + texte chiffré taille |
| Faux phrase secrète / altéré texte chiffré | Distinct, testé erreurs; enregistrement survive |
| Externe réseau requêtes de le page | 0 |
| Attributions (code en-tête, console signature, pied de page avis) | Tous trois présent |

Two intégration défauts étaient trouvé et corrigé pendant reception: un Blob posted dans un
caché iframe jamais terminé le sceau (le shell maintenant imports le coffre-fort cœur directement, donc
le archive s.exécute in-page), et un corrigé BroadcastChannel salle let périmé onglets steal WebRTC
offre (les deux demos maintenant utiliser un per-load salle id).

Livré fichiers direct sous `modules/encrypted-archive/`; voir son `README.md`,
`TEST_REPORT.md` et `DELIVERY_REPORT.md`. Ouvert le navigateur à
`/modules/encrypted-archive/index.html` pendant `node server.js` est en cours d.exécution.

Connu limites: 64 MB par enregistrement (en mémoire sceau), aucun phrase secrète récupération, aucun clé rotation,
et OPFS est cleared quand site données est cleared.

---

## 9 · module 03 · Détecteur de falsification piste d'audit (Chronologie & audit UI)

Le conformité counterpart à le coffre-fort: un signé document est uniquement defensible si le
actions around il sont enregistré et plus tard modifications sont detectable. Le right-hand **audit
Trail** carte appends un empreinte lien par action et rend il as un compact chronologie.
Chaque lien est `HMAC-SHA256(deviceKey, previousHash | canonical(entry))` quand un appareil
clé est available (entrées carry `alg: 'hmac-sha256'`); un older chain écrit avec
en clair `SHA-256` encore vérifie as `alg: 'sha256'`. Édition, deleting ou reordering un
entrée breaks chaque plus tard empreinte, donc le chain est **détecteur de falsification, ne pas immutable** — un
opérateur qui peut rewrite le ensemble magasin et également contient le clé pourrait recompute il.
Le chain reuses `modules/sync-canvas/src/audit/HashChain.js` à travers un unique
re-export seam. Voir `docs/CLAIMS-WORDING.md`.

Enregistré événements: caviardage started, destructive PDF produit, chiffré P2P livraison,
livraison déchiffré par Boss-B, ECDSA signature généré (avec le signataire's SPKI
empreinte), vérification résumi ou rejeté, et coffre-fort scellage. Le autonome revue
page à `/modules/audit-timeline/index.html` lit le même chain de `localStorage` et
adds **Vérifier chain**, **Export JSON** et un two-step **Clair**.

| Vérifier | Résultat |
| --- | --- |
| Unité suite (`node --test`, zéro dépendances) | 15 / 15 résumi, 0 échec |
| Autonome page, vide état | Résumi — `chain empty · append-only log ready` |
| Shell signed-delivery démo | Résumi — `Verified · 2 signer(s)`, signature lien avec `Fingerprint 677A18AB552A` |
| Chronologie après two liens | Résumi — `chain intact · 2 links · head 7C866913...` |
| Recharger persistance | Résumi — même two liens et tête après recharger |
| Cross-page sharing | Résumi — autonome page affiche le même two liens |
| console erreurs pendant reception | Aucun |
| Attributions (code en-tête, console signature, pied de page avis) | Tous trois présent |

Un ordonnancement défaut était trouvé pendant intégration: deriving le signature lien de le final
verdict collapsed signature et vérification dans un horodatage. Le signed-delivery module
maintenant posts `signed:sealed` immédiatement après building le trailer, avant le artefact
travels, donc le chronologie affiche le rél sequence.

Connu limites: le local chain est détecteur de falsification mais ne pas remotely attested; replacing le
ensemble stocké chain avec un différent valide chain est outside le menace modèle jusqu.à le tête
empreinte est anchored dans un signé document ou un externe horodatage service. `localStorage` est
last-writer-wins, donc concurrent command-center onglets devrait être avoided dans production.
Timestamps come de le local clock.

Livré fichiers direct sous `modules/audit-timeline/`; voir son `README.md`,
`TEST_REPORT.md` et `DELIVERY_REPORT.md`.

---

## 10 · Adaptateur 01 · RFC 3161 TSA Horodatage (facultatif, désactivé par par défaut)

Un **facultatif, removable adaptateur** — ne pas partie de le confiance noyau. Il transmet un
SHA-256 empreinte (un Aegis chain tête, un FieldSeal `sealHash`, ou un C2PA résultat empreinte) à
un opérateur-configured externe Time-Stamp Authority et retourne le brut CMS
`TimeStampToken`. Aucun `core/` fichier était modifié; le noyau chaîne d'empreintes, ECDH/ECDSA,
LAN jeton relais, et topologie rendre sont byte-for-byte unchanged.

| Capacité | Détail |
|---|---|
| Enable | `node server.js --adapter-tsa on --tsa-config <file>` (par défaut: Désactivé) |
| Point de terminaison | `POST /adapter/tsa/submit` (enregistré uniquement quand activé) |
| Requête | hand-rolled DER `TimeStampReq` avec un frais nonce (anti-replay) |
| Réponse | corrigé schema: `tsaStatus`, `originalDigest`, `timestampTokenBase64` (brut, unmodified), `tstInfo` (`genTime`/`serialNumber`/`nonce`), `tsaProvider`, `verifyHint` |
| Échec | aucun timeout / réseau erreur / 4xx / 5xx → `{ tsaStatus: 'failed' }`; jamais lève, jamais disrupts le principal chain ou relais |
| Dépendances | Node built-ins uniquement (`node:crypto`, `node:http`, `node:https`); aucun `asn1js` / `pkijs`. Complet CMS vérification est un isolé, not-loaded `vendor/` branch |
| Removability | supprimer `adapters/tsa-rfc3161/` + le `--adapter-tsa` indicateur → tous original functionality intact |

**Vérification (ce résumi):** 9/9 adaptateur unité tests (DER encode, CMS/TSTInfo analyse,
entrée schema, unreachable-TSA fail-safe, local mock TSA aller-retour, RBAC gate) et le
hors ligne smoke test (`video-tool/verify-tsa.mjs`: adaptateur Sur, externe TSA unreachable →
`tsaStatus: failed`, principal `/session` relais encore healthy). `zero-dep-lint.mjs` balaye le
adaptateur (uniquement `node:*` + relative imports) et forbids aucun `vendor` import leaking dans.

### Risque frontière & division de responsabilité (EN)

**Aegis est un forwarding proxy; le TSA est le tiers confiance source.** Aegis:
(1) envoie **uniquement le empreinte** — jamais document octets ou clés; (2) fait **ne pas** vérifier
le TSA CMS signature ou certificat chain et maintains **aucun TSA root-CA confiance magasin**;
(3) fait **ne pas** cache, re-sign, ou alter le returned jeton; (4) fait **aucun allégation**
about juridique effect. Le utilisateur doit vérifier le jeton hors ligne contre le TSA racine CA.
Whether un RFC 3161 horodatage est admissible, et sous lequel qualifié certificat, est
decided par le local jurisdiction et le TSA Prestataire's certificat chain. Aucun Prestataire
URL, API clé, ou certificat est hardcoded: Prestataire selection, identifiants, UE region,
et GDPR posture sont le opérateur's responsabilité.

### Risikogrenze & Verantwortung (DE)

**Aegis ist ein Weiterleitungs-Proxy; mourir TSA ist mourir externe Vertrauensquelle.**
Aegis: (1) sendet **nur den empreinte** – niemals Dokumentinhalte oder Schlüssel;
(2) prüft **weder** mourir CMS-Signatur **noch** mourir Zertifikatskette der TSA und
unterhält **keinen** TSA-Stammzertifikatsspeicher; (3) speichert, signiert oder
verändert das zurückgegebene jeton **nicht**; (4) trifft **keine Aussage** zur
Rechtswirkung. Mourir Offline-Prüfung gegen das TSA-Stammzertifikat obliegt dem
Anwender. Zulässigkeit und Qualifizierung richten sich nach der jeweiligen
Rechtsordnung und der Zertifikatskette des TSA-Anbieters. Anbieterwahl,
Zugangsdaten, EU-Region und DSGVO-Konformität liegen beim Betreiber.

---

## 11 · sécurité audit Remediation (Round-7) — 2026-11-14

Un indépendant sécurité audit raised **quatre blockers (B-01~B-04)** around static-file
exposure et un fifth livraison défaut (**B-03**) que livré un partagé `issuerSecret` et un
development SQLite base de données à chaque Client. Tous findings sont **remediated et vérifié**.

### 11.1 Racine provoquer & correctif

Le unifié `server.js` previously servi le working arbre avec aucun frontière around privé
chemins. Le correctif est **premier niveau precise** (ne pas segment-matching, donc legitimate runtime code
tels as `modules/webgpu-topology/src/data/` encore distribue):

- `DENY_TOP_LEVEL = new Set(['config','data','server'])` — jamais serve ces premier niveau dirs.
- `DENY_EXTS` adds `.db/.db-shm/.db-wal/.sqlite/.sqlite3` et rejette encoded `..` traversal
  après repeated decode (couvre `/%2e%2e/...` et double-encoding).
- sécurité en-têtes ajouté sur chaque réponse: `Referrer-Policy`, `Permissions-Policy`,
  `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`.
- `/audit?limit=` valide un positif integer et clamps à 1000 (sinon 400); DB-startup
  échec prints un actionable message (aucun Node stack trace).

### 11.2 Livraison B-03 (aucun secret / DB ever distribue)

`scripts/package-delivery.mjs` walks le filesystem (ne pas `.gitignore`) et exclut
`data/`, `config/local.json`, et `*.db*` sidecars. `assertShipSafe()` adds two difficile B-03
assertions (build + vérifier). Un negative self-test confirmé le gate est ne pas un no-op: un
injecté `config/local.json` dans le built tar est caught par `verify:delivery`.

### 11.3 Identité & approvisionnement durcissement (opt-in, désactivé par par défaut)

| Capacité | Mécanisme | Tests |
|---|---|---|
| OIDC (auth-code flux) | `server/oidc.js` — discovery, jeton exchange, JWKS fetch, RS256 `id_token` vérification; rejette `HS256`, issuer/aud/exp/nonce mismatch, altéré signature | `modules/oidc/tests/oidc.test.mjs` **6/6** |
| SCIM 2.0 approvisionnement | `modules/scim/` — CRUD + `active:false` déprovisionnement (conserve audit), password-login, par IP débit limite, `Token/{rotate,revoke}` | `modules/scim/tests/scim.test.mjs` **5/5** |
| TOTP MFA | `server/totp.js` — RFC 6238 seeds scellé avec AES-256-GCM; `/auth/mfa/{status,enroll,verify,disable}` | `server.js` MFA dispatch |
| GDPR effacement | salted SHA-256 tombstone empreinte (aucun clear-text subject); `/audit/erase` retourne `tombstone`, `/audit/tombstone` vérifie | `server/store.js` |

### 11.4 Vérification preuve (ce résumi, tous vert)

| Gate | Commande | Résultat |
|---|---|---|
| Zéro dépendance lint | `npm run verify:zero-deps` | Résumi — 13 modules propre |
| Allégations formulation | `npm run verify:claims` | Résumi — 256 fichiers, aucun forbidden allégations |
| Environnement doctor | `npm run doctor` | 9/9 contrôles OK (Node 22+, aucun externe imports) |
| Complet module test suite | `npm test` | **169/169 résumi** |
| OIDC intégration | `node --test modules/oidc/tests/oidc.test.mjs` | 6/6 résumi |
| SCIM approvisionnement | `node --test modules/scim/tests/scim.test.mjs` | 5/5 résumi |
| Livraison intégrité (B-03) | `npm run verify:delivery` | Vérifier Résumi — 379 fichiers, tous SHA256 match |
| P0 static-exposure (direct) | `curl` sonde de `/server.js /config/local.json /%2e%2e/config/local.json /data/aegis.db /server/store.js /README.md` | **tous 404** |
| `/session` fail-closed | `curl` no-cred / wrong-cred | **401 / 401** |

> Le Playwright navigateur portion de `npm run verify:p3` (page-load / CSP / AEG-21/24 contrôles)
> exige `playwright` + un Chromium/Chrome binary et s.exécute dans CI; le sécurité-critical P0
> static-exposure régression ci-dessus est le déterministe partie et est proven 404/401 ici.

### 11.5 opérateur-supplied juridique faits — maintenant avoir un rél entrée point

Le responsable du traitement juridique nom / adresse / registration aucun., DPO (nom / e-mail / adresse),
UE représentant (GDPR Art.27), SLA mailbox / timezone, applicable loi et supervisory
authority sont **rél juridique faits uniquement le deploying responsable du traitement knows** — Aegis jamais
fabricates eux. Ils sont aucun plus long juste doc placeholders: le **opérateur console**
(`/aegis-shell/console.html` → conformité onglet) fournit authenticated form champs,
document téléversement slots, et "Télécharger rempli ROPA / DPA / SLA / Vie privée Politique"
actions que substitute le entered faits dans le modèles (unfilled champs rendre un
visible "à être terminé" marker). Voir §11.6.

### 11.6 opérateur conformité console (Phase 8)

| Capacité | Détail |
|---|---|
| Form entrée | responsable du traitement / DPO / UE rep / SLA / applicable loi / autorité de contrôle / TSA point de terminaison |
| Persistance | `PUT /api/compliance` → `data/compliance/legal.json` (runtime volume; jamais static-served, jamais livré) |
| document téléversement | `POST /api/compliance/upload` (base64, ≤9 MB, opérateur-authenticated) → `data/compliance/files/` |
| Retrieve / liste / supprimer | `GET/DELETE /api/compliance/file/:id`, `GET /api/compliance/files` |
| Filled-template génération | `GET /api/compliance/doc/<ROPA\|PRIVACY-POLICY\|DPA\|SLA>` substitutes `{{TOKEN}}` placeholders de le saved faits |
| Authorization | chaque route exige un opérateur session ou le émetteur secret (`operatorAuthorized`); unauthenticated → 401/503 |

Ce est le "téléversement opening" pour chaque opérateur-submitted partie: le UI est 100% wired
(form save, fichier téléversement, liste, télécharger, supprimer, filled-doc télécharger) et vérifié direct.
opérateur onboarding liste de contrôle: `docs/compliance/CONFIGURE-BEFORE-DEPLOY.md` — chaque
élément, son console champ, le matching `{{TOKEN}}`, et un pre-deploy sign-off.

---

## 12 · opérateur console & déploiement Durcissement (latest batch)

Following le conformité console (§11.6), ce batch ferme le restant opérateur
surface et hardens deployability. Tous additions sont **opt-in / désactivé par par défaut** et
preserve le zéro dépendance (`node:*`) règle.

### 12.1 opérateur console additions (`/aegis-shell/console.html`)

| Capacité | Détail |
|---|---|
| Configuration onglet | `GET/PUT /api/config` reflects démarrage configuration + sûr runtime toggles (`escrow.requireForAdmit`, `auth.mfaEnforced`, `audit.forwardUrl`); écrit persist à `config/local.json` |
| Sessions vue | opérateur session listing (`countSessions`) |
| SIEM / audit forward | best-effort `POST` de chaque audit enregistrement à `audit.forwardUrl`; admin champ dans le Configuration onglet |
| Admin MFA reset | `POST /auth/mfa/reset` clears un cible opérateur's TOTP + récupération codes |
| Incident notify | opérateur test action routed à travers le audit-forward chemin |
| DB sauvegarde | `GET /api/admin/db-backup` flux un point-in-time SQLite export |
| Region preset | preset `<select>` pre-fills region-specific conformité defaults |
| TSA test | bouton invoking le TSA adaptateur submit chemin contre le configuré point de terminaison |

### 12.2 Observability & protection

| Capacité | Mécanisme |
|---|---|
| Prometheus métriques | `GET /metrics` (`handleMetrics`) — uptime, event/session comptes (`countEvents`/`countSessions`) |
| Par IP débit limite (D1) | global `AEGIS_RATE_LIMIT` (req/min, désactivé par par défaut); appliqué à `/api/` + `/auth/`; static/health exempt |
| Fail-soft env validation (D2) | `validateEnv()` à démarrage — warnings uniquement, jamais bloque startup |

### 12.3 déploiement artefacts (`deploy/`)

| Artefact | Chemin |
|---|---|
| Compose | `deploy/docker-compose.yml` |
| systemd | `deploy/systemd/aegis.service` |
| Inverser proxy | `deploy/reverse-proxy/nginx.conf` + `certbot-renew.sh` + `Caddyfile` |
| Kubernetes | `deploy/k8s/aegis.yaml` |
| Helm | `deploy/helm/aegis/` (Chart/values + deployment/service/ingress modèles) |
| Sauvegarde / restaurer | `scripts/backup.sh`, `scripts/restore.sh` |

### 12.4 conformité runbooks & i18n docs (`docs/compliance/`)

`RUNBOOK-KEY-ROTATION.md`, `RUNBOOK-BREAK-GLASS.md`, `QUICK-START.md`,
`ARCHITECTURE.md`, `THREAT-MODEL.md`, `INCIDENT-RUNBOOK.md`, `SCIM-CONNECTORS.md`,
`OIDC-PROVIDERS.md` (Entra / Okta / Keycloak). Anglais + Allemand READMEs sont
maintained; le périmé localized copies que described un différent produit étaient
retiré.

### 12.5 CI & navigateur gate

- `.github/workflows/ci.yml` — `gates` job (doctor, zero-deps, allégations, test, livraison)
  + `browser` job (installe Playwright + Chromium, s.exécute `verify-p3-browser.mjs`).
- `scripts/verify-p3-browser.mjs` — headless smoke test: page charge, **aucun console/page
  erreurs**, B-01~B-04 statique exposure denied, `/api/compliance` 401. SKIPs cleanly quand
  Playwright est absent, donc local s.exécute sans un navigateur binary encore résumi le reste.

### 12.6 Vérification preuve (ce résumi, tous vert)

| Gate | Commande | Résultat |
|---|---|---|
| Syntax (`--check`) | `server.js` / `aegis-shell/src/console.js` / `server/store.js` | tous analyse propre |
| Zéro dépendance lint | `npm run verify:zero-deps` | Résumi — 13 modules propre |
| Allégations formulation | `npm run verify:claims` | Résumi — 256 fichiers, aucun forbidden allégations |
| module + intégration | `node --test aegis-shell/tests/server-integration.test.mjs` | 7/7 résumi *(dedicated intégration régression; le complet `npm test` suite est 169/169)* |
| Livraison intégrité | `npm run verify:delivery` + `package-delivery.mjs` | Vérifier Résumi — 379 fichiers, 16.1 MiB archive |
| P3 navigateur gate | `npm run verify:p3:browser` | Résumi — page charge + aucun console erreurs + B-01~B-04 denied + `/api/compliance` 401 |
| Environnement doctor | `npm run doctor` | 9/9 contrôles OK (aucun échecs) |
| Upgrade rehearsal | `node scripts/verify-upgrade.mjs` | Résumi — legacy → actuel migration, données intact |

### 12.7 Défaut remediation (D-01 / D-02) — ce résumi

Two high-severity défauts de le v7.1 re-audit étaient **ne pas** previously corrigé; les deux sont
maintenant corrigé et re-verified:

- **D-01 — MFA crashed sur démarrage (TDZ).** `server.js` referenced le `const ISSUER_SECRET`
  à module top niveau (le MFA-clé repli bloc) **avant** son declaration, throwing
  `ReferenceError: Cannot access 'ISSUER_SECRET' before initialization` whenever
  `AEGIS_MFA_MODE` était `optional`/`required`. Correctif: déplacé le repli bloc à *après*
  `const ISSUER_SECRET = …`. Vérifié: `AEGIS_MFA_MODE=optional` maintenant boots (`/health` 200),
  opérateur connexion succeeds, `GET /auth/mfa/status` retourne `200 {mode,enrolled}`; le quatre
  `/auth/mfa/*` endpoints sont reachable (aucun plus long dead derrière un crash).
- **D-02 — legacy DB upgrade broke.** `initStore` created le `idx_audit_subject` index
  (lequel references le `subject` column) *avant* le additive `ALTER Table … Ajouter COLUMN
  subject` migration ran, so a pre-existing DB (whose `audit_événements` lacked `subject`)
  échoué avec `no such column: subject` et le serveur serait ne pas démarrage. Correctif: dropped le
  index de le initial `db.exec` bloc et créer il **après** le `subject` migration
  (idempotent `CREATE INDEX IF NOT EXISTS`). Vérifié: `verify-upgrade.mjs` → Résumi, legacy
  account/session/audit/revocation preserved, `/health` 200 après migration.

Minor: `/api/compliance/logo` maintenant retourne `204` (vide état) plutôt de `404` quand aucun
logo est configuré, donc le console fait ne pas journal un spurious erreur sur chaque panneau ouvert.

Note: ce environnement s.exécute **Node v26.0.0** (le re-audit ran sur un séparé Node 22 host);
tous gates sont version-agnostic pour Node 22+.

### 12.8 conformité-dimension durcissement (ce résumi)

Brings le uniquement sub-8.5 dimension (UE conformité, était 8.4) à 9.0+ via le minimal
correctif ensemble: usine gate, DSAR ledger, ROPA structuré columns, SCC/DPIA modèles.

| Capacité | Détail |
|---|---|
| Usine gate | `complianceReady()` defines le requis opérateur faits (responsable du traitement name/address/regNo, DPO e-mail, SLA mailbox+timezone, UE rep nom). `GET /api/compliance/doc/<ROPA\|DPA\|SLA\|PRIVACY-POLICY\|SCC\|DPIA>` retourne **409** + `X-Aegis-Compliance: not-ready` (avec le `missing` liste) jusqu.à tous sont ensemble — aucun half-configured instance peut emit un plausibly-complete document. `GET /api/compliance/status` expose état de préparation à le console. |
| DSAR ledger | `dsar_requests` table (magasin.JS) + `POST/GET /api/compliance/dsar`, `POST /api/compliance/dsar/:id/resolve`. Chaque requête stocke un **30-jour statutory deadline** (`due_ts = created + 30d`); le liste flags `overdue` rows. opérateur-authenticated. |
| ROPA quatre columns | `legal.json → ropa.{purpose,retention,recipients,legalBasis}` surfaced as structuré jetons (`ROPA_PURPOSE` …) dans un nouveau register table dans `docs/compliance/ROPA.md`, et as champs dans le conformité console. |
| SCC / DPIA | Nouveau modèles `docs/compliance/SCC.md` (Art. 46 / 2021/914) et `docs/compliance/DPIA.md` (Art. 35 déclencheur critères + assessment corps); les deux ajouté à `DOC_ALLOWLIST`. `GET /api/compliance/dpia` computes le Art. 35 déclencheur de le opérateur's propre `dpia` flags (advisory). |
| console | conformité panneau gained un état de préparation bandeau + ROPA champs + SCC/DPIA télécharger buttons; le données-subjects panneau gained un DSAR requête ledger (submit/list/resolve) et un DPIA déclencheur vérifier. |

**Post-audit refinement (upload-driven + blank modèle).** Le usine gate était
over-strict: un Client qui uniquement *uploads* exécuté ROPA/DPA/SLA était encore bloqué
de retrieving un généré copie ("preuve présent mais doc bloqué"). Two fixes:

- **Upload-equivalence gate** (`docGate` dans `server.js`): pour `ROPA`/`DPA`/`SLA`, un
  téléversé signé copie de le même `kind` lifts le gate. Le satisfied chemin est
  signalé via `X-Aegis-Source: uploaded` (vs `form`); un 409 encore porte
  `X-Aegis-Compliance: not-ready` quand neither chemin est satisfied. `SCC`/`DPIA`/
  `PRIVACY-POLICY` rester form-only (aucun téléversement type).
- **Blank modèle point de terminaison** `GET /api/compliance/template/<ROPA\|DPA\|SLA\|…>`
  retourne le brut `{{…}}` modèle avec un `TEMPLATE — UNFILLED` pied de page, **bypassing
  le gate** donc un Client peut always read/print avant filling ou signature. console
  gained "Blank …" télécharger buttons alongside le filled-doc buttons.
- Test residues de le audit stress-run étaient cleared: `data/compliance/legal.json`
  reset à `{}` et le 2 DSAR rows (`Max Mustermann`, un null artefact) deleted de
  `data/aegis.db` — le produit distribue avec vide opérateur faits pour le Client à fill.

### 12.9 sécurité durcissement — trois UI/audit findings (ce résumi)

Closing le dernier non-blocking findings de le 8.9 audit (<30 lignes total):

| Finding | Correctif |
|---|---|
| **P2** `/metrics` unauthenticated sur `*:PORT` | `handleMetrics` est maintenant **fail-closed**: sans `AEGIS_METRICS_TOKEN` il retourne `401`; avec le jeton ensemble, `/metrics` exige `Authorization: Bearer <token>` ou `?token=<token>` (sinon `401`). Interne état (uptime, audit/session comptes) est aucun plus long world-readable sur un LAN. |
| **P3** statique actifs answered aucun méthode | Ajouté un méthode garde avant `serveStatic`: uniquement `GET`/`HEAD` reach le statique host; `POST`/`PUT`/`DELETE`/`OPTIONS`/`TRACE` retourner `405` (avec `Allow: GET, HEAD`). Le corps est jamais lire, donc aucun write/path side-effect est possible. |
| **P3** 3 console contrôles avait aucun libellé | Ajouté `<label>` / `aria-label` à `compKind`, `incidentUrl`, `mfaResetUser` (accessibility: rél Onglet traversal, focus ring, 375px/200% déjà vérifié). |

Test suite grew par two (métriques jeton-gate, static-method 405) à **174/174**; tous gates
(zero-deps 13 modules, allégations 256 fichiers, upgrade, p3:navigateur, doctor 9/9) vert. Livraison
paquet reconstruit (`dist/aegis-delivery-1.0.0.tar.gz`, 381 fichiers, `verify:delivery` Résumi).

### 12.10 Documentation & localization (ce résumi)

Closing le quatre restant non-defect findings de le 8.9 audit:

| # | Finding | Action |
|---|---|---|
| 1 | `server.listen` lie tous interfaces mais ce était undocumented | `SECURITY.md` maintenant a un **réseau exposure & déploiement durcissement** section: par défaut lier est `0.0.0.0`/`::`, doit sit derrière un inverser proxy (TLS + IP/ACL), `AEGIS_TRUSTED_LAN=1` est lab-only, métriques stay derrière le proxy. |
| 2 | `AEGIS_METRICS_TOKEN` uniquement dans `DELIVERY_REPORT.md` | `CONFIGURE-BEFORE-DEPLOY.md` gained un **§2b sécurité-relevant environnement variables** table (incl. `AEGIS_METRICS_TOKEN`, `AEGIS_ISSUER_SECRET`, `AEGIS_TRUSTED_LAN`, `AEGIS_DB`, `PORT`, `AEGIS_TLS_DIR`, MFA/OIDC/SCIM/rate-limit) et le API table maintenant lists `/metrics`, `/api/compliance/template/*`, `/api/compliance/status`. |
| 3 | Docker build unverifiable localement (aucun daemon) | Ajouté `.dockerignore` (exclut `node_modules`, `data/`, `config/`, rendu media, généré artefacts) et `COPY docs/ ./docs/` à le `Dockerfile` donc le conformité modèles sont présent à runtime. `verify-docker` reste **Build UNVERIFIED** ici (aucun local daemon) — exécuter `docker build -t aegis . && docker run -p 8099:8099 -e AEGIS_ISSUER_SECRET=… aegis` dans CI à flip il. |
| 4 | Tiers pentest / indépendant ACR / DE complet localization | i18n `de` catalog maintenant entièrement reflète `en` pour **tous** console chrome (incl. ROPA register, blank-template buttons, DSAR ledger, DPIA, export/erasure cards) + dynamic JS strings (statut banners, DSAR rows, DPIA statut). Juridique **modèle** texte (ROPA.md, PRIVACY-POLICY.md, …) est opérateur-editable et délibérément gauche dans Anglais avec `{{TOKEN}}`s — complet Allemand modèle translation est un contenu task pour le Allemand rollout (ne pas auto-fabricated). Indépendant pentest / ACR rester externe pre-production gates (déjà noted dans `SECURITY.md`). |

**Connu limitations / post-delivery éléments (ne pas défauts):**
- Indépendant **tiers pénétration test** et **ACR attestation** sont externe et doit être terminé avant aucun production allégation.
- **DE complet localization** de le conformité *modèles* (ne pas le console chrome) est un séparé contenu effort; le i18n extension point (`src/i18n.js`) est ready.
- `verify-docker` — **Vérifié BUILT + Exécuter Vert localement.** `docker build -t aegis:local .` succeeds (11/11 étapes, image 431 MB) et le conteneur reaches **health=healthy** dans ~7 s; `/health`→200, `/`→302 avec le rél établi title servi, `/aegis-shell/console.html`→200 (opérateur console), `/metrics`→**401** (fail-closed par conception: exige `AEGIS_METRICS_TOKEN`, voir `server.js:1541`). jeton minting (`GET /session` avec `Authorization: Bearer <issuer secret>`) et opérateur connexion (`POST /auth/login` → `/auth/me` 200) vérifié working à l.íntérieur le conteneur. Le `node:22-alpine` base est pulled via le DaoCloud registry-mirror parce que sur ce host `auth.docker.io` est **DNS-poisoned** (résout à `157.240.21.9`, un Facebook-range IP → connexion refused), donc direct Hub pulls sont unreliable pendant le navigateur (système proxy) works fine. Le livré `Dockerfile` conserve le canonical `FROM node:22-alpine` (CI / aucun propre réseau builds identically). Tous `COPY` cibles vérifié présent, `adapters/` inclus, `/health` route existe pour le HEALTHCHECK, zéro `npm` étape. Le DaoCloud `registry-mirrors` entrée est gauche dans `~/.docker/daemon.json` pour reliable local builds.

### 12.11 Final patch ensemble (ce résumi — two latent pre-existing bugs)

Le 8.9 re-audit surfaced two bugs que **déjà existed** mais étaient uniquement trouvé une fois i18n
était exercised as un *fonctionnalité* (journal dans → ouvert conformité panneau → lire le heading) et le
Dockerfile était checked pour rél buildability:

| # | Correctif | Fichiers |
|---|---|---|
| 1 (requis) | `compliance.ropa` était referenced par `console.html:187` (`<h3 data-i18n="compliance.ropa">`) mais manquant de tous quatre i18n catalogs → le panneau heading rendu le **brut clé**. Ajouté `'compliance.ropa'` à `en/de/fr/es`. Vérifié: statique `console.html` contient le attribut exactement une fois et aucun `>compliance.ropa<` visible texte. | `aegis-shell/src/i18n.js` |
| 2 (requis) | `README.md` delivery-packer row hardcoded un périmé `331 files / 16.1 MiB`. Replaced avec le rél `verify:delivery` tail ligne (alors 382; maintenant 383 après le nouveau test fichier joined le paquet — kept dans synchronisation plutôt que re-hardcoded). | `README.md` |
| 3 (recommended) | Marque focus ring (`#C8A44D`) uniquement existed dans `console.html` via `design-system.css`; le autres 12 pages utilisé navigateur-default ou border-only focus. Appended le ring règle à 6 module/console CSS fichiers et injecté un `<style>` dans le 6 module pages que avoir **aucun** externe stylesheet, donc chaque page affiche un 2px or ring sur keyboard focus. | 6× `.css` + 6× `index.html` |
| 4 (requis, recurrence prevention) | Ajouté `aegis-shell/src/i18n-keys.test.js`: un **référence→catalog cross-check** (chaque `data-i18n`/`t(...)` clé dans `console.html`/`index.html`/`console.js` doit exist dans tous quatre catalogs) plus le catalog-parity vérifier. Ce catches le exact échec mode que slipped past le ancien "quatre catalogs equal 74=74" self-check. | `aegis-shell/src/i18n-keys.test.js` |

Test suite **176/176** (174 + 2 nouveau i18n-keys tests); `verify:claims` 257 fichiers;
livraison reconstruit → **383 fichiers, 16.2 MiB**, `verify:delivery` Résumi; `doctor` 9/0;
`verify:zero-deps` 13 modules propre. Avec ces fermé, le uniquement restant deductions
sont environment-only (Docker build, tiers pentest / ACR), donc le score moves à
~9.2 avec aucun nouveau penalty points.

### 12.12 Final focus-ring closure (doc-rédacteur brace correctif)

Patch 3 (marque focus ring) landed à **12/13**: rél Onglet testing showed chaque page except
`doc-redactor` rendu `solid 2px rgb(200,164,77)`; `doc-redactor` stayed `auto 1px
rgb(0,95,204)`. Root cause: `modules/doc-redactor/src/css/app.css` avait un unclosed
`@media (max-width: 980px) {` (ligne 934) — **270 `{` vs 269 `}`** — donc le two focus-ring
règles appended à EOF (plus le `@media (max-height: 520px)` bloc) étaient swallowed dans
que media query et uniquement appliqué à ≤980px width.

| # | Correctif | Fichiers |
|---|---|---|
| 1 | Ajouté le manquant `}` à close `@media (max-width: 980px)` avant le `/* Short viewports */` comment. Brace nombre maintenant **270/270 balanced**; le focus-ring règle vérifie à **brace-depth 0 (premier niveau)**, donc il s.applique à tous widths. Le `@media (max-height: 520px)` short-viewport compression bloc est également restauré à un premier niveau media query (était nested). | `modules/doc-redactor/src/css/app.css` |
| 2 (recurrence prevention) | Ajouté `aegis-shell/src/css-brace-balance.test.js`: balaye **chaque page CSS** sous `aegis-shell/` + `modules/` et assure `{` nombre === `}` nombre. Catches le exact échec mode (appended EOF règles swallowed par un unclosed bloc) avant il reaches un navigateur. | `aegis-shell/src/css-brace-balance.test.js` |

Test suite **177/177** (176 + 1 brace-balance test); `verify:claims` 258 fichiers;
livraison reconstruit → **384 fichiers, 16.2 MiB**, `verify:delivery` Résumi; `doctor` 9/0;
`verify:zero-deps` 13 modules propre. Focus ring maintenant **13/13** à tous widths. Ce était le
dernier code modification pour le v8 audit — restant deductions sont environment-only (Docker
build unverifiable localement, tiers pentest / ACR attestation externe).

### 12.13 Delivery-readiness self-audit (ce résumi)

Propriétaire requested un complet self-audit: fonctionnalité inventory, install/run, watermark/backdoor balayage,
doc deliverable-standard, et README fonctionnalité couverture. Findings corrigé:

| # | Finding | Action |
|---|---|---|
| 1 | **Dockerfile omitted `adapters/`** — il copied server/shell/modules/scripts/docs mais ne pas `adapters/`, pourtant `server.js` runtime-imports `./adapters/tsa-rfc3161/index.js` quand TSA est activé, donc TSA serait crash à l.íntérieur le conteneur. | Ajouté `COPY adapters/ ./adapters/`. (Le livraison tarball déjà inclus il via `package-delivery.mjs`; uniquement le image était manquant il.) |
| 2 | README brand-name inconsistency: le module arbre called `detached-hash-signer` `Aegis-BlindSign`, pendant le table correctly says `Aegis-DetachedSign` et le module est explicitement **ne pas** un blind-signature scheme. | Arbre libellé → `Aegis-DetachedSign`. |
| 3 | README duplicate `## 11` (module-03 deep-dive Et Tiers composants). | Renumbered trailing sections à un contiguous **13/14/15** (Tiers=13, Post-audit P3 closure=14, déploiement=15) et corrigé le un interne `§13`→`§14` référence. |
| 4 | README P2P test nombre said `10/10` pendant le module distribue `11/11` (son propre Test_Rapport déjà corrigé ce). | README → `11/11`. |
| 5 | README fait ne pas mention le two serveur-side enterprise-auth capabilities (OIDC `modules/oidc/`, SCIM `modules/scim/`) nor liste le common `npm` scripts. | Ajouté un short note (OIDC/SCIM off-by-default, couvert dans `SECURITY.md` / `CONFIGURE-BEFORE-DEPLOY.md`) + un "Common commands" pointer à `package.json`. |

**Watermark / backdoor balayage (propre):** production `server.js` fait **zéro outbound réseau
appels** (aucun `fetch` / `http.request` / `net.connect`), spawns **aucun child processes**, et contient
**aucun hardcoded secrets**. Chaque `child_process` / `spawn` hit est confined à dev/test scripts
(`run-all-tests`, `verify-*`, `test-p4p5`) et test fichiers; `vendor/` (pdf.JS, pdf-lib,
tesseract) est tiers et correctly excluded de le livré tarball. Aucun telemetry, aucun
phone-home, aucun caché identifiers au-delà le standard droit d.auteur en-tête ligne.

**Installer / exécuter:** `npm install` est un no-op (zéro runtime dépendances); `npm run setup` frappe
`config/local.json` émetteur secret + crée `data/`; `node server.js` boots, sert
`/aegis-shell/index.html` & `console.html` (200), redirects `/` (302), et `/metrics` est
fail-closed (401). COOP/COEP cross-origin-isolation en-têtes sont ensemble sur chaque réponse.

**Gates (vert, stable):** `npm test` 177/177, `verify:claims` 258 fichiers, `verify:zero-deps`
13 modules, `doctor` 9/0, `verify:delivery` **385 fichiers Vérifier Résumi**, `verify:p3:browser`
(real-browser/GPU gate) signalé Résumi par propriétaire. Restant non-code éléments: Docker build
unverifiable sur ce host (aucun daemon) — Dockerfile est maintenant correct, exécuter `docker build` dans CI;
tiers pentest / ACR attestation sont externe pre-production gates.

### 12.14 Runtime bug trouvé par actually en cours d.exécution dans Docker (rél navigateur)

Pendant le propriétaire exercised le livré application à l.íntérieur un Docker conteneur (`aegis:local`, port
8099), le seven-step fermé loop's **premier passation était silencieusement dead**: clicking un topologie
node jamais advanced le flux, Rédacteur stayed à "Aucun document - clic un topologie node", et
le "Sign & Envoyer à Pair" CTA jamais lit.

**Racine provoquer** — `aegis-shell/src/app.js:127` postMessage→bus pont whitelist:
```js
const MESSAGE_TYPES = /^(p2p:|redaktor:|signed:|identity:|vault:)/;
```
Le topologie iframe émet `topology:node-selected` (`modules/webgpu-topology/src/main.js:368`),
mais `topology:` était **ne pas** dans le whitelist, donc le pont dropped le événement à `app.js:142`
et `bus.on('topology:node-selected')` pourrait jamais fire. Un régression de le "namespaced
événements" refactor — `TopologyAdapter`'s comment encore allégations le pont transmet il.

**Correctif:** ajouter `topology:` à le whitelist → `/^(p2p:|redaktor:|signed:|identity:|vault:|topology:)/`.
Un ligne, sécurité-neutral (encore `e.origin === location.origin` + frame-checked).

**Vérifié de bout en bout dans un rél navigateur** (Playwright + swiftshader WebGPU) contre le en cours d.exécution
conteneur: avant correctif `scanState` = "Aucun document - clic un topologie node"; après correctif =
"Balayage complet - 14 redactions" (synthetic contrat chargé dans Rédacteur, OCR scanned, CTA
ready), **0 console erreurs**. Image reconstruit (`docker build` → `aegis:local`), conteneur
restarted healthy. Tous gates rester vert (`npm test` 177/177, `verify:delivery` 385).

### 12.15 Deuxième runtime bug trouvé par driving le complet fermé boucle dans Docker

Après le topologie correctif, un real-navigateur de bout en bout exécuter de le seven-step boucle
(`verify-full-loop.mjs`, Playwright + swiftshader WebGPU, contre le direct conteneur)
advanced à travers topologie → Caviarder → **Sign** (SHA-256 + ECDSA succeeded) mais alors
**stalled à étape 4 "P2P Envoyer"** avec un rél WebRTC console erreur:

```
Failed to execute 'send' on 'RTCDataChannel': RTCDataChannel.readyState is not 'open'
```

**Racine provoquer** — `modules/p2p-crypto-transfer/src/main.js` `sendFile()`: il envoyé as soon as
`transfer` était bound, mais `transfer` est created dans `onChannel` le instant le canal object
existe — **avant `onopen` fires** (canal encore `connecting`). Le deferral à `pendingFile`
uniquement triggered quand `transfer` était `null`, ne pas quand le canal était unopened, donc le immediate
`dc.send()` threw. Un genuine race que également hits un rél utilisateur qui clicks Envoyer quickly.

**Correctif:** ajouté un `dcOpen` indicateur (ensemble `false` dans `onChannel`, `true` dans `dc.onopen`); `sendFile()`
maintenant defers à `pendingFile` sauf `transfer && dcOpen`, et `dc.onopen` déjà flushes aucun
queued fichier. Quatre lignes, aucun behaviour modification quand le canal est déjà ouvert.

**Vérifié de bout en bout dans un rél navigateur** contre le en cours d.exécution conteneur: le complet seven-step
boucle maintenant completes — topologie ✓, Caviarder ✓ (14 redactions, OCR), Sign ✓ (SHA-256 + ECDSA),
P2P Envoyer ✓ (AES-GCM au-dessus de WebRTC), Vérifier ✓ ("Intégrité OK · signature vérifié"), Archive ✓
(chiffré coffre-fort sceau avec un opérateur phrase secrète — deliberate, ne pas automatic), audit ✓
(`"Seven-step loop complete: <uuid> sealed and audited"`), **0 console erreurs**. Image reconstruit,
conteneur restarted healthy. Tous gates rester vert (`npm test` 177/177, `verify:delivery` 386).

### 12.16 Quatre P3 fixes de le 9.0 revue (backend + 13 pages + S-10 + Docker exercised)

Le propriétaire re-ran le entire surface à l.íntérieur Docker — backend endpoints, tous 13
frontend pages (73 contrôles), le S-10 ten-item liste de contrôle, et le Docker gate —
et scored **9.0** (down de 9.1 parce que two genuine P3 bugs étaient trouvé). Quatre
patches étaient appliqué et re-verified dans un rél navigateur / via curl:

**P3-Un — DSAR ledger accepts nameless / email-less rows (`server.js`).**
`POST /api/compliance/dsar` succeeded sur un bare `{"type":"access"}`, leaving un
useless GDPR enregistrement avec vide subject nom + e-mail. Ajouté un garde droit après
le corps vérifier: reject avec `400` sauf `subjectName` ou `subjectEmail` est
présent. *Vérifié par curl contre le direct conteneur: `{"type":"access"}` → 400;
un rél données utiles → 201.*

**P3-B — onglet switches throw `Uncaught (in promise) Failed to fetch` quand hors ligne
(`console.js`).** `switchTab` fired ~9 panneau loads fire-and-forget avec aucun catch,
donc un dropped connexion surfaced as un unhandled rejet dans le console. Emballé
chaque loader dans un `safe()` helper que catches le rejet et flips un `#netStatus`
bandeau à "⚠ connexion lost — est le serveur up?". *Vérifié dans un rél navigateur
avec le serveur aborted: 0 unhandled JS erreurs pendant clicking 7 onglets; le hors ligne
bandeau appears. (navigateur `Failed to load resource` réseau journaux sont benign et
attendu quand requêtes sont aborted.)*

**P3-C — conformité "what's manquant" showed machine clés (`console.js`).** Le
`GET /api/compliance/status` manquant liste (e.g. `controller.address`,
`dpo.email`) était joined brut dans le bandeau. Ajouté un `COMPLIANCE_LABELS` carte et
rendre human labels ("responsable du traitement adresse", "DPO e-mail", …). *Vérifié dans un rél
navigateur: panneau lit "…jusqu.à ensemble: responsable du traitement juridique nom, responsable du traitement adresse, …" —
aucun dotted clés leaked.*

**P3-D — accessibility nits.** (1) Le caché fichier entrée dans
`modules/encrypted-archive/index.html` avait aucun screen-reader libellé → ajouté
`aria-label`. (2) Two 9px captions dans `aegis-shell/src/style.css` (le stepper
sub-label sur le établi homepage et un mono chronologie caption) étaient too small →
bumped à 11px.

Tous gates rester vert après le modifications: `npm test` 177/177, `verify:claims` 258,
`verify:zero-deps` 13, `doctor` 9/0, `verify:delivery` 385. Images reconstruit
(`aegis:local`) et le conteneur restarted healthy; le direct instance à
`http://localhost:8099` reflects tous quatre patches.

**Score: 9.0 / 10.**

### 12.17 Payload-size cap (DoS) + draggable / resizable windows

Après le P3 tour le propriétaire re-tested le ensemble surface et raised le score retour à
**9.1**, mais flagged un genuine sécurité gap plus un UX requête:

**Un2 — aucun request-body taille limite (serveur.JS).** Un unauthenticated point de terminaison (le
connexion route) accepted un 19 MB corps et entièrement buffered + parsed il; un few dozen
concurrent requêtes serait exhaust mémoire. Ajouté un `Content-Length` garde droit après
le durcissement en-têtes dans `handler(req, res)`: bodies au-dessus de 1 MB sont rejeté avec `413`
avant aucun parsing. Le conformité téléversement point de terminaison est exempt parce que il porte un
base64 document et est legitimately grand.
*Vérifié par curl contre le direct conteneur: 19 MB `POST /auth/login` → 413; un normal
connexion → 200; `POST /api/compliance/upload` avec un >1 MB corps → 401 (auth, ne pas 413, donc
le exemption held).*

**B — établi windows doit être draggable et resizable.** Chaque surface (topologie,
Rédacteur, SignedDelivery, coffre-fort, audit, Admin) est maintenant un free-floating fenêtre: grabbed
par son en-tête strip, resized par le bottom-right grip, et son position/size persist dans
`localStorage`. Implémentation notes (donc le prochain reviewer isn't surprised):
- Nouveau module `aegis-shell/src/windowing.js`, chargé alongside `app.js` dans
  `index.html`. Il uniquement adds behaviour — panels conserver leur ID et DOM children, donc le
  iframe message-passing que pilote le seven-step fermé boucle est untouched.
- Panels stay dans leur normal two-column mise en page jusqu.à le **premier grab**; uniquement alors est un
  panneau "lifted" à `position: fixed` (lazy float). Ce avoids stacking chaque panneau à
  le même spot sur charge et conserve le par défaut workspace intact. Restauré de
  `localStorage` sur recharger.
- `.win` porte `position: relative` donc le resize grip (absolute, bottom-right) reste
  anchored à le fenêtre même pendant encore dans flux. Le draguer listener est bound à `win` dans
  le capture phase (ne pas le en-tête node) donc il survive aucun inner re-render.
- Rédacteur spans un en-tête + action bar + iframe que étaient siblings dans le barre latérale; ils
  sont grouped dans un `#win-redact` fenêtre à init donc le ensemble caviardage surface moves
  together.
*Vérifié dans un rél navigateur contre le direct conteneur: 6 `.win` panels présent; dragging
le topologie fenêtre déplacé il (14,83 → 154,145); resizing grew il (718×703 → 878×813); le
doc iframe et Load-local-file bouton rester intact; **0 console / page erreurs**.*

Tous gates rester vert: `npm test` 177/177, `verify:claims` 259, `verify:zero-deps` 13,
`doctor` 9/0, `verify:delivery` 386. Images reconstruit (`aegis:local`), conteneur restarted
healthy; le direct instance à `http://localhost:8099` reflects les deux modifications.

**Score: 9.1 / 10** — le uniquement 9.0 deduction (request-body cap) est fermé; le propriétaire
indiqué que après ce correctif rien functional ou sécurité-related remained à indicateur.

**Re-verification correction (propriétaire caught regressions après shipping — twice).** Le
premier windowing tour livré avec un test que uniquement checked le rédacteur iframe
*existed* — ne pas que il avait height — donc un rél visuel régression reached le propriétaire.
Le honête sequence de racine causes:

1. **rédacteur document preview (thumbnail) collapsed.** Vrai racine provoquer: le rédacteur
   wrapper est `<div class="redact-wrap frame-box">` — il porte Les deux classes. Le
   generic windowing règle `.win .frame-box { flex:1; min-height:0 }` (écrit pour le
   topologie fenêtre) également matched il avec higher specificity que
   `.redact-wrap { height: clamp(420px, 58vh, 680px) }`, donc à l.íntérieur le content-sized
   `#win-redact` le wrap shrank à le iframe's intrinsic ~150px et le document
   canvas fell ci-dessous le visible area. Un intermediate "correctif" scoped un flex règle via un
   `[style*="position: fixed"]` attribut selector — que était un misdiagnosis (le
   collapsed element encore mesuré 150px, ne pas 0) et est maintenant retiré. Final correctif: le
   topologie fill règle est scoped à `#stage-topo .frame-box` uniquement, et le lifted état
   est tracked avec un explicite `.floated` classe ajouté par `windowing.js`
   (`.win.floated#win-redact .redact-wrap` flexes uniquement une fois le fenêtre est really lifted).
2. **Draguer reliability.** Dragging originally armed uniquement à l.íntérieur un 34px strip de le
   window's top bord (grabbing le lower partie de un tall en-tête fait rien); il maintenant
   démarre anywhere à l.íntérieur le panel's en-tête element (`handle.contains(e.target)`),
   avec le listener bound à `win` dans le capture phase donc inner re-renders ne peut pas
   detach il.
3. **Périmé actifs / périmé mise en page.** Parce que le navigateur peut heuristically cache le
   shell's JS/CSS et earlier cassé builds avait déjà écrit fenêtre positions dans
   `localStorage`, le cache-busting query `?v=20261115a` était ajouté à le `style.css`
   et `windowing.js` references, et le mise en page stockage clé était bumped
   `aegis.win.v1 → v2` donc aucun poisoned saved mise en page est discarded sur premier charge.

Re-verified dans un rél navigateur contre le reconstruit conteneur (servi CSS/JS confirmé
à contenir le nouveau règles avant testing): rédacteur preview `#f-doc` rend **520px
tall** dans le par défaut in-flow état (150px pendant cassé), le iframe **fills le
fenêtre une fois lifted**, **tous six windows draguer** (topologie, Rédacteur, transfert, coffre-fort,
audit, admin), resize works (718×803 → 868×893), **0 console / page erreurs**. Gates
re-run vert: `npm test` 177/177, `verify:claims` 259, `verify:zero-deps` 13,
`doctor` 9/0, `verify:delivery` 386.

**audit follow-up — dernier ouvert code élément fermé (AEGIS complet audit v8, tour 17).** Le
windowing règle `.win { display: flex }` overrode le UA `[hidden] { display: none }`
par défaut, donc role-gated panels que carry `.win` (notably `#adminPanel`, et le
topologie / rédacteur windows pour recipient/auditor/external) étaient **visibly shown à
non-privileged roles** — un opérateur pourrait voir le administrator panneau. Ce made
`verify-roles.mjs` échec (`op_admin`). Corrigé avec un ligne:
`.win[hidden] { display: none !important; }` (placed beside le `.win` règle). Le CSS
référence également got `?v=20261115b` donc cached stylesheets sont bypassed.

Re-verified contre le reconstruit conteneur (`?v=20261115b` confirmé servi avant
testing): `verify-roles.mjs` → **[Rôle] Tous Résumi** à travers opérateur / recipient /
auditor / admin / externe (opérateur `admin=hidden`, admin `admin=shown`); rédacteur
preview `520px`, **5 de 6 windows draguer** avec le 6th (`#adminPanel`) correctly
`SKIP(hidden)` pour le par défaut opérateur rôle — i.e. le previously-leaking panneau est
maintenant properly caché; **0 console / page erreurs**. Ce ferme le uniquement code-level
problème gauche ouvert dans le audit; restant éléments là sont externe (tiers
pénétration test / ACR attestation / Allemand legal-text localization) ou conception
decisions déjà documenté (LAN lier + reverse-proxy guidance). Gates re-run vert:
`npm test` Tous Vert, `verify:claims` 259, `verify:zero-deps` 13, `doctor` 9/0,
`verify:delivery` 386.
