<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/sync-canvas/README.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# sync-canvas

Ein realtime kollaborativ whiteboard mit kein framework und kein Zusammenarbeit library. Klartext HTML, CSS und nativ ES modules, plus ein hand-written Zeichenebene Oder, ein single-writer Sequencer und ein optimistic UI. Offen two Registerkarten und sie sind two Clients; swap Transport für ein echt Socket und nichts sonst in der codebase Änderungen.

```
src/engine/    OT, document operations, replication state machine, transport
src/canvas/    viewport, renderer, pointer interaction
src/ui/        toolbar, presence, text editor, debug panel
styles/        design tokens and layout
tests/         convergence fuzz and the TP2 counter-example
chaos/         Python 50-replica chaos harness and its JSON report
```

## Ausführen

ES modules kann nicht Last von `file://`, so serve Ordner über HTTP:

```bash
cd sync-canvas
npm run dev          # python3 -m http.server 8080
# open http://127.0.0.1:8080/#ROOM1
```

Der Raum id ist der URL Hash. Offen der gleich Verknüpfung in ein zweite Registerkarte und der two Peers discover jeder andere, elect ein Sequencer und Synchronisation. `New tab` in der top bar copies der aktuell Raum Verknüpfung; `Disconnect` cuts Transport aber behält lokal Bearbeitung alive.

Shortcuts: `V` select, `S` Signatur Stempel, `L` connector, `0` fit Ansicht, `Space` pan, `Delete` löschen, `Esc` cancel. Wheel pans; `Ctrl/Cmd + wheel` zooms around der cursor; double-click ein Hinweis zu bearbeiten seiner Text.

## Architektur

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

`Presence` und der replication Ebene teilen eine pipe und sind demultiplexed durch der `k` Feld (`presence` / `op` / `op-applied` / `sync-request` / `sync-ops`). Der renderer niemals asks wo ein Meldung came von; der interaction Ebene niemals asks wer ist sequencing.

## Replication Modell

Der Engine hat two stabil roles plus eine transitional Zustand:

| Rolle | Wer | Was es macht |
| --- | --- | --- |
| `hub` | smallest Standort id among online Peers | Transforms jeder incoming op gegen seiner eigen Protokoll, assigns ein monotonic `rev`, broadcasts `op-applied` |
| `client` | jeder andere Peer | Gilt strictly in `rev` order; seiner eigen Betrieb warten in ein unacknowledged Warteschlange |
| `warming` | ein Hub das hat nur gewesen elected und hat nicht finished catching up | Collects `sync-request` replies und nur dann startet Reihenfolge |

Election benötigt kein negotiation: `setPeers` takes der aktuell online Set, sorts es, picks der erste. Jeder Replikat computes der gleich answer.

### Optimistic Aktualisierung

Der renderer macht nicht draw `doc`; es draws:

```js
view = doc            // the part the hub has already ordered
     + unacked         // local ops sent but not yet echoed by the hub
```

`unacked` ist overlaid lokal nur und ist niemals geschrieben in Protokoll. Einmal Hub echoes ein op es lässt Warteschlange und Ansicht converges zu `doc`. Dragging, typing und color Änderungen daher niemals warten auf Netzwerk; auch offline Sie behalten Bearbeitung, `unacked` nur grows.

### Commit Pfad

Wenn Hub receives ein op es erste computes der difference gegen Protokoll:

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

Jeder op trägt seiner eigen Version Vektor `vv` (`site → last seq`), ein snapshot taken bei senden Zeit. Der Hub niemals hat zu ask "wie far hatte Sie seen"; Protokoll selbst answers.

`rev` ist ein global monotonic Zähler. Clients anwenden in `rev` order; ein gap goes in `inbox` und Puffer drains einmal der fehlt revision arrives. Ein `seen` Set Datensätze already-ordered `site:seq` pairs, so retransmits und duplicate echoes niemals produce ein zweite Protokoll Eintrag.

### Anti-entropy und Neuverbindung

