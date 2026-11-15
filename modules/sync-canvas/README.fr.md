<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/sync-canvas/README.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# sync-canvas

Un realtime collaboratif whiteboard avec aucun framework et aucun collaboration library. En clair HTML, CSS et natif ES modules, plus un hand-written niveau caractère O, un single-writer séquenceur et un optimistic UI. Ouvert two onglets et ils sont two clients; swap le transport pour un rél socket et rien sinon dans le codebase modifications.

```
src/engine/    OT, document operations, replication state machine, transport
src/canvas/    viewport, renderer, pointer interaction
src/ui/        toolbar, presence, text editor, debug panel
styles/        design tokens and layout
tests/         convergence fuzz and the TP2 counter-example
chaos/         Python 50-replica chaos harness and its JSON report
```

## Exécuter

ES modules ne peut pas charge de `file://`, donc serve le dossier au-dessus de HTTP:

```bash
cd sync-canvas
npm run dev          # python3 -m http.server 8080
# open http://127.0.0.1:8080/#ROOM1
```

Le salle id est le URL empreinte. Ouvert le même lien dans un deuxième onglet et le two pairs discover chaque autres, elect un séquenceur et synchronisation. `New tab` dans le top bar copies le actuel salle lien; `Disconnect` cuts le transport mais conserve local édition alive.

Shortcuts: `V` select, `S` signature tampon, `L` connector, `0` fit vue, `Space` pan, `Delete` supprimer, `Esc` cancel. Wheel pans; `Ctrl/Cmd + wheel` zooms around le cursor; double-click un note à éditer son texte.

## Architecture

```
                        ┌──────────────────────────────────────────┐
                        │                one tab                   │
                        │                                          │
  pointer / keyboard ──▶│ Interaction ── op ──▶ SyncEngine          │
                        │      │                  │  ▲              │
                        │      │                  │  │ wire         │
                        │      ▼                  ▼  │              │
                        │  TextEditor         SocketProvider ───────┼──▶ BroadcastChannel
                        │      │                  │                  │    or WebSocket
                        │      └──────▶ CanvasRenderer ◀── Presence │
                        │                    ▲                     │ │
                        │                    └── rAF loop         │ │
                        └──────────────────────────────────────────┘
```

`Presence` et le replication couche partager un pipe et sont demultiplexed par le `k` champ (`presence` / `op` / `op-applied` / `sync-request` / `sync-ops`). Le renderer jamais asks où un message came de; le interaction couche jamais asks qui est sequencing.

## Replication modèle

Le moteur a two stable roles plus un transitional état:

| Rôle | Qui | Quoi il fait |
| --- | --- | --- |
| `hub` | smallest site id among en ligne pairs | Transforms chaque incoming op contre son propre journal, assigns un monotonic `rev`, broadcasts `op-applied` |
| `client` | chaque autres pair | S.applique strictly dans `rev` order; son propre opérations attendre dans un unacknowledged file d'attente |
| `warming` | un hub que a juste été elected et a ne pas finished catching up | Collects `sync-request` replies et uniquement alors démarre ordonnancement |

Election nécessite aucun negotiation: `setPeers` takes le actuel en ligne ensemble, sorts il, picks le premier. Chaque réplique computes le même answer.

### Optimistic mise à jour

Le renderer fait ne pas draw `doc`; il draws:

```js
view = doc            // the part the hub has already ordered
     + unacked         // local ops sent but not yet echoed by the hub
```

`unacked` est overlaid localement uniquement et est jamais écrit dans le journal. Une fois le hub echoes un op il laisse le file d'attente et le vue converges à `doc`. Dragging, typing et color modifications donc jamais attendre sur le réseau; même hors ligne vous conserver édition, `unacked` juste grows.

### Commit chemin

Quand le hub receives un op il premier computes le difference contre le journal:

```js
transformAgainstLog(wire) {
  let op = wire.op;
  for (const h of this.log) {
    // transform only against entries the author had not seen yet
    if (h.seq <= (wire.vv[h.site] || 0)) continue;
    op = BoardOT.transform(op, h.op, wire.site, h.site);
    if (!op) return null;         // target deleted / overwritten by a newer write
  }
  return op;
}
```

Chaque op porte son propre version vecteur `vv` (`site → last seq`), un snapshot taken à envoyer temps. Le hub jamais a à ask "comment far avait vous seen"; le journal lui-même answers.

`rev` est un global monotonic compteur. Clients appliquer dans `rev` order; un gap goes dans `inbox` et le tampon drains une fois le manquant revision arrives. Un `seen` ensemble enregistrements already-ordered `site:seq` pairs, donc retransmits et duplicate echoes jamais produce un deuxième journal entrée.

### Anti-entropy et reconnexion

- `sync-request`: porte le sender's `rev` et asks everyone dans le salle pour journal slices.
- `sync-ops`: **aucun** en ligne pair peut answer, ne pas juste le hub. Ce est quoi lets un nouveau hub rebuild de un surviving réplique plutôt de depending sur le node que juste died.
- Un nouveau hub's `warming` phase collects replies de chaque en ligne pair (deduplicated `replied` + `expected` compteur + timeout repli), alors broadcasts son ensemble journal une fois; répliques derrière il ignore entrées ils déjà avoir.
- Pendant hors ligne, tous écrit go dans `outbox`; sur reconnexion chaque rôle flushes son propre way (hub orders directement, client retransmits `unacked` et alors le outbox). Un following `sync-request` picks up tout others wrote pendant le panne.
- Un séquenceur que resumes après un short panne rejoue son journal avec `replay: true`; clients answer par retransmitting leur unacknowledged file d'attente. Avant ordonnancement un op, le hub contrôles chaque entrée dans son `vv` contre `seen` et parks il quand un predecessor est manquant. Ce est quoi conserve un 3-deuxième séquenceur panne (too short pour présence expiration) de stranding modifications.
- Quand un autre pair goes hors ligne, 8 secondes sans présence evicts il de le roster; quand il reappears il porte un `hello` indicateur et les deux sides force un re-election, preventing un two-hub fenêtre où le returning pair encore believes il est hub pendant le autres side fait too.

## O details

### Texte

`OT.js` est single-field niveau caractère O avec trois composants: `retain(n)`, `insert(s)`, `delete(n)`. Chaque keystroke premier s.exécute `diff(base, next)` à produce un op couvrant le ensemble string, alors hands il à le moteur; incoming distant opérations sont rebased avec `transform`, et `mapIndex` fixes le local caret et selection, donc concurrent typing jamais lève le caret à fin de ligne.

Texte opérations satisfy TP1: two concurrent opérations produce le même résultat aucun matter lequel un est appliqué premier. `tests/fuzz.mjs` assure ce à startup.

### Board

`BoardOT.js` defines quatre opérations:

| Opération | Semantics | Conflict politique |
| --- | --- | --- |
| `ins(i, node)` | Insert un node à liste position `i` | Concurrent inserts à le même position ordered par `aSite < bSite`, donc chaque réplique agrees |
| `del(i, id)` | Supprimer un given id | Located par id; `i` uniquement recomputes le index; retourne `null` si le cible est déjà gone |
| `set(id, patch, ts)` | Modification properties | Per-clé LWW comparing `(ts, site)`; le losing clés sont stripped de le op |
| `txt(id, op)` | Modification texte | Delegated à niveau caractère O |

Drags commit **absolute coordinates**, ne pas deltas. Quand several pairs draguer le même note, LWW picks un final position plutôt de chaque side adding half un offset. Drags sont throttled à un commit chaque 40ms pendant rendu encore follows le local offset à 60fps.

### Pourquoi un hub est obligatoire: le TP2 frontière

Position-based O est TP1-sûr pour **two** concurrent opérations; avec **trois**, le transform résultat dépend sur application order. Que est un propriété de le modèle, ne pas un implémentation bug. `tests/tp2.mjs` enumerates le même texte avec trois concurrent modifications et quatre application orders à travers 3000 aléatoire groups, et observes roughly **2760 diverging groups** par exécuter (varies avec randomness).

