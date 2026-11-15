<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/sync-canvas/TEST_REPORT.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# sync-canvas Engineering Prueba Informe

| Elemento | Valor |
| --- | --- |
| Versión bajo prueba | sync-canvas 1.0.0 (`package.json`) |
| Informe versión | v1.0 |
| Prueba fecha | 2026-11-09 |
| Alcance | `src/engine/*` (О, BoardOT, SyncEngine, SocketProvider, bloqueo), `src/audit/*` (HashChain), `src/canvas/*`, `src/main.js`, `tests/stamp.test.mjs` |
| Veredicto | **Aprobado**: TP1 0 fallos; convergencia fuzz 60/60 y 300/300; dos pestañas navegador E2E aprobado; 50-réplica WebSocket caos converged a uno SHA-256; módulo 2 stamp/lock/audit 14/14 aserciones aprobado (cross-engine bloqueo aceptación cumplido); delivery-cumplimiento comprobaciones aprobado |

---

## 1. Objectives

Este proyecto es un colaborativo lienzo con un hand-written О motor. El pruebas solo care about cuatro things que puede break:

1. **Texto О satisfies TP1**: two concurrente ediciones produce el mismo resultado regardless de aplicación order.
2. **Réplicas converge**: bajo aleatorio concurrency, aleatorio desconexiones y aleatorio secuenciador entregas, cada réplica ends con idéntico `doc.nodes`, `rev` y `unacked`.
3. **Desconexiones son recoverable**: operaciones missed mientras sin conexión debe ser restaurado por anti-entropy (`requestSync`), no por luck.
4. **Esto actually se ejecuta en un navegador**: two real pestañas sincronización sobre BroadcastChannel y el UI informes ningún errores.

TP2 (three-way concurrente texto О) es **no** un puerta de calidad. Esto es un modelo límite de position-based О, usado a justify por qué el arquitectura necesita un single-writer secuenciador (véase 4.3).

---

## 2. Entorno

| Elemento | Valor |
| --- | --- |
| OS | macOS (Apple Silicon) |
| Node.js | v26.0.0 |
| Estático servidor | `python3 -m http.server 8098` |
| navegador | Chrome para Testing (Playwright caché `chromium-1254`), headless |
| navegador automation | `playwright-core@1.55.0` (ad-hoc aceptación script, no un proyecto dependencia) |
| Python (caos harness) | 3.14 |
| Python paquete | `websockets` 17.4 (el solo non-stdlib dependencia) |
| Node agent | v26.0.0 con el integrado global `WebSocket` |
| red | T1-T6: local solo, BroadcastChannel. T7: loopback WebSocket relé, 50 concurrente sockets |

---

## 3. Prueba inventory

| ID | Nivel | Entrada punto | Núcleo aserciones | Puerta de calidad |
| --- | --- | --- | --- | --- |
| T1 | Propiedad prueba | Se ejecuta automáticamente dentro `tests/fuzz.mjs` | TP1: `apply(apply(base,b),a') === apply(apply(base,a),b')`, 400 aleatorio rounds | Sí (exit código) |
| T2 | Convergencia fuzz | `node tests/fuzz.mjs [runs]` | Después 60 o 300 rounds todos réplicas compartir el mismo `doc.nodes` JSON, el mismo `rev`, y `unacked === 0` | Sí |
| T3 | No-partition línea base | `node tests/fuzz.mjs 60 --nopart` | Mismo aserción con disconnect injection desactivado (`netOutages` debe ser 0) | Sí |
| T4 | TP2 diagnostic | `node tests/tp2.mjs` | Divergence recuento sobre 3000 three-way groups y 6 aplicación orders | Ningún (divergence esperado; registrado solo) |
| T5 | navegador E2E | Playwright dos pestañas script (véase 7.2) | First-paint parity, cross-tab sincronización, sin conexión merge, secuenciador takeover, cero consola errores | Sí (script exit código) |
| T6 | cumplimiento estático comprobaciones | `node --check` + keyword escanea | Syntax aprueba; copyright encabezado / consola banner / estado bar / lienzo sello presente; cero unrelated marcas tales as `trae` | Manual |
| T7 | Distributed caos | `python3 chaos/fuzzer.py --clients 50` | 50 real `SyncEngine` réplicas sobre un WebSocket relé; aleatorio 3s socket cuts, un 10.5s secuenciador interrupción, 249 text/insert/patch operaciones; final SHA-256 idéntico en todos réplicas, `unacked/queued/inbox` cero | Sí (exit código) |
| T8 | módulo 2 aceptación | `node tests/stamp.test.mjs` | cadena de hash linkage + manipulación detección; determinism/divergence; bloqueo política `canMove`/`canDelete`; un bloqueo conjunto por Un replicates a B a través de el О motor y B no puede move/delete esto; A/B documentos converge | Sí (exit código) |