- `sync-request`: trägt der sender's `rev` und asks everyone in Raum für Protokoll slices.
- `sync-ops`: **irgendein** online Peer kann answer, nicht nur Hub. Dies ist was lets ein neu Hub rebuild von ein surviving Replikat stattdessen von depending auf der node das nur died.
- Ein neu hub's `warming` Phase collects replies von jeder online Peer (deduplicated `replied` + `expected` Zähler + timeout Rückfallebene), dann broadcasts seiner gesamte Protokoll einmal; Replikate hinter es ignore Einträge sie bereits haben.
- Während offline, alle schreibt go in `outbox`; auf Neuverbindung jeder Rolle flushes seiner eigen way (Hub orders direkt, Client retransmits `unacked` und dann der outbox). Ein following `sync-request` picks up alles others wrote während Ausfall.
- Ein Sequencer das resumes nach ein short Ausfall wiederholt seiner Protokoll mit `replay: true`; Clients answer durch retransmitting ihrer unacknowledged Warteschlange. Vor Reihenfolge ein op, Hub Prüfungen jeder Eintrag in seiner `vv` gegen `seen` und parks es wenn ein predecessor ist fehlt. Dies ist was behält ein 3-zweite Sequencer Ausfall (too short für Präsenz Ablauf) von stranding Änderungen.
- Wenn eine weitere Peer goes offline, 8 Sekunden ohne Präsenz evicts es von der roster; wenn es reappears es trägt ein `hello` Schalter und beide sides force ein re-election, preventing ein two-hub Fenster wo der returning Peer noch believes es ist Hub während der andere side macht too.

## Oder details

### Text

`OT.js` ist single-field Zeichenebene Oder mit drei Komponenten: `retain(n)`, `insert(s)`, `delete(n)`. Jeder keystroke erste läuft `diff(base, next)` zu produce ein op abdeckend der gesamte string, dann hands es zu Engine; incoming entfernt Betrieb sind rebased mit `transform`, und `mapIndex` fixes der lokal caret und selection, so gleichzeitig typing niemals wirft der caret zu Ende von Zeile.

Text Betrieb satisfy TP1: two gleichzeitig Betrieb produce der gleich Ergebnis kein matter welche eine ist angewendet erste. `tests/fuzz.mjs` bestätigt dies bei startup.

### Board

`BoardOT.js` defines vier Betrieb:

| Vorgang | Semantics | Conflict Richtlinie |
| --- | --- | --- |
| `ins(i, node)` | Insert ein node bei Liste position `i` | Gleichzeitig inserts bei der gleich position ordered durch `aSite < bSite`, so jeder Replikat agrees |
| `del(i, id)` | Löschen ein given id | Located durch id; `i` nur recomputes Index; gibt zurück `null` wenn Ziel ist bereits gone |
| `set(id, patch, ts)` | Änderung properties | Per-Schlüssel LWW comparing `(ts, site)`; der losing Schlüssel sind stripped von der op |
| `txt(id, op)` | Änderung Text | Delegated zu Zeichenebene Oder |

Drags commit **absolute coordinates**, nicht deltas. Wenn several Peers ziehen der gleich Hinweis, LWW picks eine endgültig position stattdessen von jeder side adding half ein offset. Drags sind throttled zu ein commit jeder 40ms während Darstellung noch follows der lokal offset bei 60fps.

### Warum ein Hub ist verpflichtend: TP2 Grenze

Position-based Oder ist TP1-sicher für **two** gleichzeitig Betrieb; mit **drei**, der transform Ergebnis hängt ab auf Anwendung order. Das ist ein Eigenschaft von Modell, nicht ein Implementierung bug. `tests/tp2.mjs` enumerates der gleich Text mit drei gleichzeitig Änderungen und vier Anwendung orders über 3000 Zufall groups, und observes roughly **2760 diverging groups** pro ausführen (varies mit randomness).

