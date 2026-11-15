<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: README.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# AEGIS - Secure Bord Collaboration Établi

**Anglais** · [Deutsch](README.de.md) · [Français](README.fr.md) · [Español](README.es.md)

> **Closed-loop, zero-trust, local-first collaboration pour classified industrial
> documents** — chaque computation reste sur le opérateur's machine, le application jamais
> contacts un tiers origine. (Un hosted service / hors ligne cache est hors de portée.)
> Un clic dans un million-node digital-twin topologie pulls le associated
> maintenance contrat dans un entièrement local caviardage moteur. Le destructive redacted PDF
> est alors hashed, signé, livré peer-to-peer, vérifié, scellé dans un chiffré OPFS
> coffre-fort, et committed à un détecteur de falsification chaîne d'empreintes: **seven stages, ten audited actions,
> un shell**.
>
> **Le serveur jamais voit le topologie, le document, le fichier, un clé, ou un phrase secrète.**
> Chaque sensible octet reste à l.íntérieur le navigateur; transport est P2P direct.

> **licence:** ouvert source sous le [Apache licence 2.0](./LICENSE) (SPDX `Apache-2.0`).
> Gratuit à utiliser, y compris commercially; payé support est facultatif. Voir [§ licence](#license).

---

## 1 - Pourquoi ce existe (le Allemand industrial / medical pain point)

Un classified manufacturer ou clinic sur un **air-gapped ou intranet** réseau doit:

1. Monitor un **huge appareil / réseau topologie** (connected cars, usine sensors) - et
   Canvas2D/SVG dies à échelle.
2. Ouvert un device's **maintenance contrat** que contient outsourced workers' ID numbers
   et bank comptes - et doit **jamais téléversement** il à un cloud OCR service.
3. Hand le cleaned document à un colleague sur le même site - avec **aucun chat application** et
   absolutely ne pas WeChat/Slack.
4. **Vérifier** lequel clé signé il (un auto-déclaré clé, ne pas un juridique identité), que il était ne pas altered dans transit, où le scellé copie
   vit, et lequel actions happened dans lequel order.

Quatre séparé difficile problems. AEGIS résout eux as **un single-page établi** whose
indépendant modules partager un unique architecture: **tout s.exécute localement, rien est
téléversé, et un EventBus pilote le ensemble flux.** Le shell possède le état machine;
chaque module reste un reusable, autonome produit.

---

## 2 - Le s sept étapes fermé boucle

Le older three-stage diagram (topologie -> caviarder -> P2P) est retired. Un topologie clic
maintenant pilote un complet boucle avec signature, vérification, archiving et audit.
Le signalisation serveur encore relays uniquement SDP/ICE - jamais octets.

```
 [1] TOPOLOGY           Aegis-Topology          topology:node-selected {nodeId, x, y}
        |
        | redaktor:load-doc  (associated contract File)
        v
 [2] REDACT             Aegis-REDAKTOR          redaktor:export-ready {name, blob}
        |
        | SHA-256(pdfBytes) -> signHash(raw digest) -> assembleArtifact()
        v
 [3] SIGN               Aegis-Identity          identity:signed {hash, signature, publicKey}
        |
        | artifact retained as AegisContext.pendingArtifact
        | P2PAdapter.sendFile(artifact)
        v
 [4] P2P SEND           Aegis-SignedDelivery    p2p:file-sent
        |
        | AES-GCM chunks over a WebRTC DataChannel
        v
 [5] VERIFY             Aegis-Identity          p2p:file-received -> signed:verified
        |
        | Archive to Vault unlocks only on a passing verdict
        v
 [6] ARCHIVE            Aegis-Vault             vault:sealed -> OPFS (.aegis container)
        |
        | every stage calls AuditTrail.append()
        v
 [7] AUDIT              Aegis-AuditTrail        audit:append -> SHA-256 hash chain
```

**Ten audited actions, étape par étape:**

1. `topology:node-selected` fires avec le node id et coordinates; le shell resets le
   exécuter et enregistrements `AegisContext.selectedNode`.
2. Le shell intercepte le node et émet `redaktor:load-doc`, loading **que node's**
   associated contrat dans `Aegis-REDAKTOR`.
3. `redaktor:export-ready` porte le destructive PDF `Blob`; le shell computes son
   SHA-256 empreinte avec Web Cryptographie.
4. `IdentityAdapter.signHash(hash)` produces un ECDSA P-256 signature plus un Base64 SPKI
   public clé.
5. `identity:signed` publie le empreinte, signature et public clé; le PDF et le
   signature trailer sont packed dans un signé artefact et conservé dans le Contexte as
   `pendingArtifact`.
6. `P2PAdapter.sendFile()` flux le artefact au-dessus de le AES-GCM canal;
   `p2p:file-sent` marques le passation.
7. `p2p:file-received` triggers `IdentityAdapter.verifyArtifact(pendingArtifact)`:
   recompute le document empreinte, compare le embedded empreinte, vérifier chaque signataire.
8. `signed:verified` unlocks le **Archive à coffre-fort** bouton; un failing verdict émet
   `signed:rejected` et conserve le bouton verrouillé.
9. Le opérateur enters un phrase secrète; `vault.seal()` écrit un AES-GCM-256 `.aegis`
   conteneur dans OPFS et `vault:sealed` ferme le boucle.
10. Chaque étape appels `AuditTrail.append()` et émet `audit:append`. Le right-hand
    chronologie repaints sur chaque lien, le seven-step Stepper turns vert étape par étape,
    et le final sceau lien lights tous seven.

**Pourquoi vérification utilise le sender-side copie.** Un grand transfert peut stream droit à
disque sur le récepteur (`showSaveFilePicker`) et donc produce aucun complet en mémoire
`Blob` là. Le shell conserve le exact octets il signé as `pendingArtifact` et utilise
que empreinte plus le original document as le vérification base de référence. Dans le same-machine
`BroadcastChannel` démo le octets sont identique; dans production ce respects le physical
limite de disk-streamed receivers plutôt de forcing un complet Blob dans RAM.

**Multi-signataire capable.** Le signature trailer est `signers: [{id, pub, sig}]` et
`verifyArtifact()` vérifie chaque entrée. `IdentityAdapter` currently problèmes un signataire
(`A`) pour le automatisé boucle; adding further signataires nécessite aucun format modification.

---

## 3 - Architecture et intégration seams

Eleven indépendant, reusable modules direct sous `modules/` et sont composed - **comme
building bloque** - par `aegis-shell/` à travers un `EventBus` + `postMessage` pont. Aucun
module imports un autre; ils communicate uniquement sur le `aegis` message canal. Le shell
est également le uniquement place que imports submodule **pur functions** (cryptographie, coffre-fort, audit
chain); leur interne entreprise logique est jamais modifié.

**Marque carte (le microkernel ecosystem):**

| module | Marque | Dossier | Rôle |
|--------|-------|--------|------|
| topologie | `Aegis-Topology` | `modules/webgpu-topology` | WebGPU digital twin, 1M+ nœuds |
| caviardage | `Aegis-REDAKTOR` | `modules/doc-redactor` | Local OCR + destructive PDF |
| Identité | `Aegis-Identity` | `modules/zero-knowledge-identity` | ECDSA P-256 sceau, emballé clé |
| Signé livraison | `Aegis-SignedDelivery` | `modules/e2e-signed-delivery` | signature trailer + artefact format |
| Transport | `Aegis-Transport` | `modules/p2p-crypto-transfer` | WebRTC + AES-GCM chunks |
| coffre-fort | `Aegis-Vault` | `modules/encrypted-archive` | OPFS + AES-GCM-256 archive |
| audit | `Aegis-AuditTrail` | `modules/audit-timeline` | SHA-256 empreinte-chained chronologie |
| Canvas | `Aegis-Canvas` | `modules/sync-canvas` | Realtime collaboratif board |
| Détaché signature | `Aegis-DetachedSign` | `modules/detached-hash-signer` | Détaché empreinte signature (sign le empreinte, ne pas le document); Ne pas un blind-signature scheme |
| jeton-gated salles | `Aegis-TokenGate` | `modules/token-gate` | ECDSA salle jetons pour trusted admission |
| serveur-blind relais | `Aegis-BlindRelay` | `modules/blind-relay` | serveur-blind WebSocket relais (transmet texte chiffré uniquement) |

Two further capabilities ship **serveur-side** (ne pas as autonome modules): **entreprise auth**
— OIDC (`AEGIS_AUTH_MODE=oidc`, logique dans `server.js`, tests dans `modules/oidc/`) et **SCIM**
approvisionnement (tests dans `modules/scim/`). Les deux sont désactivé par par défaut et couvert dans
`SECURITY.md` / `CONFIGURE-BEFORE-DEPLOY.md`.

**Common commands:** `npm run dev` (démarrage le établi) · `npm run setup` (mint le local
émetteur secret + créer le données dir) · `npm test` (complet suite) · `npm run verify:delivery`
(build + checksum le shippable tarball) · `npm run doctor` (environnement self-check) ·
`npm run verify:claims` (forbidden-claim balayage) · `npm run sbom` (SBOM). Le complet script
liste est dans `package.json`.

Chaque autonome page porte son marque dans le document title et son principal heading, donc un
Client opening aucun module dans isolation immédiatement voit lequel ecosystem il belongs à.

**Comment ils sont stitched together:**

- `aegis-shell/src/app.js` est le **uniquement** place le modules talk. Il possède le s sept étapes
  état machine, un unifié router, un unique `EventBus` (`bus.js`), le partagé
  `AegisContext` (`context.js`), et le typed Adapters (`adapters.js`, `identity.js`).
- `aegis-shell/src/identity.js` (`IdentityAdapter`) imports le pur Web Cryptographie helpers
  de `modules/e2e-signed-delivery/src/sdk/crypto.js` et le artefact packing /
  vérification functions de `modules/e2e-signed-delivery/src/sdk/pdf.js`.
  **Aucun cryptographique logique est reimplemented dans le shell.**
- Le coffre-fort et audit cores sont imported le même way
  (`modules/encrypted-archive/src/vault.js`, `store.js`,
  `modules/audit-timeline/src/trail.js`, `timeline.js`).
- `aegis-shell/src/sdk.js` publie `window.AegisSDK`, un documenté facade au-dessus de le même
  EventBus. Voir section 12.
- Cross-module événements sont namespaced par origine:
  - `topology:node-selected` `{nodeId, x, y}` - le shell decides le réponse.
  - `redaktor:load-doc` `{file, name, source}` - le unique intake seam, utilisé par les deux le
    topologie passation et `AegisSDK.injectFile()`.
  - `redaktor:export-ready` `{name, blob}` - démarre délégation d'empreintes et signature.
  - `p2p:file-sent` / `p2p:file-received` `{name, size, blob}` / `p2p:error`.
  - Shell-produced événements pour externe subscribers: `identity:signed`,
    `signed:verified`, `signed:rejected`, `vault:sealed`, `audit:append`.
- Two P2P iframes (expéditeur + récepteur) exécuter **caché** et connect localement via
  `BroadcastChannel`. Pour cross-machine LAN, switch à LAN mode et serve au-dessus de HTTPS.

**Le partagé Contexte.** `AegisContext` porte le ensemble exécuter: `selectedNode`, `document`,
`flowStage` (0..7), `transfer`, `hash`, `signature`, `publicKey`, `artifact`,
`pendingArtifact`, `verified`, `sealed`. `FLOW_STAGES` freezes le seven étape numbers;
`setSigning`, `markReceived`, `markVerified`, `markSealed` et `resetFlow` sont le uniquement
mutators. Chaque passation est un explicite, debuggable mutation plutôt de ad-hoc messages.

**Ce est le architectural payoff:** le entreprise est complex, le substrate est boring -
un bus, un message canal, un deliberately aveugle serveur, et un public SDK sur top.

---

## 4 - Quick démarrage

```bash
cd /path/to/Aegis
node server.js            # http://localhost:8080
```

`/session` (le room-jeton émetteur) est **fail-closed** since le sécurité résumi: avec
aucun émetteur credential il refuses à mint jetons, donc LAN signalisation ne peut pas être
self-authorised par anyone qui peut reach le port. Two ways à ouvert il:

```bash
# A) shared secret (recommended outside an isolated lab):
AEGIS_ISSUER_SECRET='<long-random-string>' node server.js
#    then open the shell once as http://host:8080/#issuer=<same secret>
#    (the fragment is moved into sessionStorage and stripped from the URL)

# B) isolated demo LAN (lab only — this is logged as a warning on boot):
AEGIS_TRUSTED_LAN=1 node server.js
```

TLS matériel est aucun plus long lire de le Web racine: put `key.pem` + `cert.pem` dans
`~/.aegis/tls/` (ou point `AEGIS_TLS_DIR` à eux).


Ouvert `http://localhost:8080` dans **Chrome ou Bord 113+**. Alors:

1. Attendre pour le topologie à rendre; draguer / wheel à navigate.
2. **Clic aucun node** - le caviardage panneau auto-loads que node's contrat.
3. Revue le detected noir boîtes; toggle règles si vous comme.
4. Clic **Envoyer à Aegis Pair**. De ici le boucle est automatic: le PDF est hashed,
   signé, streamed, vérifié, et le **Archive à coffre-fort** bouton lights up.
5. Clic **Archive à coffre-fort**, entrer un phrase secrète (>= 8 caractères), **Sceau à coffre-fort**.
   Le seven-step Stepper turns entièrement vert et le audit chronologie affiche chaque lien.

> Pourquoi `node server.js` et ne pas `file://`? Le topologie nécessite `SharedArrayBuffer`, lequel
> Uniquement existe dans un **cross-origin-isolated** contexte. Le unifié `server.js` est donc
> un **deliberately isolé** serveur, ne pas un naive statique fichier serveur: il tampons
> `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`
> (+ `Cross-Origin-Resource-Policy: same-origin`) sur **chaque** réponse - statique octets
> *et* le JSON signalisation relais alike. Drop `key.pem` + `cert.pem` beside il pour HTTPS
> LAN mode. Chaque module également conserve son propre `server.js` pour autonome utiliser; ceux
> délibérément omit le isolation en-têtes parce que ils don't besoin `SharedArrayBuffer`.

---

## 5 - Le zero-trust garantit (et leur limites)

- **topologie**: purely local WebGPU; le serveur sert uniquement statique octets.
- **document**: Tesseract/pdf.js/pdf-lib sont embarqué localement; un hors ligne garde wraps
  `fetch`/`XHR`/`WebSocket`/`EventSource`/`sendBeacon` et bloque aucun cross-origin appel.
  Exporté PDF contenir **aucun recoverable texte couche** - le source page est jamais copied;
  uniquement un re-rasterised image avec burned noir boîtes est embedded.
- **Transfert**: le signalisation serveur relays uniquement SDP/ICE (salle ID, IP hints). Fichier octets
  et le AES clé (PBKDF2 de un phrase secrète) **jamais touch le serveur**.
- **signature**: clés sont généré in-page par Web Cryptographie. Le privé clé est
  non-extractable et jamais serialized; uniquement le Base64 SPKI public clé travels à l.íntérieur
  le artefact. Le signature couvre le brut SHA-256 empreinte de le PDF region, donc un
  unique flipped octet échoue vérification.
- **Archive**: AES-GCM-256 sous un PBKDF2-SHA-256 clé (250,000 iterations, per-record
  sel), écrit as un opaque `.aegis` conteneur dans OPFS. Le phrase secrète est utilisé une fois et
  jamais stocké.
- **audit**: chaque étape appends un lien à un local chaîne d'empreintes —
  `HMAC-SHA256(deviceKey, previousHash | canonical(entry))` quand un appareil clé est ensemble,
  en clair `SHA-256` pour legacy entrées (chaque entrée enregistrements `alg`). Édition un lien
  invalidates chaque plus tard lien. Le chain est **détecteur de falsification, ne pas immutable**: il
  détecte modifications, mais offre aucun protection contre un opérateur qui peut rewrite le
  ensemble magasin. Voir `docs/CLAIMS-WORDING.md`.

**Honête limites** (également dans `DELIVERY_REPORT.md`):

- Le caviardage module's PII détection est tuned pour Allemand business/legal paperwork;
  accuracy dépend sur balayage quality et peut besoin manuel `Mark` boîtes.
- **Transfert récepteur est memory-safe**: le P2P module flux chaque déchiffré bloc
  droit à disque (`showSaveFilePicker` sur Chromium) - aucun en mémoire `Blob`, donc multi-GB
  transferts do ne pas Out-of-memory. Non-Chromium browsers fall retour à un en mémoire chemin **capped à
  1 GiB**. `showSaveFilePicker` nécessite un utilisateur gesture, donc le récepteur a un
  "Choisir save emplacement" bouton à pre-lock le fichier avant sending.
- Parce que un disk-streamed récepteur a aucun in-page octets, le shell vérifie contre le
  **sender-side conservé artefact**. Ce est le correct base de référence pour le same-machine
  démo et pour production streaming; un cross-machine déploiement que nécessite indépendant
  receiver-side vérification doit re-read le saved fichier.
- `IdentityAdapter` problèmes un signataire pour le automatisé boucle. Le trailer format prend en charge
  multiple signataires, mais additional signataires sont ne pas pourtant wired dans le shell flux.
- COEP `require-corp` peut interfere avec *externe* STUN pour LAN mode sur quelques browsers -
  utiliser le autonome P2P serveur (aucun COOP/COEP) pour cross-machine si vous hit que.
- Direct WebGPU / OCR / WebRTC execution exige un rél navigateur; le dépôt était
  validated par statique analysis, le module-level test suites, un signed-artifact
  aller-retour, et direct serveur smoke test tests. Le visuel de bout en bout boucle est un manuel
  reception étape enregistré dans section 8.

---

### Zéro dépendances — le accurate allégation

Aegis est **ne pas** "zéro dépendances" as un ensemble produit, et nous do ne pas allégation il est.
Concretely:

- **9 de 11 modules, plus le shell (`aegis-shell/`) et le serveur (`server.js`),
  ship avec zéro tiers runtime dépendances.** Ils utiliser uniquement Web Cryptographie et
  autres intégré navigateur / Node primitives.
- **Two modules vendor tiers code:**
  - `doc-redactor` vendors **pdf.JS, pdf-lib, tesseract.JS, tesseract-core, tessdata**
    (~35 MB, tous Apache-2.0 / MIT) pour local OCR et PDF rendu.
  - `e2e-signed-delivery` vendors **pdf-lib** (~524 KB, MIT) à rendre le signé
    artefact à PDF.
- **Rien est fetched de un CDN à runtime** — chaque embarqué library est servi
  localement de le image. Le `video-tool/` répertoire distribue uniquement son navigateur
  vérification scripts (ils besoin Playwright as un dev dépendance); le promo-video
  pipeline (Remotion, TTS, capture) est **ne pas** partie de le livraison paquet.
- Le complet attribution et licence matrix est dans `docs/DEPENDENCY_AUDIT.md`.

## 6 - Projet carte

```
Aegis/
|-- server.js                  # unified server: COOP/COEP + static + signaling (zero-dep)
|-- README.md                  # this file
|-- LICENSE                    # Apache License 2.0 (Apache-2.0)
|-- LICENSES/                  # Apache-2.0 license text
|-- DELIVERY_REPORT.md         # engineering + test report
|-- aegis-shell/               # the unifying SPA (dark command-center)
|   |-- index.html             # seven-stage Stepper + sidebar surfaces
|   `-- src/
|       |-- app.js             # seven-stage orchestration + audit wiring
|       |-- adapters.js        # Topology / REDAKTOR / P2P adapters
|       |-- identity.js        # IdentityAdapter (pure submodule imports)
|       |-- sdk.js             # window.AegisSDK public embedding API
|       |-- bus.js             # EventBus
|       |-- context.js         # AegisContext + FLOW_STAGES
|       `-- style.css
`-- modules/
    |-- webgpu-topology/        # Aegis-Topology
    |-- doc-redactor/           # Aegis-REDAKTOR
    |-- zero-knowledge-identity/# Aegis-Identity
    |-- e2e-signed-delivery/    # Aegis-SignedDelivery
    |-- p2p-crypto-transfer/    # Aegis-Transport
    |-- encrypted-archive/      # Aegis-Vault
    |-- audit-timeline/         # Aegis-AuditTrail
    |-- sync-canvas/            # Aegis-Canvas
    |-- detached-hash-signer/   # Aegis-DetachedSign  (detached hash signing; NOT a blind-signature scheme)
    |-- token-gate/             # Aegis-TokenGate  (ECDSA room tokens)
    `-- blind-relay/            # Aegis-BlindRelay (server-blind WebSocket relay)
```

---

## 7 - Extension points

- **Rél documents**: remplace le shell's `contractForNode()` avec un loader que pulls un
  node's actual fichier (encore client-side) dans le caviardage module, ou appel
  `AegisSDK.injectFile(file)` de un host application.
- **WebGL2 repli** pour le topologie; **GPU-compute** physique pour vrai 10M nœuds.
- **More pairs / salles**, TURN pour symmetric NAT, et un rél clé-exchange UI pour transfert.
- **Multiple signataires**: extend `IdentityAdapter.signHash()` à retourner un signataire array; le
  artefact format et `verifyArtifact()` déjà support il.
- **audit export** produces un content-free JSON rapport sûr à attach à un cas fichier.

---

## 8 - Comment à test

Aegis mixes **headless, repeatable contrôles** (exécuter ici / dans CI) avec un **manuel navigateur
résumi** (nécessite un rél GPU + OCR + WebRTC). Les deux sont documenté donc le fermé boucle est
reproductible, ne pas mystic.

### Un - Headless contrôles (aucun navigateur) - quoi CI peut assert today

```bash
# 1) Static syntax of every shell entry point (ES module mode)
for f in server.js aegis-shell/src/app.js aegis-shell/src/adapters.js \
         aegis-shell/src/identity.js aegis-shell/src/sdk.js \
         aegis-shell/src/context.js aegis-shell/src/bus.js \
         modules/webgpu-topology/src/main.js modules/doc-redactor/src/js/app.js \
         modules/doc-redactor/src/js/aegis-adapter.js \
         modules/p2p-crypto-transfer/src/main.js \
         modules/p2p-crypto-transfer/src/aegis-adapter.js \
         modules/p2p-crypto-transfer/src/transfer.js; do
  node --input-type=module --check < "$f" || echo "SYNTAX FAIL: $f"
done

# 2) English-only convention on all code + docs (no CJK / fullwidth punctuation)

# 3) P2P module unit tests - the OOM guard is proven here
cd modules/p2p-crypto-transfer && npm test
#   -> tests 11, pass 11, fail 0

# 3b) Audit chain unit tests - hash linkage + tamper detection
cd modules/audit-timeline && npm test
#   -> tests 15, pass 15, fail 0

# 4) Cross-origin isolation headers on EVERY response (enables SharedArrayBuffer)
PORT=8082 node server.js & SRV=$!; sleep 1
for u in "/" "/aegis-shell/src/app.js" "/signal?room=probe&from=a" "/nope-404"; do
  curl -s -D - -o /dev/null "http://localhost:8082$u" \
    | grep -iE "^(cross-origin-opener-policy|cross-origin-embedder-policy|cross-origin-resource-policy|HTTP/)"
done
kill $SRV
#   expect: COOP/COEP/CORP present on all four (200 / 200 / 204 / 404).
```

### B - Manuel navigateur résumi (Chrome / Bord 113+, rél WebGPU/OCR/WebRTC)

1. `node server.js` -> ouvert `http://localhost:8080`.
2. **Confirmer isolation**: DevTools console -> `crossOriginIsolated` doit être `true`.
3. **Exécuter le fermé boucle**:
   - clic aucun topologie node -> `Aegis-REDAKTOR` auto-loads que node's contrat
     (`Wartungsvertrag-N###.png`, filename stamped avec le node id);
   - revue le detected noir boîtes, alors clic **Envoyer à Aegis Pair**;
   - le shell empreinte et signe le PDF, flux il, et vérifie il. Watch le journal:
     `Redacted PDF ... hashed and signed`, alors either un en mémoire ou un
     "streamed droit à disque" vérification message;
   - **Archive à coffre-fort** appears uniquement après `Signature verified`. Entrer un phrase secrète
     (>= 8 caractères) et **Sceau à coffre-fort**;
   - le top stepper turns vert étape 1 -> 7.
4. **Prouver le Out-of-memory correctif sur un big fichier**: récepteur clicks "Choisir save emplacement" à
   pre-lock le writer, alors envoyer un multi-GB fichier et watch le OS mémoire meter stay flat.
5. **Watch le piste d'audit**: chaque étape appends un lien à le right-hand chronologie
   (`Topology node selected` -> `Document hash signed` -> `Verification passed` ->
   `Sealed in the local vault`). Recharger le page; le chain est restauré et
   **Vérifier chain** encore rapports intact.

### C - Honête lacunes (ne peut pas être automatisé pourtant)

WebGPU rendu, OCR accuracy sur rél balaye, cross-machine WebRTC, et le
`showSaveFilePicker` gesture require un human dans un rél navigateur. Le dépôt est
donc validated par **statique analysis + module-level test suites + signed-artifact
aller-retour + direct en-tête contrôles + serveur smoke test tests**; le visuel de bout en bout boucle est un
manuel reception étape enregistré ici.

---

## 8b - Fonctionnalité référence

Le eleven modules sont listed dans §3; trois (Identité, coffre-fort, AuditTrail) avoir leur
propre deep-dive sections ci-dessous. Ce section couvre le **établi shell, le opérateur
conformité console, le restant eight modules, entreprise auth, et Docker** — le
parts le quick-tour table fait ne pas expand.

### Établi shell (`aegis-shell/`)

Le unifié SPA. Chaque surface — topologie, Rédacteur, SignedDelivery, coffre-fort, audit,
Admin — est un **free-floating, draggable et resizable fenêtre**: grab son en-tête à
déplacer il, draguer le bottom-right grip à resize; position et taille persist dans
`localStorage` et sont restauré sur recharger. Panels stay dans leur par défaut two-column
mise en page jusqu.à vous premier grab un.

### opérateur conformité console (`console.html`) — *le EU/DE revenue fonctionnalité*

Ce est le produit surface German/EU clients pay pour, et il est un first-class
fonctionnalité, ne pas un test artefact. Il est un authenticated opérateur console (Issuer-secret
bearer) avec onglets:

- **ROPA** — structuré register de traitement activities (GDPR Art. 30); champs
  `controller.legalName / address / regNo`, `dpo.email`, `sla.mailbox / timezone`,
  `euRep.name`. Manquant faits surface as `409` sur le doc gate et as un human-readable
  bandeau (`COMPLIANCE_LABELS` maps brut champ noms à en clair language).
- **DSAR** — données-subject access-request ledger (GDPR Art. 12/15), 30-jour `dueInDays`
  tracking; creation exige un subject nom **ou** e-mail.
- **DPIA** — données-protection impact assessment enregistrement.
- **Documents** — téléversement un signé ROPA/DPA/SLA/SCC/DPIA; le corresponding `/doc/*`
  gate flips de `409` à `200` (`X-Aegis-Source: uploaded`). Blank modèles
  (`/template/*`) retourner `{{…}}` placeholders (`TEMPLATE — UNFILLED`).
- **audit / Revocations / Séquestre / Sessions / Configuration / Setup** — opérateur contrôles,
  clé révocation, secret séquestre, direct session vue, runtime configuration, first-run setup.
- **Export & Erase** — télécharger un rempli `ROPA-filled.md`, et erase un personne concernée
  (GDPR effacement) sous audit. Le GDPR Art. 20 données-portability lot
  (`/export/bundle`) maintenant porte un `provenance` bloc identifying AEGIS (Jerome Young)
  as le producer.

Le console est **role-gated**: le Admin panneau est caché de le `operator` rôle
(`.win[hidden]`), visible à `admin`. Switching onglets hors ligne affiche un "serveur
unreachable" bandeau plutôt de throwing.

### Restant eight modules

- **Aegis-topologie** (`modules/webgpu-topology`) — WebGPU digital twin de up à 1M+
  nœuds; self-check résuit 300/300 sampling; WebGL2 repli quand WebGPU est absent.
- **Aegis-REDAKTOR** (`modules/doc-redactor`) — local OCR (tesseract.JS) + destructive
  PDF caviardage. Charge un document, draw/auto-detect PII boîtes, ensemble zoom / mode / clair,
  export un redacted PDF whose `Producer` est stamped `REDAKTOR — local redaction engine`
  (aucun octets leave le navigateur).
- **Aegis-SignedDelivery** (`modules/e2e-signed-delivery`) — assembles un *signé
  artefact* = `[PDF document bytes] + [UTF-8 JSON signature trailer]`; two ECDSA-P256
  signataires (Un & B) co-sign le document empreinte; détecteur de falsification (un flipped octet échoue
  vérifier). Le trailer porte un `producer: "AEGIS v1.0.0 (Jerome Young)"` watermark.
- **Aegis-Transport** (`modules/p2p-crypto-transfer`) — WebRTC + AES-GCM chunked
  transfert. Le récepteur flux chaque déchiffré bloc droit à disque (memory-safe,
  aucun Out-of-memory sur multi-GB fichiers); LAN/P2P mode dropdown.
- **Aegis-Canvas** (`modules/sync-canvas`) — real-time collaboratif board avec
  operational-transform synchronisation, multi-cursor présence, et un `fit` viewport control.
- **Aegis-DetachedSign** (`modules/detached-hash-signer`) — *détaché empreinte signature*:
  le signataire signe uniquement le document's SHA-256 empreinte; le document octets jamais entrer
  le signature lot (blind/detached, ne pas un blind-signature scheme).
- **Aegis-TokenGate** (`modules/token-gate`) — ECDSA room-admission jetons; le démo
  prouve admit / expired / wrong-room / falsifié chemins.
- **Aegis-BlindRelay** (`modules/blind-relay`) — serveur-blind WebSocket relais que
  transmet **texte chiffré uniquement**; le worked exemple prouve le relais jamais voit
  en clair.

### Entreprise auth: OIDC & SCIM

- **OIDC** (`AEGIS_AUTH_MODE=oidc`, logique dans `server.js`, tests dans `modules/oidc/`):
  unconfigured → `/auth/oidc/start` retourne `503` (aucun silent repli). Configure un
  IdP avant permettant.
- **SCIM 2.0 approvisionnement** (tests dans `modules/scim/`): protégé par `AEGIS_SCIM_TOKEN`;
  `rotate` immédiatement revokes le ancien jeton.
- Les deux sont désactivé par par défaut. Configuration étapes sont dans `CONFIGURE-BEFORE-DEPLOY.md`.

### Docker déploiement

```bash
docker build -t aegis .
docker run -d -p 8099:8099 \
  -e AEGIS_ISSUER_SECRET=<strong-secret> \
  -v aegis-data:/app/data \
  aegis
```

Le image s.exécute as un non-root utilisateur, bakes `docs/` dans le image (donc conformité
modèles resolve à runtime), et persists données sur le `/app/data` volume. **réseau
exposure:** le serveur lie tous interfaces par conception — place il derrière un inverser
proxy avec TLS et un ACL, as documenté dans `SECURITY.md`. Do **ne pas** expose le port
directement à untrusted networks.

---

## 9 - module 01 - Aegis-Identity (Localement Self-Custodied Clés)

Un classified plant ne peut pas join un corporate identité Prestataire, donc chaque engineer frappe un
local **digital sceau** plutôt: un ECDSA P-256 clé pair généré par Web Cryptographie, avec le
privé half emballé par PBKDF2 + AES-GCM et stocké dans IndexedDB. Le public half becomes
un shareable entreprise carte - avatar, nom, Base64 SPKI clé et un SHA-256 empreinte.

**Dans le s sept étapes boucle ce module est automatic.** Le shell's `IdentityAdapter`
(`aegis-shell/src/identity.js`) reuses le même pur Web Cryptographie primitives exposed par le
signed-delivery SDK. Signature est triggered automatiquement par le principal shell's
`IdentityAdapter` immédiatement après `redaktor:export-ready`; là est aucun bouton à press
anymore. Vérification s.exécute sur `p2p:file-received`, et une fois vérification succeeds le
**Archive à coffre-fort** bouton lights up automatiquement.

```bash
node server.js
# then open: http://localhost:8080/modules/zero-knowledge-identity/index.html
```

- Type un nom (pour exemple `Engineer-A`), choisir un phrase secrète de à au moins eight
  caractères, press **Générer**.
- Recharger le page - le carte retourne de IndexedDB avec le même empreinte, et le
  même phrase secrète encore unlocks le privé clé.

Le phrase secrète est jamais stocké, le encapsulation clé est non-extractable, et le module fait
zéro réseau requêtes. Complet détail: `modules/zero-knowledge-identity/README.md`.
Mesuré résultats: `modules/zero-knowledge-identity/TEST_REPORT.md` (26/26 headless
assertions, navigateur recharger reception résumi).

---

## 10 - module 02 - Aegis-coffre-fort (Local Chiffré coffre-fort)

> **Aegis-coffre-fort: zero-cloud archiving de signé documents.**

Un signé contrat ne peut pas être gauche sur le desktop. Après `Aegis-Identity` vérifie le
artifact's ECDSA signature, le shell offre **Archive à coffre-fort**. Le fichier plus son
signature métadonnées sont framed dans un données utiles, chiffré avec AES-GCM-256 sous un
PBKDF2-SHA-256 clé (250,000 iterations, per-record sel), et écrit as un opaque
`.aegis` conteneur dans le navigateur's Origine Privé Fichier Système (OPFS). Rien est
téléversé; là est aucun compte et aucun synchronisation file d'attente.

**Aucun manuel démo bouton.** Signature est maintenant triggered automatiquement par le principal shell's
`IdentityAdapter` droit après `redaktor:export-ready`; là est aucun bouton à press
anymore. Une fois vérification succeeds, le **Archive à coffre-fort** bouton lights up
automatiquement. Uniquement un réussi verdict unlocks le coffre-fort action.

```bash
node server.js
# command center:  http://localhost:8080/
# vault browser:   http://localhost:8080/modules/encrypted-archive/index.html
```

- Dans le shell: clic aucun topologie node, caviarder et export, attendre pour *Vérifié*, alors
  **Archive à coffre-fort** -> phrase secrète (>= 8 caractères) -> **Sceau à coffre-fort**.
- Le barre latérale rapports `N sealed records | X KB ciphertext | opfs`; recharger le page et
  le nombre survive, parce que OPFS est persistent par origine.
- Ouvert le autonome coffre-fort page à browse le même répertoire: ID et texte chiffré sizes
  sont visible pendant verrouillé; fichier noms, empreinte et signataire details appear uniquement après
  unlocking un enregistrement.

Échec modes sont deliberately distinguishable: `integrity check failed` means le
conteneur changed sur disque, `unlock failed` means le phrase secrète ou le AES-GCM balise fait
ne pas match. Complet détail: `modules/encrypted-archive/README.md`.
Mesuré résultats: `modules/encrypted-archive/TEST_REPORT.md` (23/23 headless assertions,
navigateur sceau -> recharger reception résumi).

---

## 11 - module 03 - Aegis-AuditTrail (Détecteur de falsification piste d'audit)

> **Aegis-AuditTrail: un détecteur de falsification empreinte-chained chronologie pour conformité reviews.**

Un conformité revue asks qui fait quoi, et quand. Le right-hand **piste d'audit** carte
appends un empreinte lien pour chaque meaningful action dans le s sept étapes boucle:
topologie node selected, document chargé dans Rédacteur, destructive PDF produit,
document empreinte signé, signé artefact handed à transport, chiffré P2P livraison,
livraison déchiffré, vérification résumi (ou rejeté / échoué / ignoré), et coffre-fort
scellage.

Chaque lien est `HMAC-SHA256(deviceKey, previousHash | canonical(entry))` (legacy entrées
utiliser en clair `SHA-256`), donc édition, deleting ou reordering aucun entrée breaks chaque plus tard
empreinte. Le trail est **détecteur de falsification, ne pas immutable**. Chaque ajouter également émet `audit:append` sur
le shell `EventBus`, donc un externe `AegisSDK` subscriber peut watch le chain dans rél
temps. Le trail est stocké dans `localStorage` et survive un recharger; **Vérifier chain**
recomputes il de genesis et marques le premier cassé lien. **Export JSON** produces un
content-free case-file artefact.

```bash
node server.js
# command center:  http://localhost:8080/aegis-shell/index.html
# review page:     http://localhost:8080/modules/audit-timeline/index.html
```

- Clic un topologie node et complet le fermé boucle; le chronologie fills as chaque événement
  fires. Là est aucun séparé signed-delivery démo à exécuter - signature et vérification
  happen inline dans le principal boucle.
- Ouvert le autonome revue page à voir le même chain, vérifier il, export il, ou clair il
  avec un two-step confirmation.

Le chain implémentation est reused de `modules/sync-canvas/src/audit/HashChain.js`
à travers un unique import seam; il est ne pas forked. Complet détail:
`modules/audit-timeline/README.md`. Mesuré résultats:
`modules/audit-timeline/TEST_REPORT.md` (15/15 headless tests, navigateur chronologie et
recharger reception résumi).

---

## 12 - AegisSDK: embedding le établi

> **Un embeddable, zéro dépendance entreprise ecosystem.**

`aegis-shell/src/sdk.js` publie `window.AegisSDK` sur le command-center page. Il est un
thin, entièrement documenté facade au-dessus de le shell's interne `EventBus` - aucun global état est
copied, aucun dépendance est ajouté, et le SDK jamais appels dans un submodule directement.

| API | But |
|-----|---------|
| `AegisSDK.init(config)` | Appliquer `{theme, locale, authToken, ...}` et retourner le SDK. Le jeton reste dans mémoire et est jamais logged ou emitted. |
| `AegisSDK.on(eventName, callback)` | Subscribe à aucun shell ou module événement; retourne un unsubscribe function. |
| `AegisSDK.injectFile(file)` | Push un externe `File` dans `Aegis-REDAKTOR` par emitting `redaktor:load-doc`. |

```js
const sdk = window.AegisSDK.init({
  theme: 'dark',
  locale: 'en',
  authToken: '<your-token>',
});

const off = sdk.on('audit:append', (entry) => {
  console.log('audit link', entry.index, entry.hash);
});

const file = new File(
  ['%PDF-1.4 sample bytes'],
  'contract.pdf',
  { type: 'application/pdf' },
);
const receipt = await sdk.injectFile(file);
console.log('injected', receipt.name);
off();
```

Observable événements include `topology:node-selected`, `redaktor:load-doc`,
`redaktor:export-ready`, `identity:signed`, `p2p:file-sent`, `p2p:file-received`,
`signed:verified`, `signed:rejected`, `vault:sealed` et `audit:append`.
`redaktor:load-doc` est le unique intake seam: les deux le topologie passation et
`AegisSDK.injectFile()` utiliser il, donc externally injecté documents entrer exactement le même
audited s sept étapes boucle as node-selected documents.

Parce que le shell possède le EventBus, le Contexte et le Adapters, un host application peut
embed le établi, inject documents, et observe chaque étape sans forking un module
ou installing un npm paquet.

---

## 13 - Tiers composants

Aegis declares **zéro npm runtime dépendances**. Two modules vendor tiers code
localement donc le ensemble pipeline s.exécute avec aucun installer et aucun réseau accès — `doc-redactor`
(five actifs sous `modules/doc-redactor/vendor/`) et `e2e-signed-delivery` (pdf-lib sous
`modules/e2e-signed-delivery/vendor/`, identique à l.octet à le doc-rédacteur copie). Chaque asset
conserve son propre amont licence, unmodified.

| Component | Version | Licence | Utilisé par | Amont |
|---|---|---|---|---|
| pdf.JS | 3.11.174 | Apache-2.0 | doc-rédacteur | `mozilla/pdf.js` |
| pdf-lib | 1.17.1 | MIT | doc-rédacteur, e2e-signed-delivery | `Hopding/pdf-lib` |
| tesseract.JS | 5.1.1 | Apache-2.0 | doc-rédacteur | `naptha/tesseract.js` |
| tesseract.js-core | 5.1.1 | Apache-2.0 | doc-rédacteur | `naptha/tesseract.js-core` |
| tessdata (`deu`, `eng`) | 4.0.0 best_int | Apache-2.0 | doc-rédacteur | `tesseract-ocr/tessdata` |

Two modules vendor tiers code — `doc-redactor` (five actifs) et
`e2e-signed-delivery` (pdf-lib uniquement, identique à l.octet à le copie dans `doc-redactor`,
même SHA-256). Le autres ten modules — `aegis-shell`, `audit-timeline`, `blind-relay`,
`detached-hash-signer`, `encrypted-archive`, `p2p-crypto-transfer`, `sync-canvas`,
`token-gate`, `webgpu-topology`, `zero-knowledge-identity` — contenir **aucun tiers code**.

### Externe intégrations (isolé adapters, ne pas dans le noyau)

Le zéro dépendance noyau (cryptographie / empreinte-chain / audit / signalisation / caviardage rendre)
reste gratuit de réseau services. Chaque externe capacité est un drop-in adaptateur que
sits Derrière un interface, vit outside noyau source, et est **entièrement removable** —
deleting son répertoire plus son launch indicateur laisse Aegis entièrement functional.

| Adaptateur | Statut | But | Implémentation note |
|---|---|---|---|
| RFC 3161 TSA horodatage | **Livré** (facultatif, désactivé par par défaut) | Anchor un empreinte à un trusted horodatage | `adapters/tsa-rfc3161/` — un pur Node forwarder (hand-rolled DER, aucun tiers libs) que POSTs un `TimeStampReq` à un opérateur-configured TSA et retourne le brut CMS jeton. Activé avec `node server.js --adapter-tsa on --tsa-config <file>`; `POST /adapter/tsa/submit`. Dev: FreeTSA; prod: DigiCert. Jamais vérifie le TSA certificat chain — hors ligne vérification est le user's responsabilité. |
| Cloudflare R2 stockage (UE) | PLANNED | Client-side-encrypted long-term coffre-fort archive | Chiffrer avec Web Cryptographie, alors PUT à R2 (UE). Adaptateur hooks uniquement; complet SigV4 est ne pas hand-rolled dans le noyau. |
| Tauri desktop shell | PLANNED | Hors ligne kiosk / signé desktop build | Wraps le existing Web application; le noyau est unchanged. |

**Externe TSA services sont externe dépendances, ne pas Aegis code.** Le TSA adaptateur
distribue avec aucun hardcoded Prestataire URL, clé, ou certificat; il transmet **uniquement un SHA-256
empreinte** (jamais document octets). Aegis maintains aucun TSA root-CA confiance magasin et fait
aucun allégation about juridique admissibility. Il échoue sûr: aucun timeout / réseau erreur / 4xx
yields `{ tsaStatus: 'failed' }` et jamais disrupts le chaîne d'empreintes ou relais. Retirer
`adapters/tsa-rfc3161/` et le `--adapter-tsa` indicateur à strip il completely. Voir
`adapters/tsa-rfc3161/README.md` (EN/DE) pour GDPR notes et le juridique disclaimer.

Un CI gate (`scripts/zero-dep-lint.mjs`) enforces ce frontière: il échoue si aucun noyau
ou adaptateur source imports un non-platform (`node:*`) ou non-relative module. Aucun future
CMS-verification code doit direct dans `adapters/tsa-rfc3161/vendor/` (isolé, ignoré
par le lint, jamais chargé par par défaut) donc un réseau service peut jamais creep dans le cœur.

### Fichiers que doit travel avec aucun copie

```
modules/doc-redactor/vendor/<component>/LICENSE     upstream licence text, unmodified
modules/doc-redactor/vendor/<component>/NOTICE      copyright attribution
modules/doc-redactor/vendor/THIRD_PARTY_NOTICES.md  full attribution index
modules/doc-redactor/vendor/MANIFEST.json           version + SHA-256 per file
modules/e2e-signed-delivery/vendor/pdf-lib/LICENSE  MIT, Copyright (c) 2019 Andrew Dillon
modules/e2e-signed-delivery/vendor/MANIFEST.json    version + SHA-256
```

Le bundled builds sont amont sortie. Leur droit d.auteur en-têtes étaient stripped par le
amont build étape, ne pas par ce dépôt — attribution donc vit dans le per-component
`LICENSE` et `NOTICE` fichiers. Rien ici retiré ou altered un attribution avis, et aucun
embarqué fichier était modifié.

### licence

Aegis est **ouvert source**, licencié sous le **Apache licence 2.0** — voir
[`LICENSE`](LICENSE). Vous peut utiliser, modify, redistribute et sell il,
y compris commercially, sans paying us anything et sans asking
permission. Le uniquement obligations sont ceux Apache-2.0 lui-même imposes:
conserver le licence et attribution notices, et état significant modifications.

**Quoi est gratuit:** le logiciel. Chaque première partie fichier dans ce dépôt est
Apache-2.0. Là est aucun payé tier, aucun poste limite, aucun revenue threshold et aucun
"contact sales" gate.

**Quoi est payé (facultatif):** notre temps. déploiement, intégration, durcissement
reviews, SBOM/CRA état de préparation lots et annuel support sont offered as services
(voir [`PRICING.md`](PRICING.md)). Un support contrat est jamais requis à exécuter
le logiciel.

**Tiers composants** conserver leur propre licences — voir [`NOTICE`](NOTICE)
et chaque `vendor/<component>/LICENSE`. Apache-2.0 fait ne pas relicense eux.

Aegis™ est un marque de le droit d.auteur holder; le licence grants aucun
marque droits. Do ne pas utiliser le nom à endorse un modifié build.

---

## 14 - Post-audit P3 closure (livraison, CSP, diagnostics, formulation)

Five éléments étaient deliberately gauche ouvert dans le 2026-11-13 audit parce que ils nécessaire un
produit decision. Le decisions ci-dessous sont maintenant implémenté et protégé dans CI.

### 13.1 Livraison footprint (AEG-19) — le working arbre est ne pas le deliverable

Le working arbre est ~845 MiB parce que il porte **regenerable** build caches
(`video-tool/node_modules/.cache`, `.remotion`, `out/*.mp4`) et Playwright copies.
Rien est deleted de le working arbre: ceux caches sont nécessaire à re-render le
démo video et re-run le navigateur gates. Plutôt là est un unique reproductible
version packer:

```bash
npm run pack:delivery       # dist/aegis-delivery-<version>.tar.gz + dist/MANIFEST.json
npm run verify:delivery     # re-verify every file's SHA-256 against the manifest
```

Le packer exclut build caches avant archiving, donc le archive est un small
fraction de le working arbre. Un deuxième build est identique à l.octet (corrigé tar epoch,
sorted noms, zeroed gzip mtime). Exécuter `npm run verify:delivery` pour le actuel
fichier nombre et taille — chaque SHA256 correspond le manifest. Le archive
exclut `node_modules/`, build caches, rendu media et private-clé matériel, mais
**conserve `vendor/`** (pdf.JS, pdf-lib, tesseract, tessdata sont runtime actifs, y compris
`*.traineddata.gz`). `dist/` est dans `server.js`'s deny liste et est jamais HTTP-reachable.
Un manquant requis fichier, un forbidden chemin, ou un archive au-dessus de 80 MiB échoue le gate.

### 13.2 Content-sécurité-Politique (AEG-23) — per-response nonce, ne pas `unsafe-inline`

Le pages mix externe `<script src>` avec genuine inline
`<script type="module">` bloque. empreinte CSP serait break sur chaque éditer et
`'unsafe-inline'` serait defeat le but, donc `server.js` frappe un frais
`crypto.randomBytes(16)` nonce **par HTML réponse**, injecte il dans chaque opening
script balise, et envoie il dans `Content-Security-Policy`. HTML est `no-store` donc un spent
nonce peut jamais être replayed de cache. Le politique conserve `'self'`, `blob:` et
`'wasm-unsafe-eval'` (le embarqué OCR/PDF workers besoin eux), ensembles
`frame-ancestors 'self'` donc le shell's propre iframes encore work, et bloque
`object-src` / `base-uri`. `doc-redactor`'s stricter `<meta>` CSP reste et est
intersected par le navigateur avec le en-tête politique.

Gate: `node video-tool/verify-csp.mjs` (après `node server.js`). Il assure un frais
nonce sur chaque réponse, nonce sur chaque script balise, aucun `unsafe-inline` dans
`script-src`, rél inline module scripts encore executing, un injecté script
**sans** un nonce étant refused, et `dist/` returning 404.

### 13.3 Diagnostics (AEG-21) — produit métriques stay, brut timings déplacer à `?diag=1`

Le HUD encore affiche FPS / Nœuds / Edges / Draw appels. `Frame ms` et `Worker tick ms`
sont developer-only: le physique Worker s.exécute sur son propre clock, donc un cold-start tick
pourrait lire thousands de ms pendant le rendre boucle held 60 FPS. Ceux two rows et le
on-page pick-debug panneau sont caché sauf vous ouvert le topologie page avec
`?diag=1`; le worker tick valeur est également warm-up-filtered et exponentially smoothed.
Le picking self-test maintenant states son portée honestly: il vérifie projection math,
pendant DOM événement livraison est couvert par `video-tool/verify-webgl2.mjs`.

### 13.4 Identité gate (AEG-24) — aucun auto-unlock, mais le gate est explained

Creating un identité seals le privé clé immédiatement, donc **Sign reste désactivé**.
Auto-unlocking serait conserver clé matériel dans mémoire et defeat le sealed-coffre-fort
guarantee. Plutôt le page maintenant states le gate (`#signGateHint`, `title`,
`aria-describedby`), points à le Déverrouiller panneau, et met à jour le message sur déverrouiller.
`btnSign` est désactivé pour un visible, indiqué reason plutôt que looking cassé.

### 13.5 Allégations formulation (AEG-22) — normative base de référence

[`docs/CLAIMS-WORDING.md`](docs/CLAIMS-WORDING.md) est le normative formulation table.
Do ne pas dire `forward secrecy` → dire **per-chunk authenticated chiffrement avec un
frais aléatoire IV** (un PBKDF2 session clé, aucun ratchet); do ne pas dire `blind signature`
→ dire **détaché empreinte signature** (aucun blinding factor); do ne pas dire `immutable` → dire
**détecteur de falsification HMAC/SHA-256 chaîne d'empreintes**; do ne pas dire `Prove who signed it` → dire
**vérifier intégrité contre un auto-déclaré signataire clé**.
Répertoire noms tels as `zero-knowledge-identity` et `blind-relay` sont historical
et kept pour compatibility, mais chaque README maintenant explicitement denies le cryptographique
allégation. `npm run verify:claims` échoue CI si un over-claim retourne à user-facing copie;
explicite denials sont allowed. Aucun API, export, wire format ou access-control decision
changed.

### 13.6 topologie backend selection — WebGL2 flaky régression correctif

Post-closure, `video-tool/verify-webgl2.mjs` intermittently timed hors waiting sur
`window.__topoBackend` (worst observed 7581 ms contre un 6 s cap). Hands-on
diagnosis showed two rél causes, neither un CSP/`?diag=1` régression:

1. `navigator.gpu.requestAdapter()` a **aucun intégré timeout**; headless
   SwiftShader bloque 3–8 s avant returning `null`, donc le WebGPU-then-WebGL2
   repli chain occasionally blew past le test's attendre.
2. Le test's `delete navigator.gpu` était un **no-op** — `navigator.gpu` est un
   read-only prototype getter, donc le supprimer silencieusement échoué et le test uniquement
   fell retour par luck quand headless avait aucun adaptateur.

Quatre fixes (A/B/C/D) étaient appliqué à `modules/webgpu-topology/src/gpu/device.js`
et `video-tool/verify-webgl2.mjs`:

- **Un** — `pickGpu()` honors un explicite `?gpu=webgl2` / `?gpu=webgpu` URL
  override as un synchronous short-circuit, et le test maintenant navigates à
  `index.html?gpu=webgl2` donc le WebGL2 chemin est exercised deterministically
  (aucun adaptateur attendre, aucun reliance sur le deleted getter).
- **B** — `requestAdapter()` est raced contre un 2 s `setTimeout(() => null)`, donc
  un missing/absent adaptateur résout fast et falls retour à WebGL2 plutôt de
  hanging le démarrage chemin.
- **C** — `window.__topoBackend = 'pending'` est published le instant `pickGpu`
  démarre, et `window.__topoBackendReason` enregistrements le resolution chemin
  (`forced webgl2`, `webgpu default`, `webgpu fell back`, …) pour
  self-explaining échecs.
- **D** — `device.lost` est downgraded de `console.error` à `console.warn`; un
  lost appareil pendant normal teardown est benign noise et doit ne pas déclenchement le
  "aucun fatal console erreurs" runtime gate.

Gate: `verify-webgl2.mjs` est maintenant stable — `window.__topoBackend` résout à
`webgl2` dans well sous 1 s, et un 3/3 repeated exécuter résuit. `?gpu=` est également un
handy manuel diagnostic: ouvert aucun topologie URL avec `?gpu=webgl2` ou
`?gpu=webgpu` à force un backend.

### 13.7 Final régression gate statut

Tous gates vert après le WebGL2 correctif (exécuter sur propre, port-collision-free servers):

| Gate | Commande | Résultat |
|------|---------|--------|
| Unité suite | `npm test` | 151 / 151 résumi |
| Allégations formulation (AEG-22) | `npm run verify:claims` | 216 fichiers scanned, aucun forbidden allégations |
| Livraison packer (AEG-19) | `npm run verify:delivery` | Vérifier Résumi — chaque SHA256 correspond, aucun caches/media/keys; source-vs-package freshness vérifier (B-02) |
| CSP nonce (AEG-23) | `node video-tool/verify-csp.mjs` | Tous Résumi |
| P3 closure | `node video-tool/verify-p3.mjs` | Tous Résumi (12 pages + AEG-21/24 + P0 PoCs + F-01 falsifié→DENY régression) |
| WebGL2 repli | `node video-tool/verify-webgl2.mjs` | 3 / 3 résumi (était flaky) |
| Runtime smoke test | `node video-tool/verify-runtime.mjs` | Tous Résumi (goto retry ×3 ajouté — aucun plus long flaky) |
| console (protégé) | `node video-tool/verify-p3.mjs` | `/aegis-shell/console.html` 200 + sign-in control rend (N-01 couverture ajouté) |
| Page couverture | — | **13 / 13 première partie pages** (12 modules + shell + console) |
| Deep flows | `npm run verify:flows` | **12 / 12 vérifié sur Chromium (2026-11-14)** — jeton-gate 4-states, 3-partie aveugle sign+vérifier, coffre-fort sceau, canvas tampon éditer, topologie 100k, shell surface, zero-external, cosign 2/2, p2p local (same-context) + LAN (sessionStorage secret). Selectors matched à confirmé module DOM. p2p local/LAN assert page-load + zero-pageerror (peer-connect nécessite un direct 2-pair / session secret). Exige Playwright + Chromium (développement uniquement; voir note ci-dessous). |
| Accessibility | — | `aria-busy` sur **chaque** long-task bouton à travers tous 12 modules + console + shell (N-04 → EN 301 549 / WCAG 4.1.2 + 4.1.3) |
| sécurité durcissement | — | piste d'audit est détecteur de falsification et append-only pour operator/system personnes concernées — `/audit/erase` refuses protected personnes concernées (403); GDPR effacement encore cibles données personnes concernées. Connexion throttled par IP + per-(IP,utilisateur) (429 + lockout) **plus un par IP enumeration garde** (distinct-username 429) que ferme le account-existence side-channel; **un per-user lockout maintenant spreads à le ensemble IP**, donc probing non-existent usernames également retourne 429 (v5 correctif). **jeton-gate rejette non-canonical (altéré) signatures** — ferme un forged-jeton reception flaw (~21% de trailing-char flips admitted avant le correctif). console audit CSV/JSON export corrigé (`res.clone`); `GET /export/bundle` adds Art.20 portability (maintenant inclut compte métadonnées). `npm run doctor` self-diagnostic. (B-04 + must-fix #5 + jeton-gate + M-01 + enum garde + lockout-spread) |
| Static-surface lockdown (v7) | `server.js` | **B-01/B-01b/B-02/B-04 fermé**: `config/`, `data/`, `server/` sont denied as Privé Premier niveau dirs (depth-0 match, donc `modules/webgpu-topology/src/data/` encore sert), `.db*` extensions denied, encoded traversal (`%2e%2e`, double-encoded) rejeté sur le decoded chemin. `GET /config/local.json`, `/data/aegis.db`, `/server/store.js` maintenant 403/404 — le émetteur secret est aucun plus long reachable de le port. `Referrer-Policy` / `Permissions-Policy` / `nosniff` / `HSTS` sur chaque réponse; `/audit?limit=` exige un positif integer et clamps à 1000; DB startup échec prints un actionable message. |
| Secret/DB jamais ship (v7) | `scripts/package-delivery.mjs` | **B-03 fermé**: packer exclut `config/local.json` et premier niveau `data/*` regardless de `.gitignore`, avec two difficile assertions sur les deux build et `--verify` (contre actual tar entrées). `scripts/setup.mjs` prints `rotating` et rotates aucun pre-existing `issuerSecret` plutôt de silencieusement reusing il, et chmods le fichier à `0600` sur les deux créer et faire tourner. `Dockerfile` utilise `node:22-alpine` (node:SQLite) et crée `config/` à build temps plutôt de `COPY`-ing un secret. `npm run verify:zero-deps` / `npm run verify:p3` sont maintenant first-class gates. |
| conformité paquet | `docs/compliance/` | Vie privée Politique (conservation table, Art.12(3), cookie statement, DPO, DE), DPA (TOM Annexe + 24h/72h violation + signature), ROPA (responsable du traitement + transfert base), SOC2 état de préparation, **SCIM 2.0 (implémenté, `AEGIS_SCIM_TOKEN`)**, **OIDC SSO (implémenté, `AEGIS_AUTH_MODE=oidc`)**, Incident Réponse / DR-Backup / Access-Review / Sub-sous-traitant inventory, VPAT 2.5 UE / WCAG 2.2 AA, SLA, données-Residency; `GET /healthz` + `GET /health` probes; `GET /export/bundle` (Art.20); `scripts/cleanup.mjs` + `scripts/uninstall.mjs` + `Dockerfile`. (ferme le EU/US conformité gap) |
| Identité / SSO | `server/oidc.js` | OIDC authorization-code flux avec RS256 id_token vérification via `node:crypto` (zéro externe dépendance) et SCIM 2.0 approvisionnement (`/scim/v2/Users`, `AEGIS_SCIM_TOKEN` bearer). Les deux sont opt-in fonctionnalité flags — le zero-config local déploiement est unchanged. SCIM déprovisionnement disables connexion (immediate 401) sans purging le détecteur de falsification piste d'audit. |

> **E2E prerequisite pour `verify:flows`:** le deep-flow gate nécessite un navigateur.
> Playwright est **développement uniquement** et fait ne pas affect le zero-runtime-dependency
> allégation. Installer une fois avec `npm i -D playwright && npx playwright install chromium`,
> alors exécuter contre un direct serveur:
> `BASE=http://localhost:8099 AEGIS_ISSUER_SECRET=<issuer> node video-tool/verify-flows.mjs`.

---

## 15 - De sécurité-noyau démo à EU/US industrial déploiement

Le cœur zero-trust noyau + le P3 audit closure sont terminé (§14). À être shippable
à European/American industrial-conformité clients, le établi doit déplacer de
un **local-first démo** à un **production système**. Ce est un phased program, exécuté
phase par phase; chaque phase est vérifié ("wired up") avant le prochain démarre. Statut table
à le fin de ce section.

### 14.1 One-click installer (Phase 0 — Terminé)

Zéro externe dépendances. Le uniquement exigence est **Node.js ≥ 22** (pour le
intégré `node:sqlite`); rien sinon est installed ou exécuter.

```bash
npm run setup     # creates data/ + config/local.json (auto-generated issuer secret)
npm start         # node server.js
```

- `data/aegis.db` est un embedded SQLite magasin (Node intégré) — aucun Postgres/Redis
  à installer, donc "one-click" reste one-click.
- `config/local.json` (git-ignored) porte un auto-generated `issuerSecret`;
  `server.js` lit il automatiquement, ou override via `AEGIS_ISSUER_SECRET`.
- Le serveur maintenant écrit un **serveur-side audit journal** (`audit_events` table) que
  survive restarts — le foundation pour Phase 1's conservé + GDPR-erasure-aware trail.

### 14.2 Phased roadmap

| Phase | Portée | Statut |
|-------|-------|--------|
| **P0** | Foolproof installer + embedded `node:sqlite` magasin + serveur-side audit journal | ✅ terminé (ce section) |
| **P1** | piste d'audit durable dans SQLite + GDPR right-to-erasure (targeted deletion de un subject's rows + conservé effacement marker) + conservation purge (exclut conformité markers) + opérateur-gated `/audit` API (liste / CSV export / erase / purge) | ✅ terminé |
| **P2** | Identité foundation (serveur-side): local compte (scrypt + sel) + serveur-side sessions (TTL) + opérateur auth accepts session Ou bootstrap secret; OIDC authorize-redirect scaffold (config-driven, 501 jusqu.à IdP configuré); SAML/LDAP documenté configuration stubs (ne pas faked). navigateur `token-gate` wiring à sessions deferred à module intégration. | ✅ terminé |
| **P3** | TSA RFC 3161 vérification: signature-over-signedAttrs + message imprint + X.509 **chain-to-trust-store** + validity (eIDAS admissibility). Zero-dep (`node:crypto`). `verifyTimestampToken`, adaptateur `submit` retourne `verification`, plus `/adapter/tsa/verify` point de terminaison. OCSP/CRL révocation vérifier deferred. | ✅ terminé |
| **P4** | Cross-site transport: jeton-gated `/relay` serveur-mediated données relais (serveur-blind repli quand aucun TURN) + STUN/TURN configuration surfaced via `/session` + serveur-side **clé-séquestre** politique (`/escrow` deposit/retrieve, opérateur break-glass) | ✅ terminé |
| **P5** | Révocation: local CRL/OCSP-style deny-list de clé fingerprints (`/admin/revoke`) + **admission-time vérifier** dans `/session` | ✅ terminé |
| **P6** | Production-leaning UI foundation: unifié **conception système** + **opérateur console** (`/aegis-shell/console.html`) que fait P1–P5 serveur fonctionnalités usable (connexion, audit, révocation, séquestre, TSA vérifier). module produit UIs sont functional mais ne pas redesigned dans ce résumi. | ✅ terminé (foundation) |
| **P7** | conformité shell: **i18n** (en/de/fr/es) + **PWA** (manifest + hors ligne service worker) + **SBOM** génération (CycloneDX) + **menace modèle** + **CRA/NIS2** + **sécurité.md** self-assessment. Indépendant tiers pénétration test reste requis (ne peut pas être exécuté par ce projet — explicitement hors de portée). | ✅ terminé (pen-test externe) |

Le opérations console est available dans Anglais, Allemand, French et Spanish. module interfaces sont dans Anglais. support et correspondence sont fourni dans Anglais et Allemand.

### 14.3 Honête portée note

Two éléments ne peut pas être fermé par code alone:

- **Indépendant pénétration test** (partie de P7) doit être exécuté par un third partie
  — ce projet peut uniquement produce le menace modèle et un interne self-assessment.
- P6 (complet UI) et P7 (localization/a11y/PWA) sont le largest phases et sont
  délibérément late dans le order donc le sécurité + données foundations sont solid premier.
