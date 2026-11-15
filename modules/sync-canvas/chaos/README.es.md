<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/sync-canvas/chaos/README.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# sync-canvas Distributed Caos Prueba

Un 50-réplica caos ejecutar para el sync-canvas О motor: aleatorio socket cuts,
forced secuenciador failover, un storm de nivel de carácter texto y insert
operaciones, entonces uno SHA-256 por réplica y un JSON informe.

El ejecutar es driven por Python (`asyncio` + `websockets`). El motor bajo prueba
es el real JavaScript `SyncEngine` entregado en `src/engine`, hosted por un thin
Node agent.

```bash
python3 -m pip install websockets     # the only Python dependency
npm run chaos                         # 50 clients, 14s of chaos
```

o con explícito knobs:

```bash
python3 chaos/fuzzer.py \
  --clients 50 \
  --chaos-seconds 14 \
  --hub-outage 10.5 \
  --seed 20261109 \
  --report chaos/chaos-report.json
```

Requirements: Python 3.10+, Node 22+ (global `WebSocket`), macOS o Linux.
Ningún npm packages. El Node agent importaciones el project's ES modules directamente;
allí es ningún compilación paso.

## Qué un ejecutar looks como

```
[1/4] boot        50 engine replicas registered (266ms)
[2/4] seed        6 shared notes, hub=BOT-01
[3/4] chaos       57 outages, 2 handoff(s), 249 ops
[4/4] verify      255 revisions, 75 nodes, 1 unique hash(es)
[PASS] BOT-01  rev 255  nodes 75  hash 5f74f3c075d5
...
[PASS] BOT-50  rev 255  nodes 75  hash 5f74f3c075d5
[PASS] 50 clients converged in 2.9s (5f74f3c075d575e5..., rev 255)
report -> chaos/chaos-report.json
```

Cuando stdout es un TTY cada `[PASS]` línea es verde. El 50 per-client líneas son
el prueba que cada réplica, no solo un summary, contiene el mismo documento.

## Arquitectura

```
                       Python: chaos/fuzzer.py
  +---------------------------------------------------------------+
  |  room relay (websocket)          control API (websocket)      |
  |  JSON passthrough, one room      commands in, snapshots out   |
  +----^----^----^--------------------------^--------------------+
       |    |    |  50 engine sockets      |  1 control socket
       |    |    |                         |
  +----+----+----+-------------------+     |
  |  Node: chaos/agent.mjs            |-----+
  |  50 x SyncEngine replicas         |
  |  BOT-01 .. BOT-50                 |
  +-----------------------------------+
```

Por qué el motor se ejecuta en Node:

- El thing siendo probado es el entregado `src/engine` módulo. Re-implementing
  О en Python sería demostrar que un segundo implementación agrees con él mismo.
- Python posee todo around el motor: el hostile red, el interrupción
  horario, el operación storm, el control API, el final hash y el
  aserciones. Que es el caos experiment.
- El 50 réplicas en vivo en uno Node proceso solo a conservar el ejecutar laptop-sized.
  Aislamiento es en el red capa: cada réplica posee su socket, Proveedor,
  presencia roster y timers. Killing el Node proceso sería kill todos 50, así
  proceso crashes son no parte de este experiment.

El relé es un dumb sala: esto reenvía un marco a cada otros socket en el
sala y nunca echoes a el remitente, matching `BroadcastChannel`. Uno enrutamiento
regle es añadido para escala: un `sync-ops` marco que transporta `to` es entregado solo
a que sitio. El motor ya filters tales frames; enrutamiento ellos en el relé
conserva un 50-par anti-entropy vuelta linear en cambio de 50 x 49 full-log
broadcasts.

## Caos modelo

| Fase | Duration | Qué happens |
| --- | --- | --- |
| Arranque | hasta todos 50 informe | Réplicas connect, elect `BOT-01`, esperar para `rev = 0` en cada side |
| Seed | hasta todos aceptar | El secuenciador inserts six compartido hot notas (`seed-01` .. `seed-06`) |
| Caos | 14 s | Aleatorio interrupciones, uno secuenciador kill, continuous text/insert storm |
| Heal | immediate | Cada socket es restaurado, entonces anti-entropy se ejecuta |
| Verificar | hasta quiescent | 3 estable polls, snapshot, SHA-256 en Python, JSON informe |

Durante el caos ventana:

- Cada ~0.9 s, 3 a 5 aleatorio réplicas lose su socket para 2.8 a 3.3 s.
  El fuzzer always conserva en al menos 12 en línea.
- En t+3.6 s el actual secuenciador (`BOT-01`) es cut para 10.5 s. Presencia
  expires después 8 s, así `BOT-02` takes sobre. `BOT-01` retorna en el fin de el
  caos ventana y reclaims el rol. Ambos transitions son medido.
- Cada 180 ms, 1 a 2 en línea réplicas cada generar 1 a 3 operaciones:
  nivel de carácter `txt` ediciones contra el six hot notas (así concurrente texto О
  collides por diseño), `ins` de nuevo notas, y LWW propiedad `set` patches.
- Two réplicas (`BOT-49`, `BOT-50`) nunca flap. Ellos son el estable witnesses
  que expire el dead secuenciador. Everyone si no es fair game. Sin un estable
  witness, 50 independiente reconexión timers puede conservar resetting el dead hub's
  presencia lease y hacer el failover aserción un coin flip.

Cada disconnect es un real socket close (`engine.setOnline(false)`), no un
mensaje filter. Reconnects llamada `engine.setOnline(true)`, cuál retransmits
unacknowledged work y se ejecuta anti-entropy.

## Aserciones

El informe es un Aprobado solo si todos de estos hold:

| Aserción | Meaning |
| --- | --- |
| `client-set-complete` | Exactamente 50 único réplicas informado |
| `all-clients-online` | Cada réplica es en línea en snapshot tiempo |
| `single-sequencer` | Exactamente uno `hub`, y esto es `BOT-01` |
| `revision-agreement` | Todos réplicas informe el mismo `rev` |
| `document-hash-identical` | Uno único SHA-256 sobre cada replica's `doc.nodes` |
| `no-unacknowledged-work` | `unacked`, `queued` y `inbox` son todos cero everywhere |
| `hash-cross-check` | Python's SHA-256 equals el Node digest en cada réplica |
| `chaos-actually-happened` | En al menos 6 interrupciones, 6 reconnects y 60 local operaciones |
| `sequencer-handoff-exercised` | En al menos uno observed concentrador cambio |

El final hash es computed en Python de el documento pulled sobre el control
API, usando clave-sorted JSON con ningún whitespace. El Node digest existe solo para
fast polling durante el ejecutar; `hash-cross-check` prueba ambos canonicalizations
aceptar byte para byte.

## Informe schema

`chaos/chaos-report.json`:

```json
{
  "schema": "sync-canvas/chaos-report@1",
  "verdict": "PASS",
  "summary": {
    "clients": 50,
    "convergenceMs": 2915,
    "rev": 255,
    "nodes": 75,
    "uniqueDocHashes": 1,
    "docHash": "5f74f3c0...",
    "localOps": 249,
    "outages": 57,
    "reconnects": 57,
    "hubHandoffs": 2,
    "minOnline": 34,
    "hashCrossCheck": true,
    "relay": { "framesIn": 14858, "framesOut": 184632, "bytesOut": 84706527 }
  },
  "config": { "...": "..." },
  "assertions": [{ "name": "...", "pass": true, "detail": "..." }],
  "timeline": [{ "event": "hub-kill", "atMs": 3601, "site": "BOT-01" }],
  "clients": [{ "site": "BOT-01", "rev": 255, "docHashPython": "...", "...": "..." }],
  "firstDivergence": null,
  "environment": { "python": "...", "node": "v26.0.0", "websockets": "..." }
}
```

En fallo, `firstDivergence` nombres el primero node que differs entre two
réplicas, con el two node values (texto truncated a 80 caracteres). El
proceso exits non-zero.

## Resultado de el checked-in ejecutar

Seed `20261109`, 50 réplicas:

| Metric | Valor |
| --- | --- |
| Clientes | 50 / 50 |
| Veredicto | Aprobado |
| Revision | 255 |
| Nodos | 75 |
| Único SHA-256 | 1 (`5f74f3c075d575e50187e2a73ea002f6567c21fc35e3efb0e40dc74bd7e27505`) |
| Local operaciones | 249 |
| Interrupciones / reconnects | 57 / 57 |
| Secuenciador entregas | 2 (`BOT-01` a `BOT-02` en +10.3s, atrás en +14.5s) |
| Minimum en línea | 34 |
| relé traffic | 184,632 deliveries, 85 MB |
| Convergencia después heal | 2.9 s |

Recuentos mover entre se ejecuta porque socket timings race el 3-segundo interrupción
horario; el veredicto hace no. Revision, node recuento y hash son properties de
que particular operación stream, así ellos son compared a través de todos 50 réplicas
dentro uno ejecutar, no contra un corregido expectation.

## Un defecto este harness encontrado

El primero 3-segundo sequencer-outage ejecutar hizo no converge:

```
[FAIL] 8 clients did not converge
  - no-unacknowledged-work: unacked=77, queued=0, inbox=0
```

Causar: operaciones enviado mientras el sequencer's socket era down son dropped por
el relé. Clientes conservar ellos en `unacked`, pero presencia hace no expire el
secuenciador para 8 segundos, así ningún re-election y ningún retransmit happens. Más tarde
operaciones son diffed contra un vista que contiene el lost ediciones, y carry un
versión vector claiming predecessors el secuenciador nunca saw. El secuenciador
entonces se aplica ellos en el incorrecto order.

Corrección, ahora parte de `SyncEngine`:

1. Cuando un secuenciador finishes warming up, su registro replay transporta `replay: true`.
   Clientes retransmit su `unacked` cola en que signal. Un reconexión también
   retransmits aintes flushing el sin conexión outbox.
2. Aintes sequencing un op, el concentrador comprobaciones cada entrada en su `vv` contra
   `seen`. Falta predecessors park el op en un per-site cola. Cuando el
   falta entradas arrive, el cola drains en causal order.

Duplicates son gratuito: el hub's `seen` conjunto ya de-duplicates retransmits.

Reproduction:

```bash
python3 chaos/fuzzer.py --clients 8 --chaos-seconds 8 --hub-outage 3 --seed 7
```

Aintes el corrección este exits 1 con `unacked` en el dozens; después el corrección esto
exits 0. El 50-cliente ejecutar encima es el mismo código ruta en completo escala.

## Límites

- **Uno Node proceso hosts todos 50 réplicas.** Desconexiones son per-socket,
  cuál es el fault este experiment es about. Un proceso crash es fuera de alcance.
- **Loopback solo.** El relé y el agent ejecutar en 127.0.0.1; WAN jitter,
  packet reordering y partial escribe son no simulated.
- **En memoria solo.** Allí es ningún persistencia capa a prueba. Restarting el
  agent loses el sala por diseño.
- **Final-state aserción.** El harness prueba convergencia y el absence
  de stranded work en resto, no per-operation latency o UI marco velocidad.
- **Two observers.** Ellos son excluded de aleatorio interrupciones a hacer failover
  determinista. El otros 48 réplicas aún flap.
- **Ningún authentication.** El relé accepts cualquiera sitio id, matching el
  prototype's boundaries.