So Architektur niemals macht peer-to-peer transforms. Jeder intent erste reaches ein einzeln serialization Punkt; Hub nur hat zu guarantee TP1, und es alone decides global order. Der classic Jupiter Modell, und jeder kollaborativ editor actually in Produktion, hat dies shape.

## Präsenz und ghost cursors

`Presence` throttles world coordinates, selected id und Bearbeitung id zu jeder 40ms; heartbeat jeder 3 Sekunden, Ablauf nach 8. Erhalten positions sind nicht assigned direkt: jeder Rahmen `lerp`s 0.3 toward Ziel, so cursors glide stattdessen von jumping packet durch packet. Coordinates sind world coordinates, so ein entfernt cursor noch Punkte bei der gleich Canvas Ort nach der andere side zooms oder pans.

Der top-left von jeder Hinweis trägt Engine Zuordnung (Gold dot + `JEROME YOUNG`); ein entfernt selection draws ein dashed outline around Hinweis, und ein Hinweis werdend typed in zeigt `name · typing` beside der cursor.

## Connecting ein echt Backend

Dort ist genau eine seam in Transport Ebene: `SocketProvider`. Es connects `send()` und incoming Nachrichten zu ein Verknüpfung; beide `BroadcastChannelLink` und `WebSocketLink` implement der gleich `post / close`. Der Engine, renderer und interaction Ebene haben kein idea was sits underneath.

### Option 1: passthrough (JSON Relay)

Bereits supported:

```
http://127.0.0.1:8080/?ws=ws://127.0.0.1:8081#ROOM1
```

Der Backend nur hat zu forward erhalten JSON zu der andere connections in der gleich Raum. Der in-page Hub behält Reihenfolge; Backend benötigt kein Oder knowledge.

### Option 2: Socket.io

Der Server ist ein Raum Relay mit kein Dokument Logik:

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

Der Client nur swaps Verknüpfung; Schnittstelle passt `WebSocketLink`:

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

Dann pick eine durch URL prefix innen `SocketProvider.open()`:

```js
this.link = this.url?.startsWith('io://')
  ? new SocketIoLink(this.url.slice(5), this.room, handler)
  : this.url
    ? new WebSocketLink(this.url, handler, (s) => this.onStatus(s))
    : new BroadcastChannelLink(this.room, handler);
```

Der Verknüpfung becomes `http://127.0.0.1:8080/?ws=io://localhost:8081#ROOM1`. Kern Geschäft Code Änderungen durch null Zeilen.

Wenn Sie want Backend zu become der nur serialization Punkt, bewegen `SyncEngine`'s Hub branch onto Server, oder machen Server permanently play Hub (Clients behalten nur der `client` Pfad). Der Meldung Format ist bereits Klartext JSON; migration Kosten ist moving eine Datei.

## Signatur Stempel, locking & Audit chain

Modul 2 turns der board in ein Mitzeichnung Oberfläche: nach ein drawing ist
desensitized, two engineers jeder drop ihrer Signatur und Ergebnis ist gesperrt,
attributed und Audit-trailed. Der "neu Hinweis" tool ist replaced durch ein "Signatur
Stempel" tool (`S`).

### Stempel node

Ein Stempel ist ein first-class board node (`kind: 'stamp'`), 220×104 px, drawn as ein
parchment Karte mit ein Gold border, ein red wax Siegel und Signierer's Name. Es
trägt:

| Feld | Meaning |
| --- | --- |
| `name` | Signierer's display Name |
| `by` | Signierer's Standort id |
| `fp` | dies client's public-Schlüssel Fingerabdruck (`sha256Hex(site:room)`, erste 16 hex) |
| `hash` | Audit Hash von dies stamp's affix Ereignis |
| `prevHash` | der previous Audit-chain Hash es Verknüpfungen zu |
| `sigTs` | Engine Zeitstempel von der affix |
| `locked`, `lockedBy` | Sperre Zustand und wer Set es |

### Zustand Sperre (replicated durch Oder)

Ein Stempel ist *unlocked* der instant es ist dropped, so Signierer kann nudge es in
place; auf pointer Release `finalizeStamp` läuft:

1. anhängen eine Datensatz zu der lokal Audit Hash-Kette (`Hash(prev + op)`);
2. replicate Sperre as ein ordinary Oder `set(id, { locked: true, lockedBy, fp, hash, prevHash, sigTs })`.

Weil Sperre ist nur ein node Eigenschaft flowing durch Sequencer, **jeder**
Peer — einschließlich der eine wer tat nicht sign — receives es und treats Stempel as
immovable. Kein Engine Änderung war benötigt; Sperre rides der existing
last-writer-wins `Object.assign` Pfad. `src/engine/lock.js` ist der einzeln Wächter:
`canMove`, `canDelete` und `isLocked` alle lesen `node.locked`. Ein gesperrt Stempel
kann nicht sein dragged, marquee-deleted oder entfernt; der toolbar hides der
delete/colour bar wenn der gesamte selection ist gesperrt.

### Audit Hash-Kette

`src/audit/HashChain.js` behält ein nur-appendierbar chain:

```js
entry = Hash(prevHash || canonical(op))
```

- `genesis` ist 64 zero-hex; jeder affix folds in der previous Hash.
- `verify()` wiederholt der chain und gibt zurück `null` wenn unversehrt, oder Index von der
  erste manipuliert Verknüpfung.
- Hash-Bildung verwendet `globalThis.crypto.subtle` (SHA-256, hex) mit ein synchronous
  Node Rückfallebene, so der gleich Klasse läuft in Browser und unter `node`.

Der latest 12 Datensätze sind gerendert live in der inspector's **Audit chain** Bereich.

### Abnahme

Offen der gleich Raum in ein zweite Registerkarte (two Clients). Mit der `S` tool, Ein drops ein
Stempel und releases: es locks. B kann nicht ziehen oder löschen A's Stempel und beide
Dokumente converge. Der Headless equivalent ist `tests/stamp.test.mjs` (14
Assertions, siehe unten).

## Geprüft

```bash
npm test                    # node tests/fuzz.mjs + node tests/stamp.test.mjs
node tests/fuzz.mjs 300     # run more rounds
node tests/stamp.test.mjs   # Module 2: chain, lock policy, cross-engine lock
```

300-Runde Ausgabe (unterschiedlich auf jeder ausführen):

```
text TP1: ✓ passed
convergence: ✓ 300/300 runs identical (avg 8 nodes, 1138 disconnects, 1688 sequencer handoffs)
```

Modul 2 — Signatur Stempel, locking & Audit chain (`node tests/stamp.test.mjs`, 14 Assertions):

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

Der vollständig Test inventory, Assertion definitions, uncovered areas und reproduction commands sind in [Test_Bericht.md](TEST_REPORT.md).

Der Fuzz harness verwendet 2–4 Zufall Peers pro Runde, Zufall create/delete/update/type, und ein 5% chance von ein disconnect (always keeping bei mindestens eine online); bei Ende jeder Peer reconnects und läuft two anti-entropy rounds. Assertion: alle Replikate zustimmen genau auf `doc.nodes`, `rev` und `unacked`.

Browser Ende-zu-Ende (two echt Registerkarten):

- Hub seeds 7 Knoten auf erste paint; beide sides zustimmen auf `rev` und node Anzahl
- erstellen ein Hinweis und type über Registerkarten: Zeichenebene `txt` Betrieb arrive eine durch eine und `unacked` gibt zurück zu null
- Rolle split: der smaller Standort ist `hub`, der larger ist `client`
- bearbeiten während offline, Neuverbindung, und beide summaries zustimmen
- take der small Standort offline für 12 Sekunden: der groß Standort takes über as Hub; wenn der small Standort gibt zurück es reclaims Hub Rolle, der groß Standort drops zurück zu Client, und `rev` / node Anzahl zustimmen auf beide sides
- erstellen, ziehen, Ctrl+wheel zoom, connect, marquee select und cascading löschen alle Änderung Dokument as erwartet
- null Konsole Fehler

