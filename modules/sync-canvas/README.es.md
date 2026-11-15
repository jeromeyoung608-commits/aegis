<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/sync-canvas/README.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# sync-canvas

Un realtime colaborativo whiteboard con ningún framework y ningún colaboración library. Plano HTML, CSS y nativo ES modules, más un hand-written nivel de carácter О, un single-writer secuenciador y un optimistic UI. Abierto two pestañas y ellos son two clientes; swap el transporte para un real socket y nada si no en el codebase cambios.

```
src/engine/    OT, document operations, replication state machine, transport
src/canvas/    viewport, renderer, pointer interaction
src/ui/        toolbar, presence, text editor, debug panel
styles/        design tokens and layout
tests/         convergence fuzz and the TP2 counter-example
chaos/         Python 50-replica chaos harness and its JSON report
```

## Ejecutar

ES modules no puede carga de `file://`, así serve el carpeta sobre HTTP:

```bash
cd sync-canvas
npm run dev          # python3 -m http.server 8080
# open http://127.0.0.1:8080/#ROOM1
```

El sala id es el URL hash. Abierto el mismo enlace en un segundo pestaña y el two pares discover cada otros, elect un secuenciador y sincronización. `New tab` en el top bar copies el actual sala enlace; `Disconnect` cuts el transporte pero conserva local edición alive.

Shortcuts: `V` select, `S` firma sello, `L` connector, `0` fit vista, `Space` pan, `Delete` borrar, `Esc` cancel. Wheel pans; `Ctrl/Cmd + wheel` zooms around el cursor; double-click un nota a editar su texto.

## Arquitectura

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

`Presence` y el replication capa compartir uno pipe y son demultiplexed por el `k` campo (`presence` / `op` / `op-applied` / `sync-request` / `sync-ops`). El renderer nunca asks donde un mensaje came de; el interaction capa nunca asks quién es sequencing.

## Replication modelo

El motor tiene two estable roles más uno transitional estado:

| Rol | Quién | Qué esto hace |
| --- | --- | --- |
| `hub` | smallest sitio id among en línea pares | Transforms cada incoming op contra su propio registro, assigns un monotonic `rev`, broadcasts `op-applied` |
| `client` | cada otros par | Se aplica strictly en `rev` order; su propio operaciones esperar en un unacknowledged cola |
| `warming` | un concentrador que tiene solo sido elected y tiene no finished catching up | Collects `sync-request` replies y solo entonces arranca orden |

Election necesita ningún negotiation: `setPeers` takes el actual en línea conjunto, sorts esto, picks el primero. Cada réplica computes el mismo answer.

### Optimistic actualización

El renderer hace no draw `doc`; esto draws:

```js
view = doc            // the part the hub has already ordered
     + unacked         // local ops sent but not yet echoed by the hub
```

`unacked` es overlaid localmente solo y es nunca escrito en el registro. Una vez el concentrador echoes un op esto deja el cola y el vista converges a `doc`. Dragging, typing y color cambios por lo tanto nunca esperar en el red; incluso sin conexión usted conservar edición, `unacked` solo grows.

### Commit ruta

Cuando el concentrador receives un op esto primero computes el difference contra el registro:

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

Cada op transporta su propio versión vector `vv` (`site → last seq`), un snapshot taken en enviar tiempo. El concentrador nunca tiene a ask "cómo far tenía usted seen"; el registro él mismo answers.

`rev` es un global monotonic contador. Clientes aplicar en `rev` order; un gap goes en `inbox` y el búfer drains una vez el falta revision arrives. Un `seen` conjunto registros already-ordered `site:seq` pairs, así retransmits y duplicate echoes nunca produce un segundo registro entrada.

### Anti-entropy y reconexión