Donc le architecture jamais fait peer-to-peer transforms. Chaque intent premier reaches un unique serialization point; le hub uniquement a à guarantee TP1, et il alone decides global order. Le classic Jupiter modèle, et chaque collaboratif editor actually dans production, a ce shape.

## Présence et ghost cursors

`Presence` throttles world coordinates, selected id et édition id à chaque 40ms; heartbeat chaque 3 secondes, expiration après 8. Reçu positions sont ne pas assigned directement: chaque cadre `lerp`s 0.3 toward le cible, donc cursors glide plutôt de jumping packet par packet. Coordinates sont world coordinates, donc un distant cursor encore points à le même canvas emplacement après le autres side zooms ou pans.

Le top-left de chaque note porte le moteur attribution (or dot + `JEROME YOUNG`); un distant selection draws un dashed outline around le note, et un note étant typed dans affiche `name · typing` beside le cursor.

## Connecting un rél backend

Là est exactement un seam dans le transport couche: `SocketProvider`. Il connects `send()` et incoming messages à un lien; les deux `BroadcastChannelLink` et `WebSocketLink` implement le même `post / close`. Le moteur, renderer et interaction couche avoir aucun idea quoi sits underneath.

### Option 1: passthrough (JSON relais)

Déjà supported:

```
http://127.0.0.1:8080/?ws=ws://127.0.0.1:8081#ROOM1
```

Le backend uniquement a à forward reçu JSON à le autres connections dans le même salle. Le in-page hub conserve ordonnancement; le backend nécessite aucun O knowledge.

### Option 2: Socket.io

Le serveur est un salle relais avec aucun document logique:

```js
// server.js — npm i socket.io
import { Server } from 'socket.io';

const io = new Server(8081, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  const room = String(socket.handshake.query.room || 'LOBBY');
  socket.join(room);

  socket.on('board', (msg) => {
    // Forward to everyone else in the room, never echo to the sender.
    // The engine assumes a sender does not receive its own message
    // (BroadcastChannel has the same semantics).
    socket.to(room).emit('board', msg);
  });
});
```

Le client uniquement swaps le lien; le interface correspond `WebSocketLink`:

```js
// add one link inside src/engine/SocketProvider.js
import { io } from 'socket.io-client';

class SocketIoLink {
  constructor(url, room, onMessage) {
    this.socket = io(url, { query: { room } });
    this.socket.on('board', (msg) => onMessage(msg));
  }
  post(msg) {
    this.socket.emit('board', msg);
  }
  close() {
    this.socket.close();
  }
}
```

Alors pick un par URL prefix à l.íntérieur `SocketProvider.open()`:

```js
this.link = this.url?.startsWith('io://')
  ? new SocketIoLink(this.url.slice(5), this.room, handler)
  : this.url
    ? new WebSocketLink(this.url, handler, (s) => this.onStatus(s))
    : new BroadcastChannelLink(this.room, handler);
```

Le lien becomes `http://127.0.0.1:8080/?ws=io://localhost:8081#ROOM1`. Cœur entreprise code modifications par zéro lignes.

Si vous want le backend à become le uniquement serialization point, déplacer `SyncEngine`'s hub branch onto le serveur, ou faire le serveur permanently play hub (clients conserver uniquement le `client` chemin). Le message format est déjà en clair JSON; migration coût est moving un fichier.

## signature tampons, locking & audit chain

module 2 turns le board dans un cosignature surface: après un drawing est
desensitized, two engineers chaque drop leur signature et le résultat est verrouillé,
attributed et audit-trailed. Le "nouveau note" tool est replaced par un "signature
tampon" tool (`S`).

### Tampon node

Un tampon est un first-class board node (`kind: 'stamp'`), 220×104 px, drawn as un
parchment carte avec un or border, un red wax sceau et le signataire's nom. Il
porte:

| Champ | Meaning |
| --- | --- |
| `name` | le signataire's display nom |
| `by` | le signataire's site id |
| `fp` | ce client's public-clé empreinte (`sha256Hex(site:room)`, premier 16 hex) |
| `hash` | le audit empreinte de ce stamp's affix événement |
| `prevHash` | le previous audit-chain empreinte il liens à |
| `sigTs` | moteur horodatage de le affix |
| `locked`, `lockedBy` | verrou état et qui ensemble il |

### État verrou (replicated à travers O)

Un tampon est *unlocked* le instant il est dropped, donc le signataire peut nudge il dans
place; sur pointer version `finalizeStamp` s.exécute:

1. ajouter un enregistrement à le local audit chaîne d'empreintes (`Hash(prev + op)`);
2. replicate le verrou as un ordinary O `set(id, { locked: true, lockedBy, fp, hash, prevHash, sigTs })`.

Parce que le verrou est juste un node propriété flowing à travers le séquenceur, **chaque**
pair — y compris le un qui fait ne pas sign — receives il et treats le tampon as
immovable. Aucun moteur modification était nécessaire; le verrou rides le existing
last-writer-wins `Object.assign` chemin. `src/engine/lock.js` est le unique garde:
`canMove`, `canDelete` et `isLocked` tous lire `node.locked`. Un verrouillé tampon
ne peut pas être dragged, marquee-deleted ou retiré; le toolbar hides le
delete/colour bar quand le ensemble selection est verrouillé.

### audit chaîne d'empreintes

`src/audit/HashChain.js` conserve un append-only chain:

```js
entry = Hash(prevHash || canonical(op))
```

- `genesis` est 64 zero-hex; chaque affix folds dans le previous empreinte.
- `verify()` rejoue le chain et retourne `null` quand intact, ou le index de le
  premier altéré lien.
- Délégation d'empreintes utilise `globalThis.crypto.subtle` (SHA-256, hex) avec un synchronous
  Node repli, donc le même classe s.exécute dans le navigateur et sous `node`.

Le latest 12 enregistrements sont rendu direct dans le inspector's **audit chain** panneau.

### Reception

Ouvert le même salle dans un deuxième onglet (two clients). Avec le `S` tool, Un drops un
tampon et releases: il locks. B ne peut pas draguer ou supprimer A's tampon et les deux
documents converge. Le headless equivalent est `tests/stamp.test.mjs` (14
assertions, voir ci-dessous).

## Vérifié

```bash
npm test                    # node tests/fuzz.mjs + node tests/stamp.test.mjs
node tests/fuzz.mjs 300     # run more rounds
node tests/stamp.test.mjs   # Module 2: chain, lock policy, cross-engine lock
```

300-tour sortie (différent sur chaque exécuter):

```
text TP1: ✓ passed
convergence: ✓ 300/300 runs identical (avg 8 nodes, 1138 disconnects, 1688 sequencer handoffs)
```

module 2 — signature tampons, locking & audit chain (`node tests/stamp.test.mjs`, 14 assertions):

```
stamp / lock / audit-chain tests

  ✓ first link = Hash(genesis | op0)
  ✓ second link folds in the previous hash
  ✓ verify() reports an intact chain
  ✓ verify() detects a tampered link
  ✓ identical inputs produce an identical chain head
  ✓ a different genesis diverges the chain
  ✓ isLocked reflects the flag
  ✓ a locked stamp cannot be moved
  ✓ a locked stamp cannot be deleted
  ✓ B receives A’s stamp node
  ✓ B sees the stamp locked (state lock replicated)
  ✓ acceptance: B cannot move A’s locked stamp
  ✓ acceptance: B cannot delete A’s locked stamp
  ✓ A and B documents converge

✓ all stamp tests passed
```

Le complet test inventory, assertion definitions, uncovered areas et reproduction commands sont dans [Test_Rapport.md](TEST_REPORT.md).