## Chaos fuzzer (50 Replikate)

```bash
python3 -m pip install websockets
npm run chaos
```

`chaos/fuzzer.py` startet ein Raum Relay und ein control API in Python, boots 50 echt
`SyncEngine` Replikate durch `chaos/agent.mjs`, und behaves wie ein hostile
Netzwerk für 14 Sekunden: 3 zu 5 Zufall sockets sind cut für about 3 Sekunden jeder
0.9 Sekunden, Sequencer ist taken down für 10.5 Sekunden, und 1 zu 2 Clients
behalten firing Zeichenebene Text Betrieb, inserts und Eigenschaft patches. Dann jeder
Verknüpfung ist healed, anti-entropy läuft, alle 50 Dokumente sind pulled über der control
API, und Python hasht jeder eine mit SHA-256.

Checked-in ausführen (seed `20261109`): **50/50 Replikate identisch**, `rev = 255`,
75 Knoten, eine Hash
`5f74f3c075d575e50187e2a73ea002f6567c21fc35e3efb0e40dc74bd7e27505`, 249 lokal
Betrieb, 57 Ausfälle, 2 Sequencer Übergaben (`BOT-01` zu `BOT-02` bei +10.3s,
zurück bei +14.5s), 85 MB relayed, Konvergenz 2.9s nach heal. Der Bericht ist
[chaos-report.json](chaos/chaos-report.json); der harness, schema, Assertions und
Grenzen sind in [chaos/README.md](chaos/README.md).

Dies ausführen auch gefunden und behoben ein echt Fehler: ein Sequencer Ausfall shorter als
Präsenz Ablauf könnte strand Änderungen in `unacked` während später Betrieb claimed causal
predecessors Hub niemals saw. Der Kcorrektur ist der replay-driven retransmit plus der
hub-side causal Gate described unter anti-entropy; der 8-Client reproduction
(`--clients 8 --chaos-seconds 8 --hub-outage 3`) jetzt besteht as well.

## Boundaries und trade-offs

- **Kein Persistenz.** Refreshing Seite lässt Raum; Server hat kein Datenbank either. Durability erfordert ein Speicher Ebene.
- **Kein authentication.** Anyone mit Raum id gets in; Produktion muss validate während Verbindung handshake.
- **BroadcastChannel ist same-origin, same-Browser Registerkarten nur**; es kann nicht cross devices. Verwenden `?ws=` für das.
- **Der Hub ist ein einzeln Punkt.** Während es ist stuck, Clients kann noch bearbeiten lokal, aber kein neu `rev` existiert bis Präsenz Ablauf triggers ein re-election. Das ist der unavoidable Kosten von ein serverless prototype.
- **Kein z-order, undo/redo, images oder permissions.** Node order ist insertion order; `set` löst auf Eigenschaft conflicts, nicht "wer ist auf top".
- **Text Oder diffs durch character**, good für note-length Text aber nicht long Dokumente; long Text soll bewegen zu line-level Oder oder ein CRDT.
- **Präsenz ist best effort.** Netzwerk Verlust, crashes und forced Registerkarte schließt alle expire nach 8 Sekunden; kein "letzte bekannt Zustand" ist gespeichert.

## Englisch

Ein dependency-free realtime whiteboard: nativ ES modules, Canvas 2D Darstellung, Zeichenebene operational transformation, und ein single-writer Sequencer. Jeder bearbeiten ist angewendet lokal erste (optimistic overlay), dann transformed gegen der sequencer's Protokoll und committed mit ein monotonic revision. Clients anwenden revisions strictly in order und Puffer Lücken; irgendein Replikat kann answer anti-entropy Anfragen, welche ist was lets ein newly elected Sequencer rebuild selbst von ein surviving Peer nach der previous eine disappears. Ein causal Gate parks Betrieb whose Version Vektor Namen ein predecessor Sequencer hat nicht seen, und ein replay signal macht Clients retransmit stranded work. Präsenz, cursors und selection highlights ride der gleich Transport, und offline Änderungen sind queued und merged auf Neuverbindung. Der Transport ist eine swappable Verknüpfung: BroadcastChannel durch Standard, roh WebSocket oder Socket.io mit ein Relay-only Backend. Ein 300-Runde Fuzz Suite mit Zufall Verbindungsabbrüche und Sequencer Übergaben converges auf jeder ausführen, und ein 50-Replikat Python Chaos ausführen mit 57 Socket cuts, 2 Sequencer Übergaben und 249 gleichzeitig Änderungen converges zu eine SHA-256 in 2.9s. `tests/tp2.mjs` reproduces der classic three-way TP2 divergence das motivates Sequencer Entwurf.