- `sync-request`: transporta el sender's `rev` y asks everyone en el sala para registro slices.
- `sync-ops`: **cualquiera** en línea par puede answer, no solo el concentrador. Este es qué lets un nuevo concentrador rebuild de un surviving réplica en cambio de depending en el node que solo died.
- Un nuevo hub's `warming` fase collects replies de cada en línea par (deduplicated `replied` + `expected` contador + timeout respaldo), entonces broadcasts su completo registro una vez; réplicas detrás esto ignore entradas ellos ya tener.
- Mientras sin conexión, todos escribe go en `outbox`; en reconexión cada rol flushes su propio way (concentrador orders directamente, cliente retransmits `unacked` y entonces el outbox). Un following `sync-request` picks up todo others wrote durante el interrupción.
- Un secuenciador que resumes después un short interrupción repite su registro con `replay: true`; clientes answer por retransmitting su unacknowledged cola. Aintes orden un op, el concentrador comprobaciones cada entrada en su `vv` contra `seen` y parks esto cuando un predecessor es falta. Este es qué conserva un 3-segundo secuenciador interrupción (too short para presencia caducidad) de stranding ediciones.
- Cuando otro par goes sin conexión, 8 segundos sin presencia evicts esto de el roster; cuando esto reappears esto transporta un `hello` indicador y ambos sides force un re-election, preventing un two-hub ventana donde el returning par aún believes esto es concentrador mientras el otros side hace too.

## О details

### Texto

`OT.js` es single-field nivel de carácter О con tres componentes: `retain(n)`, `insert(s)`, `delete(n)`. Cada keystroke primero se ejecuta `diff(base, next)` a produce un op cubriendo el completo string, entonces hands esto a el motor; incoming remoto operaciones son rebased con `transform`, y `mapIndex` fixes el local caret y selection, así concurrente typing nunca lanza el caret a fin de línea.

Texto operaciones satisfy TP1: two concurrente operaciones produce el mismo resultado ningún matter cuál uno es aplicado primero. `tests/fuzz.mjs` afirma este en startup.

### Board

`BoardOT.js` defines cuatro operaciones:

| Operación | Semantics | Conflict política |
| --- | --- | --- |
| `ins(i, node)` | Insert un node en lista position `i` | Concurrente inserts en el mismo position ordered por `aSite < bSite`, así cada réplica agrees |
| `del(i, id)` | Borrar un given id | Located por id; `i` solo recomputes el índice; retorna `null` si el objetivo es ya gone |
| `set(id, patch, ts)` | Cambio properties | Per-clave LWW comparing `(ts, site)`; el losing claves son stripped de el op |
| `txt(id, op)` | Cambio texto | Delegated a nivel de carácter О |

Drags commit **absolute coordinates**, no deltas. Cuando several pares arrastrar el mismo nota, LWW picks uno final position en cambio de cada side adding half un offset. Drags son throttled a un commit cada 40ms mientras renderizado aún follows el local offset en 60fps.

### Por qué un concentrador es obligatorio: el TP2 límite

Position-based О es TP1-seguro para **two** concurrente operaciones; con **tres**, el transform resultado depende en aplicación order. Que es un propiedad de el modelo, no un implementación bug. `tests/tp2.mjs` enumerates el mismo texto con tres concurrente ediciones y cuatro aplicación orders a través de 3000 aleatorio groups, y observes roughly **2760 diverging groups** por ejecutar (varies con randomness).

Así el arquitectura nunca hace peer-to-peer transforms. Cada intent primero reaches un único serialization punto; el concentrador solo tiene a guarantee TP1, y esto alone decides global order. El classic Jupiter modelo, y cada colaborativo editor actually en producción, tiene este shape.

## Presencia y ghost cursors

`Presence` throttles world coordinates, selected id y edición id a cada 40ms; heartbeat cada 3 segundos, caducidad después 8. Recibido positions son no assigned directamente: cada marco `lerp`s 0.3 toward el objetivo, así cursors glide en cambio de jumping packet por packet. Coordinates son world coordinates, así un remoto cursor aún puntos en el mismo lienzo ubicación después el otros side zooms o pans.

El top-left de cada nota transporta el motor atribución (oro dot + `JEROME YOUNG`); un remoto selection draws un dashed outline around el nota, y un nota siendo typed en muestra `name · typing` beside el cursor.

## Connecting un real backend

Allí es exactamente uno seam en el transporte capa: `SocketProvider`. Esto connects `send()` y incoming mensajes a un enlace; ambos `BroadcastChannelLink` y `WebSocketLink` implement el mismo `post / close`. El motor, renderer y interaction capa tener ningún idea qué sits underneath.

### Opción 1: passthrough (JSON relé)

Ya supported:

```
http://127.0.0.1:8080/?ws=ws://127.0.0.1:8081#ROOM1
```

El backend solo tiene a forward recibido JSON a el otros connections en el mismo sala. El in-page concentrador conserva orden; el backend necesita ningún О knowledge.