---

## 4. Resultados

### 4.1 T1 texto TP1

```text
text TP1: ✓ passed
```

400 aleatorio rounds (base longitud 6–15, aleatorio insert/delete, two concurrente operaciones): 0 fallos.

### 4.2 T2/T3 convergencia fuzz

Cada vuelta usa 2–4 aleatorio pares, 90 aleatorio pasos de `ins / del / set / txt`, un 5% chance por paso de flipping un peer's en línea estado (un guarda always conserva en al menos uno en línea), entonces brings everyone en línea y se ejecuta two `requestSync` rounds.

| Comando | Resultado | Avg nodos | Desconexiones | Secuenciador entregas |
| --- | --- | --- | --- | --- |
| `node tests/fuzz.mjs 60` | `60/60 runs identical` | 8 | 235 | 339 |
| `node tests/fuzz.mjs 60 --nopart` | `60/60 runs identical` | 9 | 0 | 60 |
| `node tests/fuzz.mjs 300` | `300/300 runs identical` | 8 | 1138 | 1688 |

Notas:

- Recuentos vary en cada ejecutar (para ejemplo el 300-vuelta disconnect recuento lands entre roughly 1100 y 1200); **el veredicto hace no**.
- El 60 entregas bajo `--nopart` son initial elections, uno por vuelta, no interrupciones.
- Cualquiera fallo hace el proceso exit non-zero (`tests/fuzz.mjs:322`).

### 4.3 T4 TP2 diagnostic (divergence esperado)

```text
TP2 failures: 2763   (out of 3000 groups)
```

Con uno base texto, tres concurrente texto operaciones y 6 aplicación orders, about 92% de combinations fin en diferente resultados. Este es un inherent propiedad de position-based О con more que two concurrente operaciones, no un implementación defecto; esto es exactamente el justification para "orden debe go a través de un único concentrador" documentado en el [README](README.md). El script prints statistics solo y conjuntos ningún fallo puerta de calidad.

### 4.4 T5 dos pestañas navegador E2E

Two páginas en el mismo navegador contexto join uno sala (`#E2E****`); motor estado es leer a través de `window.__sync`:

```json
BOOT   {"a":{"site":"Q7G57","role":"client","rev":7,"nodes":7},
        "b":{"site":"55KF3","role":"hub","rev":7,"nodes":7},"sameJson":true}
SYNC   {"aRev":8,"bRev":8,"nodes":[8,8],"sameJson":true,"unacked":[0,0]}
HEAL   {"aRev":10,"bRev":10,"nodes":[10,10],"sameJson":true,"unacked":[0,0],
        "roles":["client","hub"]}
HANDOFF{"tookOver":"hub","rolesAfter":["client","hub"],"sameJson":true}
CONSOLE_ERRORS []
E2E_PASS
```

Cuatro scenarios:

1. **First-paint seeding**: el concentrador seeds 7 nodos; ambos sides show `rev=7`, 7 nodos y idéntico byte a byte documento JSON; roles split en 1 concentrador + 1 cliente.
2. **Cross-tab sincronización**: Un inserts un nota; ambos sides mover a `rev=8` y `unacked` retorna a 0.
3. **Sin conexión merge**: el cliente llamadas `setOnline(false)`, ambos sides escribir un node (el client's escribir se aplica localmente), entonces esto comes atrás en línea y llamadas `requestSync()`; ambos sides reach `rev=10`, 10 nodos, idéntico JSON, `unacked=0`.
4. **Secuenciador takeover**: con el concentrador sin conexión el cliente recomputes pares y becomes `hub`; cuando el concentrador retorna, re-election restaura el smallest sitio as `hub` y ambos documentos permanecer idéntico byte a byte.

### 4.5 T6 cumplimiento estático comprobaciones

| Comprobar | Resultado |
| --- | --- |
| `node --check` (`src/main.js`, `src/engine/*`, `src/canvas/CanvasRenderer.js`) | Todos aprobado |
| Copyright encabezado (`Copyright (c) 2026 Jerome Young`) | Presente en `OT.js`, `BoardOT.js`, `SyncEngine.js`, `SocketProvider.js` |
| consola atribución | Prints el `sync-canvas` badge y licensing contacto en startup |
| Estado bar atribución | `ENGINE BY JEROME YOUNG` visible |
| Lienzo atribución | Oro dot + `JEROME YOUNG` en el top-left de cada nota |
| Unrelated tercero marcas (`trae / marscode / doubao / bytedance / coze`) | 0 coincide |
| licencia archivo | `LICENSE` presente (Apache-2.0 pointer) y referenced por cada source encabezado |

### 4.6 T7 distributed caos (50 réplicas)

Comando: `python3 chaos/fuzzer.py --clients 50 --seed 20261109` (también `npm run chaos`). El harness boots un Python sala relé y un Python control API, entonces 50 real `SyncEngine` réplicas dentro `chaos/agent.mjs`. Cada réplica posee su socket, presencia roster y timers; Python solo impulsa el hostile red y verifica el resultado.

```text
[1/4] boot        50 engine replicas registered (266ms)
[2/4] seed        6 shared notes, hub=BOT-01
[3/4] chaos       57 outages, 2 handoff(s), 249 ops
[4/4] verify      255 revisions, 75 nodes, 1 unique hash(es)
[PASS] 50 clients converged in 2.9s (5f74f3c075d575e5..., rev 255)
```

| Metric | Valor |
| --- | --- |
| Réplicas | 50 / 50 informado, todos en línea |
| Veredicto | Aprobado (9/9 aserciones) |
| Final revision | 255 |
| Final nodos | 75 |
| Único SHA-256 | 1: `5f74f3c075d575e50187e2a73ea002f6567c21fc35e3efb0e40dc74bd7e27505` |
| Local operaciones | 249 (`txt`, `ins`, `set`) |
| Socket interrupciones / reconnects | 57 / 57 (2.8-3.3s cada) |
| Secuenciador entregas | 2 (`BOT-01` -> `BOT-02` en +10.3s, atrás en +14.5s) |
| Minimum en línea | 34 (2 observers nunca flap) |
| relé deliveries | 184,632 frames, 84,706,527 bytes |
| Convergencia después heal | 2.915s (3 estable polls) |
| Python vs Node hash | Idéntico byte a byte en todos 50 réplicas |

Recuentos vary entre se ejecuta porque el socket horario races el reconexión timers; el veredicto hace no. Revision, node recuento y hash describe uno operación stream y son compared a través de todos 50 réplicas dentro el mismo ejecutar, no contra un corregido expectation.

El final hash es computed en Python de cada replica's `doc.nodes` (clave-sorted JSON, ningún whitespace), después todos sockets son restaurado y anti-entropy tiene ejecutar. `hash-cross-check` additionally verifica Python's canonicalization contra el Node digest.

#### 4.6.1 Defecto encontrado y corregido

El primero short-outage ejecutar fallido:

```text
[FAIL] 8 clients did not converge
  - no-unacknowledged-work: unacked=77, queued=0, inbox=0
```

- **Disparador**: el secuenciador era cut para 3 segundos, shorter que el 8-segundo presencia caducidad. Operaciones enviado durante que ventana eran dropped por el relé y stayed en `unacked`; ningún re-election y por lo tanto ningún retransmit occurred. Más tarde operaciones eran diffed contra un vista containing el lost ediciones, y su `vv` named predecessors el secuenciador nunca saw.
- **Corrección 1**: el sequencer's warm-up replay ahora transporta `replay: true`; clientes retransmit `unacked` en que signal. Un reconexión también retransmits `unacked` aintes flushing `outbox`.
- **Corrección 2**: aintes sequencing, el concentrador comprobaciones cada entrada en el op's `vv` contra `seen` y parks el op por sitio hasta falta predecessors arrive, entonces drains en causal order.
- **Verificación**: el 8-cliente reproduction (`--clients 8 --chaos-seconds 8 --hub-outage 3`) ahora exits 0, y el 50-cliente ejecutar encima converges con 2 entregas y cero stranded work.

### 4.7 T8 firma sellos, locking & auditoríun chain

`node tests/stamp.test.mjs` es un DOM-free Node suite (14 aserciones) cubriendo módulo 2. Esto reuses `SyncEngine` + `EventBus` detrás un toy en memoria red (`Net`/`makePeer`) así two engines replicate exactamente como two navegador pestañas.

```text
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
  ✓ B receives A's stamp node
  ✓ B sees the stamp locked (state lock replicated)
  ✓ acceptance: B cannot move A's locked stamp
  ✓ acceptance: B cannot delete A's locked stamp
  ✓ A and B documents converge

✓ all stamp tests passed
```

El cuatro aserción groups:

1. **cadena de hash linkage & tamper-evidencia** (`src/audit/HashChain.js`): el primero enlace equals `Hash(GENESIS | op0)`, cada subsequent enlace folds en el prior hash, `verify()` retorna `null` en un intacto chain y el índice de el primero bad enlace después tampering.
2. **Determinism / divergence**: two chains fed idéntico inputs reach el mismo cabeza; un diferente genesis diverges.
3. **Locking política** (`src/engine/lock.js`): `isLocked`, `canMove` y `canDelete` todos leer el `locked` indicador — un unlocked sello es movable/deletable, un bloqueado uno es neither.
4. **Cross-engine bloqueo replication (el aceptación criterion)**: motor Un inserts un sello entonces replicates `set(id, { locked: true, lockedBy, fp, hash, prevHash })`; después el toy red drains, motor B posee el node, `bNode.locked === true`, `canMove`/`canDelete` son ambos `false`, y `JSON.stringify(A.doc.nodes) === JSON.stringify(B.doc.nodes)`. Este es el headless form de el dos pestañas requisito: *después Un sellos y locks, B no puede mover esto.*

---

## 5. Aserciones y fallo criterios

### 5.1 Motor convergencia puerta de calidad (T1-T3)

"Convergencia" en `tests/fuzz.mjs:234-238` requiere todos tres conditions en una vez:

```js
const docs = peers.map((p) => JSON.stringify(p.engine.doc.nodes));
const ok = docs.every((d) => d === head) &&
  peers.every((p) => p.engine.unacked.length === 0) &&
  peers.every((p) => p.engine.rev === peers[0].engine.rev);
```

- `doc.nodes` idéntico byte a byte: mismo order, mismo properties, mismo texto — no merely el mismo recuento.
- `unacked === 0`: ningún local operación es izquierda waiting forever para un acknowledgement.
- `rev` equal: el global contador tiene no drifted entre réplicas.

En fallo, `--verbose` prints cada peer's `role / rev / unacked / inbox / outbox` más el primero diverging node.

### 5.2 T7 distributed caos puerta de calidad

`chaos/fuzzer.py` escribe cada aserción en el informe y exits non-zero si cualquiera falla. Un ejecutar es un Aprobado solo cuando todos nine hold:

| Aserción | Aprobado condition |
| --- | --- |
| `client-set-complete` | Exactamente `--clients` único réplicas informado sobre el control API |
| `all-clients-online` | Cada réplica es en línea en snapshot tiempo |
| `single-sequencer` | Exactamente uno `hub`, y esto es el smallest sitio id (`BOT-01`) |
| `revision-agreement` | Todos réplicas informe el mismo `rev` |
| `document-hash-identical` | Uno único SHA-256 a través de todos replicas' `doc.nodes` |
| `no-unacknowledged-work` | `unacked`, `queued` y `inbox` son cero en cada réplica |
| `hash-cross-check` | Python's canonical SHA-256 equals el Node digest byte para byte |
| `chaos-actually-happened` | En al menos 6 interrupciones, 6 reconnects y 60 local operaciones |
| `sequencer-handoff-exercised` | En al menos uno observed concentrador cambio cuando `--hub-outage >= 8` |

El handoff aserción es solo protegido cuando el secuenciador interrupción puede outlast el 8-segundo presencia caducidad. Un shorter interrupción (`--hub-outage 3`) deliberately pruebas lost-ack recuperación en cambio de failover, así esto es no obligatorio a hand apagado.

---

## 6. Cobertura y conocido huecos

**Cubierto**

- Texto TP1 (400 rounds), board convergencia (60 y 300 rounds), sin conexión recuperación, secuenciador takeover, real dos pestañas sincronización.
- Five operación families: insert, borrar, propiedad LWW, texto О, absolute-coordinate arrastrar commit.
- Un no-partition línea base, proving el disconnect injection es el solo variable en el fuzz ejecutar.
- **Real WebSocket enlace**: T7 exercises `SocketProvider`-equivalent transporte sobre un real WebSocket relé con 50 concurrente sockets y genuine socket cierra.
- **Presencia caducidad y el 8-segundo ventana**: T7 se ejecuta el producción 3s heartbeat / 8s caducidad timing; el 10.5s secuenciador interrupción forces caducidad, re-election y un medido handoff.
- **módulo 2 — firma sellos, locking & auditoríun chain (T8)**: cadena de hash linkage y manipulación detección, deterministic/divergent genesis, el `locked` guarda política, y cross-engine bloqueo replication (el dos pestañas aceptación criterion) bajo un DOM-free two-engine harness.

**No cubierto (por diseño o por constraint)**

- **Recargar persistencia**: persistencia es deliberadamente absent (véase README boundaries); un recargar deja el sala, y nada pruebas que.
- **Visual regresión**: ningún pixel snapshot diffing; diseño y atribución eran checked por manual screenshots.
- **Rendimiento**: ningún large-documento o long-session carga prueba; el fuzz `drain()` cap de 50,000 mensajes solo evita infinite loops.
- **Cross-navegador**: Chromium solo; Firefox/Safari BroadcastChannel behavior untested.
- **TP2**: no un puerta de calidad; divergence es esperado.

---

## 7. Reproduction

### 7.1 Motor capa

```bash
npm test                              # = node tests/fuzz.mjs + node tests/stamp.test.mjs
node tests/fuzz.mjs 300               # 300 rounds
node tests/fuzz.mjs 60 --nopart       # disable disconnect injection
STEPS=120 node tests/fuzz.mjs 60      # change steps per round from 90 to 120
node tests/fuzz.mjs --verbose         # print replica diffs on failure (first 8 rounds print automatically)
node tests/stamp.test.mjs             # Module 2: chain integrity, lock policy, cross-engine lock (14 assertions)
node tests/tp2.mjs                    # TP2 diagnostic, prints divergence count, no exit-code gate
```

### 7.2 navegador E2E

```bash
python3 -m http.server 8098
# in a second terminal, run the Playwright two-tab script
node <two-tab-script>                 # both pages join the same #ROOM and read window.__sync
```

El E2E depende en el debug handle `window.__sync = { engine, provider, viewport, presence, interaction, room, site }` (`src/main.js:120`); cada aserción lee a través de que handle más bien que reverse-engineering el DOM.

### 7.3 Distributed caos (T7)

```bash
python3 -m pip install websockets          # only Python dependency, version 17.4 used here
npm run chaos                              # 50 clients, 14s of chaos, JSON report
python3 chaos/fuzzer.py --clients 50 --seed 20261109 --verbose
python3 chaos/fuzzer.py --clients 8 --chaos-seconds 8 --hub-outage 3   # short-outage regression
python3 chaos/fuzzer.py --clients 50 --hub-outage 0                     # chaos without failover
python3 chaos/fuzzer.py --clients 50 --no-color                        # plain text for CI logs
```

El comando exits 0 en Aprobado y 1 en Fallo. El informe ruta defaults a `chaos/chaos-report.json`; `--report` overrides esto. `--verbose` prints un role/online/hub línea cada poll, cuál es useful cuando un ejecutar falla a settle.

---

## 8. Conclusion

| Elemento | Veredicto |
| --- | --- |
| TP1 texto О | Aprobado (0/400 fallos) |
| Multi-replica convergencia | Aprobado (60/60 y 300/300; incluyendo 1138 desconexiones y 1688 entregas) |
| Sin conexión recuperación | Aprobado (`unacked` retorna a cero, `rev` agrees) |
| Dos pestañas navegador | Aprobado (4 scenarios, 0 consola errores) |
| 50-réplica WebSocket caos | Aprobado (9/9 aserciones, 57 interrupciones, 2 entregas, uno SHA-256 a través de todos 50 réplicas, 2.9s a converge) |
| módulo 2 — sellos / bloqueo / auditoríun | Aprobado (14/14 aserciones: chain linkage, manipulación detección, bloqueo política, cross-engine bloqueo replication) |
| TP2 diagnostic | Diverges as esperado; registrado as architectural evidencia |
| Entrega cumplimiento | Aprobado (cuatro atribución layers presente, licencia presente, ningún unrelated marcas) |

**Firmado apagado: pruebas aprobado, este informe stands as el aceptación base para 1.0.0.**