Signatur Stempel (Modul 2) let two engineers drop attributed, gesperrt Kennzeichen auf ein desensitized drawing: Sperre ist ein OT-replicated node Eigenschaft, so jeder Peer — Signierer oder nicht — sieht ein stamped mark as immovable, und jeder affix ist appended zu ein lokal SHA-256 Audit chain (`Hash(prev + op)`) das der inspector kann prüfen live. Ein Headless Suite bestätigt chain Integrität, der locking Richtlinie und cross-engine Sperre replication (B kann nicht bewegen oder löschen A's gesperrt Stempel).

## Lizenz & Zuordnung

`sync-canvas` — Distributed Zustand & Real-time Zusammenarbeit Engine
Copyright (c) 2026 Jerome Young (Yang Jie)
Kontakt: jeromeyoung608@gmail.com

**Offen source, Apache-2.0** — siehe `LICENSE`.

---

## MDS-1 Lieferung Vertrag

> Dies Abschnitt ist der maschinenprüfbar form von `MODULE-DELIVERY-STANDARD.md`. Es spiegelt der chapters oben und answers der 12 questions ein buyer asks, eine durch eine.

### 1. Was es löst
Viele people Bearbeitung der gleich Dokument bei einmal: Klartext WebSocket broadcast overwrites Änderungen, und Zustand forks nach ein disconnect/reconnect.

### 2. Wer kauft dies
SaaS Teams und internal-tool Teams das brauchen ein whiteboard / kollaborativ Bearbeitung Fähigkeit.

### 3. Ausführen in 60 Sekunden
```bash
python3 -m http.server 8080 → http://127.0.0.1:8080/#ROOM1
```

### 4. Integration Vertrag
`apply / diff / transform / mapIndex` (Text Oder), `HashChain` (Audit chain); siehe README Oder details. Callers brauchen nur der facade; intern Dateien sind nicht der offentlich API.

### 5. Architektur
Client optimistic Aktualisierung → Hub sequencing/commit → anti-entropy Neuverbindung; siehe Replication Modell.

### 6. Garantiert & Bedrohung Modell
TP1 Konvergenz: irgendein two gleichzeitig Änderungen converge zu der gleich Text nach transform (tests/ot.test.mjs, 200 Zufall groups). Außer von Umfang: ein kompromittiert host OS, oder ein Browser Erweiterung actively reading Seite Speicher.

### 7. Bekannt Grenzen
Ein Hub Sequencer ist verpflichtend (TP2 Grenze); kein Ende-zu-Ende Verschlüsselung; single-room Skalierung ist gemessen up zu 50 Clients.

### 8. Prüfung
```bash
node --test tests/*.test.mjs → # pass 13
```
Erwartet Ausgabe enthält `# pass 13`, `# fail 0`.

### 9. Gemessen Leistung
50 Clients / 53 Verbindungsabbrüche / 670 ms Konvergenz; Fuzz 300/300 identisch.

### 10. Abhängigkeiten
Ein · Rein Null: 0 npm Abhängigkeiten, 0 vendor, 0 extern Anfragen.

### 11. Lizenz
**Offen source, Apache-2.0** — siehe `LICENSE`.

### 12. CHANGELOG
Siehe [`CHANGELOG.md`](./CHANGELOG.md).