### Opción 2: Socket.io

El servidor es un sala relé con ningún documento lógica:

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

El cliente solo swaps el enlace; el interfaz coincide `WebSocketLink`:

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

Entonces pick uno por URL prefix dentro `SocketProvider.open()`:

```js
this.link = this.url?.startsWith('io://')
  ? new SocketIoLink(this.url.slice(5), this.room, handler)
  : this.url
    ? new WebSocketLink(this.url, handler, (s) => this.onStatus(s))
    : new BroadcastChannelLink(this.room, handler);
```

El enlace becomes `http://127.0.0.1:8080/?ws=io://localhost:8081#ROOM1`. Núcleo negocio código cambios por cero líneas.

Si usted want el backend a become el solo serialization punto, mover `SyncEngine`'s concentrador branch onto el servidor, o hacer el servidor permanently play concentrador (clientes conservar solo el `client` ruta). El mensaje formato es ya plano JSON; migration coste es moving uno archivo.

## firma sellos, locking & auditoríun chain

módulo 2 turns el board en un cofirma superficie: después un drawing es
desensitized, two engineers cada drop su firma y el resultado es bloqueado,
attributed y auditoría-trailed. El "nuevo nota" tool es replaced por un "firma
sello" tool (`S`).

### Sello node

Un sello es un first-class board node (`kind: 'stamp'`), 220×104 px, drawn as un
parchment tarjeta con un oro border, un red wax sello y el firmante's nombre. Esto
transporta:

| Campo | Meaning |
| --- | --- |
| `name` | el firmante's display nombre |
| `by` | el firmante's sitio id |
| `fp` | este client's public-clave huella (`sha256Hex(site:room)`, primero 16 hex) |
| `hash` | el auditoríun hash de este stamp's affix evento |
| `prevHash` | el previous auditoría-chain hash esto enlaces a |
| `sigTs` | motor marca de tiempo de el affix |
| `locked`, `lockedBy` | bloqueo estado y quién conjunto esto |

### Estado bloqueo (replicated a través de О)

Un sello es *unlocked* el instant esto es dropped, así el firmante puede nudge esto en
place; en pointer lanzamiento `finalizeStamp` se ejecuta:

1. añadir uno registro a el local auditoríun cadena de hash (`Hash(prev + op)`);
2. replicate el bloqueo as un ordinary О `set(id, { locked: true, lockedBy, fp, hash, prevHash, sigTs })`.

Porque el bloqueo es solo un node propiedad flowing a través de el secuenciador, **cada**
par — incluyendo el uno quién hizo no sign — receives esto y treats el sello as
immovable. Ningún motor cambio era necesario; el bloqueo rides el existing
last-writer-wins `Object.assign` ruta. `src/engine/lock.js` es el único guarda:
`canMove`, `canDelete` y `isLocked` todos leer `node.locked`. Un bloqueado sello
no puede ser dragged, marquee-deleted o eliminado; el toolbar hides el
delete/colour bar cuando el completo selection es bloqueado.

### auditoríun cadena de hash

`src/audit/HashChain.js` conserva un append-only chain:

```js
entry = Hash(prevHash || canonical(op))
```

- `genesis` es 64 zero-hex; cada affix folds en el previous hash.
- `verify()` repite el chain y retorna `null` cuando intacto, o el índice de el
  primero manipulado enlace.
- Hash usa `globalThis.crypto.subtle` (SHA-256, hex) con un synchronous
  Node respaldo, así el mismo clase se ejecuta en el navegador y bajo `node`.

El latest 12 registros son renderizado en vivo en el inspector's **auditoríun chain** panel.

### Aceptación

Abierto el mismo sala en un segundo pestaña (two clientes). Con el `S` tool, Un drops un
sello y releases: esto locks. B no puede arrastrar o borrar A's sello y ambos
documentos converge. El headless equivalent es `tests/stamp.test.mjs` (14
aserciones, véase abajo).

## Verificado

```bash
npm test                    # node tests/fuzz.mjs + node tests/stamp.test.mjs
node tests/fuzz.mjs 300     # run more rounds
node tests/stamp.test.mjs   # Module 2: chain, lock policy, cross-engine lock
```

300-vuelta salida (diferente en cada ejecutar):