Le fuzz harness utilise 2–4 aléatoire pairs par tour, aléatoire create/delete/update/type, et un 5% chance de un disconnect (always keeping à au moins un en ligne); à le fin chaque pair reconnects et s.exécute two anti-entropy rounds. Assertion: tous répliques accepter exactement sur `doc.nodes`, `rev` et `unacked`.

navigateur de bout en bout (two rél onglets):

- le hub seeds 7 nœuds sur premier paint; les deux sides accepter sur `rev` et node nombre
- créer un note et type à travers onglets: niveau caractère `txt` opérations arrive un par un et `unacked` retourne à zéro
- rôle split: le smaller site est `hub`, le larger est `client`
- éditer pendant hors ligne, reconnexion, et les deux summaries accepter
- take le small site hors ligne pour 12 secondes: le grand site takes au-dessus de as hub; quand le small site retourne il reclaims le hub rôle, le grand site drops retour à client, et `rev` / node nombre accepter sur les deux sides
- créer, draguer, Ctrl+wheel zoom, connect, marquee select et cascading supprimer tous modification le document as attendu
- zéro console erreurs

## Chaos fuzzer (50 répliques)

```bash
python3 -m pip install websockets
npm run chaos
```

`chaos/fuzzer.py` démarre un salle relais et un control API dans Python, boots 50 rél
`SyncEngine` répliques à travers `chaos/agent.mjs`, et behaves comme un hostile
réseau pour 14 secondes: 3 à 5 aléatoire sockets sont cut pour about 3 secondes chaque
0.9 secondes, le séquenceur est taken down pour 10.5 secondes, et 1 à 2 clients
conserver firing niveau caractère texte opérations, inserts et propriété patches. Alors chaque
lien est healed, anti-entropy s.exécute, tous 50 documents sont pulled au-dessus de le control
API, et Python empreinte chaque un avec SHA-256.

Checked-in exécuter (seed `20261109`): **50/50 répliques identique**, `rev = 255`,
75 nœuds, un empreinte
`5f74f3c075d575e50187e2a73ea002f6567c21fc35e3efb0e40dc74bd7e27505`, 249 local
opérations, 57 pannes, 2 séquenceur remises (`BOT-01` à `BOT-02` à +10.3s,
retour à +14.5s), 85 MB relayed, convergence 2.9s après heal. Le rapport est
[chaos-report.json](chaos/chaos-report.json); le harness, schema, assertions et
limites sont dans [chaos/README.md](chaos/README.md).

Ce exécuter également trouvé et corrigé un rél défaut: un séquenceur panne shorter que
présence expiration pourrait strand modifications dans `unacked` pendant plus tard opérations claimed causal
predecessors le hub jamais saw. Le correctif est le replay-driven retransmit plus le
hub-side causal gate described sous anti-entropy; le 8-client reproduction
(`--clients 8 --chaos-seconds 8 --hub-outage 3`) maintenant résuit as well.

## Boundaries et trade-offs

- **Aucun persistance.** Refreshing le page laisse le salle; le serveur a aucun base de données either. Durability exige un stockage couche.
- **Aucun authentication.** Anyone avec le salle id gets dans; production doit validate pendant le connexion handshake.
- **BroadcastChannel est same-origin, same-navigateur onglets uniquement**; il ne peut pas cross devices. Utiliser `?ws=` pour que.
- **Le hub est un unique point.** Pendant il est stuck, clients peut encore éditer localement, mais aucun nouveau `rev` existe jusqu.à présence expiration triggers un re-election. Que est le unavoidable coût de un serverless prototype.
- **Aucun z-order, undo/redo, images ou permissions.** Node order est insertion order; `set` résout propriété conflicts, ne pas "qui est sur top".
- **Texte O diffs par character**, good pour note-length texte mais ne pas long documents; long texte devrait déplacer à line-level O ou un CRDT.
- **Présence est best effort.** réseau perte, crashes et forced onglet ferme tous expire après 8 secondes; aucun "dernier connu état" est persistant.

## Anglais