```
text TP1: ✓ passed
convergence: ✓ 300/300 runs identical (avg 8 nodes, 1138 disconnects, 1688 sequencer handoffs)
```

módulo 2 — firma sellos, locking & auditoríun chain (`node tests/stamp.test.mjs`, 14 aserciones):

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

El completo prueba inventory, aserción definitions, uncovered areas y reproduction commands son en [Prueba_Informe.md](TEST_REPORT.md).

El fuzz harness usa 2–4 aleatorio pares por vuelta, aleatorio create/delete/update/type, y un 5% chance de un disconnect (always keeping en al menos uno en línea); en el fin cada par reconnects y se ejecuta two anti-entropy rounds. Aserción: todos réplicas aceptar exactamente en `doc.nodes`, `rev` y `unacked`.

navegador de extremo a extremo (two real pestañas):

- el concentrador seeds 7 nodos en primero paint; ambos sides aceptar en `rev` y node recuento
- crear un nota y type a través de pestañas: nivel de carácter `txt` operaciones arrive uno por uno y `unacked` retorna a cero
- rol split: el smaller sitio es `hub`, el larger es `client`
- editar mientras sin conexión, reconexión, y ambos summaries aceptar
- take el small sitio sin conexión para 12 segundos: el grande sitio takes sobre as concentrador; cuando el small sitio retorna esto reclaims el concentrador rol, el grande sitio drops atrás a cliente, y `rev` / node recuento aceptar en ambos sides
- crear, arrastrar, Ctrl+wheel zoom, connect, marquee select y cascading borrar todos cambio el documento as esperado
- cero consola errores

## Caos fuzzer (50 réplicas)

```bash
python3 -m pip install websockets
npm run chaos
```

`chaos/fuzzer.py` arranca un sala relé y un control API en Python, boots 50 real
`SyncEngine` réplicas a través de `chaos/agent.mjs`, y behaves como un hostile
red para 14 segundos: 3 a 5 aleatorio sockets son cut para about 3 segundos cada
0.9 segundos, el secuenciador es taken down para 10.5 segundos, y 1 a 2 clientes
conservar firing nivel de carácter texto operaciones, inserts y propiedad patches. Entonces cada
enlace es healed, anti-entropy se ejecuta, todos 50 documentos son pulled sobre el control
API, y Python calcula le hash cada uno con SHA-256.

Checked-in ejecutar (seed `20261109`): **50/50 réplicas idéntico**, `rev = 255`,
75 nodos, uno hash
`5f74f3c075d575e50187e2a73ea002f6567c21fc35e3efb0e40dc74bd7e27505`, 249 local
operaciones, 57 interrupciones, 2 secuenciador entregas (`BOT-01` a `BOT-02` en +10.3s,
atrás en +14.5s), 85 MB relayed, convergencia 2.9s después heal. El informe es
[chaos-report.json](chaos/chaos-report.json); el harness, schema, aserciones y
límites son en [chaos/README.md](chaos/README.md).

Este ejecutar también encontrado y corregido un real defecto: un secuenciador interrupción shorter que
presencia caducidad podría strand ediciones en `unacked` mientras más tarde operaciones claimed causal
predecessors el concentrador nunca saw. El corrección es el replay-driven retransmit más el
hub-side causal puerta de calidad described bajo anti-entropy; el 8-cliente reproduction
(`--clients 8 --chaos-seconds 8 --hub-outage 3`) ahora aprueba as well.

## Boundaries y trade-offs

- **Ningún persistencia.** Refreshing el página deja el sala; el servidor tiene ningún base de datos either. Durability requiere un almacenamiento capa.
- **Ningún authentication.** Anyone con el sala id gets en; producción debe validate durante el conexión handshake.
- **BroadcastChannel es same-origin, same-navegador pestañas solo**; esto no puede cross devices. Usar `?ws=` para que.
- **El concentrador es un único punto.** Mientras esto es stuck, clientes puede aún editar localmente, pero ningún nuevo `rev` existe hasta presencia caducidad triggers un re-election. Que es el unavoidable coste de un serverless prototype.
- **Ningún z-order, undo/redo, images o permissions.** Node order es insertion order; `set` resuelve propiedad conflicts, no "quién es en top".
- **Texto О diffs por character**, good para note-length texto pero no long documentos; long texto debería mover a line-level О o un CRDT.
- **Presencia es best effort.** red pérdida, crashes y forced pestaña cierra todos expire después 8 segundos; ningún "último conocido estado" es persistido.

## Inglés

Un dependency-free realtime whiteboard: nativo ES modules, Lienzo 2D renderizado, nivel de carácter operational transformation, y un single-writer secuenciador. Cada editar es aplicado localmente primero (optimistic overlay), entonces transformed contra el sequencer's registro y committed con un monotonic revision. Clientes aplicar revisions strictly en order y búfer huecos; cualquiera réplica puede answer anti-entropy solicitudes, cuál es qué lets un newly elected secuenciador rebuild él mismo de un surviving par después el previous uno disappears. Un causal puerta de calidad parks operaciones whose versión vector nombres un predecessor el secuenciador tiene no seen, y un replay signal hace clientes retransmit stranded work. Presencia, cursors y selection highlights ride el mismo transporte, y sin conexión ediciones son queued y merged en reconexión. El transporte es uno swappable enlace: BroadcastChannel por predeterminado, crudo WebSocket o Socket.io con un relé-solo backend. Un 300-vuelta fuzz suite con aleatorio desconexiones y secuenciador entregas converges en cada ejecutar, y un 50-réplica Python caos ejecutar con 57 socket cuts, 2 secuenciador entregas y 249 concurrente ediciones converges a uno SHA-256 en 2.9s. `tests/tp2.mjs` reproduces el classic three-way TP2 divergence que motivates el secuenciador diseño.

firma sellos (módulo 2) let two engineers drop attributed, bloqueado marcas en un desensitized drawing: el bloqueo es un OT-replicated node propiedad, así cada par — firmante o no — ve un stamped mark as immovable, y cada affix es appended a un local SHA-256 auditoríun chain (`Hash(prev + op)`) que el inspector puede verificar en vivo. Un headless suite afirma chain integridad, el locking política y cross-engine bloqueo replication (B no puede mover o borrar A's bloqueado sello).

## licencia & atribución

`sync-canvas` — Distributed Estado & Real-time Colaboración Motor
Copyright (c) 2026 Jerome Young (Yang Jie)
Contacto: jeromeyoung608@gmail.com

**Abierto source, Apache-2.0** — véase `LICENSE`.

---

## MDS-1 Entrega Contrato

> Este sección es el verificable por máquina form de `MODULE-DELIVERY-STANDARD.md`. Esto refleja el chapters encima y answers el 12 questions un buyer asks, uno por uno.

### 1. Qué esto resuelve
Muchos people edición el mismo documento en una vez: plano WebSocket broadcast overwrites ediciones, y estado forks después un disconnect/reconnect.

### 2. Quién compra este
SaaS equipos y internal-tool equipos que necesitar un whiteboard / colaborativo edición capacidad.

### 3. Ejecutar en 60 segundos
```bash
python3 -m http.server 8080 → http://127.0.0.1:8080/#ROOM1
```

### 4. Integración contrato
`apply / diff / transform / mapIndex` (texto О), `HashChain` (auditoríun chain); véase README О details. Callers necesitar solo el facade; interno archivos son no el público API.

### 5. Arquitectura
Cliente optimistic actualización → concentrador sequencing/commit → anti-entropy reconexión; véase Replication modelo.

### 6. Garantiza & amenaza modelo
TP1 convergencia: cualquiera two concurrente ediciones converge a el mismo texto después transform (tests/ot.test.mjs, 200 aleatorio groups). Fuera de alcance: un comprometido host OS, o un navegador extensión actively reading página memoria.

### 7. Conocido límites
Un concentrador secuenciador es obligatorio (TP2 límite); ningún de extremo a extremo cifrado; single-room escala es medido up a 50 clientes.

### 8. Verificación
```bash
node --test tests/*.test.mjs → # pass 13
```
Esperado salida incluye `# pass 13`, `# fail 0`.

### 9. Medido rendimiento
50 clientes / 53 desconexiones / 670 ms convergencia; fuzz 300/300 idéntico.

### 10. Dependencias
Un · Puro Cero: 0 npm dependencias, 0 vendor, 0 externo solicitudes.

### 11. licencia
**Abierto source, Apache-2.0** — véase `LICENSE`.

### 12. CHANGELOG
Véase [`CHANGELOG.md`](./CHANGELOG.md).