Un dependency-free realtime whiteboard: natif ES modules, Canvas 2D rendu, niveau caractère operational transformation, et un single-writer séquenceur. Chaque éditer est appliqué localement premier (optimistic overlay), alors transformed contre le sequencer's journal et committed avec un monotonic revision. Clients appliquer revisions strictly dans order et tampon lacunes; aucun réplique peut answer anti-entropy requêtes, lequel est quoi lets un newly elected séquenceur rebuild lui-même de un surviving pair après le previous un disappears. Un causal gate parks opérations whose version vecteur noms un predecessor le séquenceur a ne pas seen, et un replay signal fait clients retransmit stranded work. Présence, cursors et selection highlights ride le même transport, et hors ligne modifications sont queued et merged sur reconnexion. Le transport est un swappable lien: BroadcastChannel par par défaut, brut WebSocket ou Socket.io avec un relais-only backend. Un 300-tour fuzz suite avec aléatoire déconnexions et séquenceur remises converges sur chaque exécuter, et un 50-réplique Python chaos exécuter avec 57 socket cuts, 2 séquenceur remises et 249 concurrent modifications converges à un SHA-256 dans 2.9s. `tests/tp2.mjs` reproduces le classic three-way TP2 divergence que motivates le séquenceur conception.

signature tampons (module 2) let two engineers drop attributed, verrouillé marques sur un desensitized drawing: le verrou est un OT-replicated node propriété, donc chaque pair — signataire ou ne pas — voit un stamped mark as immovable, et chaque affix est appended à un local SHA-256 audit chain (`Hash(prev + op)`) que le inspector peut vérifier direct. Un headless suite assure chain intégrité, le locking politique et cross-engine verrou replication (B ne peut pas déplacer ou supprimer A's verrouillé tampon).

## licence & attribution

`sync-canvas` — Distributed État & Real-time Collaboration Moteur
Droit d.auteur (c) 2026 Jerome Young (Yang Jie)
Contact: jeromeyoung608@gmail.com

**Ouvert source, Apache-2.0** — voir `LICENSE`.

---

## MDS-1 Livraison Contrat

> Ce section est le vérifiable par machine form de `MODULE-DELIVERY-STANDARD.md`. Il reflète le chapters ci-dessus et answers le 12 questions un buyer asks, un par un.

### 1. Quoi il résout
Beaucoup people édition le même document à une fois: en clair WebSocket broadcast overwrites modifications, et état forks après un disconnect/reconnect.

### 2. Qui achète ce
SaaS équipes et internal-tool équipes que besoin un whiteboard / collaboratif édition capacité.

### 3. Exécuter dans 60 secondes
```bash
python3 -m http.server 8080 → http://127.0.0.1:8080/#ROOM1
```

### 4. Intégration contrat
`apply / diff / transform / mapIndex` (texte O), `HashChain` (audit chain); voir README O details. Callers besoin uniquement le facade; interne fichiers sont ne pas le public API.

### 5. Architecture
Client optimistic mise à jour → hub sequencing/commit → anti-entropy reconnexion; voir Replication modèle.

### 6. Garantit & menace modèle
TP1 convergence: aucun two concurrent modifications converge à le même texte après transform (tests/ot.test.mjs, 200 aléatoire groups). Hors de portée: un compromis host OS, ou un navigateur extension actively reading page mémoire.

### 7. Connu limites
Un hub séquenceur est obligatoire (TP2 frontière); aucun de bout en bout chiffrement; single-room échelle est mesuré up à 50 clients.

### 8. Vérification
```bash
node --test tests/*.test.mjs → # pass 13
```
Attendu sortie inclut `# pass 13`, `# fail 0`.

### 9. Mesuré performance
50 clients / 53 déconnexions / 670 ms convergence; fuzz 300/300 identique.

### 10. Dépendances
Un · Pur Zéro: 0 npm dépendances, 0 vendor, 0 externe requêtes.

### 11. licence
**Ouvert source, Apache-2.0** — voir `LICENSE`.

### 12. CHANGELOG
Voir [`CHANGELOG.md`](./CHANGELOG.md).
