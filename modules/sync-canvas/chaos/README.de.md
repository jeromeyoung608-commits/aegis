<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/sync-canvas/chaos/README.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# sync-canvas Distributed Chaos Test

Ein 50-Replikat Chaos ausführen für der sync-canvas Oder Engine: Zufall Socket cuts,
forced Sequencer failover, ein storm von Zeichenebene Text und insert
Betrieb, dann eine SHA-256 pro Replikat und ein JSON Bericht.

Der ausführen ist driven durch Python (`asyncio` + `websockets`). Der Engine unter Test
ist der echt JavaScript `SyncEngine` ausgeliefert in `src/engine`, hosted durch ein thin
Node agent.

```bash
python3 -m pip install websockets     # the only Python dependency
npm run chaos                         # 50 clients, 14s of chaos
```

oder mit explizit knobs:

```bash
python3 chaos/fuzzer.py \
  --clients 50 \
  --chaos-seconds 14 \
  --hub-outage 10.5 \
  --seed 20261109 \
  --report chaos/chaos-report.json
```

Requirements: Python 3.10+, Node 22+ (global `WebSocket`), macOS oder Linux.
Kein npm packages. Der Node agent Importe der project's ES modules direkt;
dort ist kein Build Schritt.

## Was ein ausführen looks wie

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

Wenn stdout ist ein TTY jeder `[PASS]` Zeile ist grün. Der 50 per-client Zeilen sind
Nachweis das jeder Replikat, nicht nur ein summary, enthält der gleich Dokument.

## Architektur

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

Warum Engine läuft in Node:

- Der thing werdend getestet ist der ausgeliefert `src/engine` Modul. Re-implementing
  Oder in Python würde beweisen das ein zweite Implementierung agrees mit selbst.
- Python besitzt alles around Engine: der hostile Netzwerk, Ausfall
  Zeitplan, Vorgang storm, der control API, der endgültig Hash-Bildung und der
  Assertions. Das ist Chaos experiment.
- Der 50 Replikate live in eine Node Prozess nur zu behalten der ausführen laptop-sized.
  Isolation ist bei Netzwerk Ebene: jeder Replikat besitzt seiner Socket, Anbieter,
  Präsenz roster und timers. Killing Node Prozess würde kill alle 50, so
  Prozess crashes sind nicht Teil von dies experiment.

Der Relay ist ein dumb Raum: es leitet weiter ein Rahmen zu jeder andere Socket in der
Raum und niemals echoes zu Absender, matching `BroadcastChannel`. Eine Routing
Regel ist hinzugefügt für Skalierung: ein `sync-ops` Rahmen das trägt `to` ist zugestellt nur
zu Standort. Der Engine bereits filters solche frames; Routing sie bei Relay
behält ein 50-Peer anti-entropy Runde linear stattdessen von 50 x 49 full-log
broadcasts.

## Chaos Modell

| Phase | Duration | Was happens |
| --- | --- | --- |
| Start | bis alle 50 Bericht | Replikate connect, elect `BOT-01`, warten für `rev = 0` auf jeder side |
| Seed | bis alle zustimmen | Der Sequencer inserts six geteilt hot Notizen (`seed-01` .. `seed-06`) |
| Chaos | 14 s | Zufall Ausfälle, eine Sequencer kill, continuous text/insert storm |
| Heal | immediate | Jeder Socket ist wiederhergestellt, dann anti-entropy läuft |
| Prüfen | bis quiescent | 3 stabil polls, snapshot, SHA-256 in Python, JSON Bericht |

Während Chaos Fenster:

- Jeder ~0.9 s, 3 zu 5 Zufall Replikate lose ihrer Socket für 2.8 zu 3.3 s.
  Der fuzzer always behält bei mindestens 12 online.
- Bei t+3.6 s der aktuell Sequencer (`BOT-01`) ist cut für 10.5 s. Präsenz
  expires nach 8 s, so `BOT-02` takes über. `BOT-01` gibt zurück bei Ende von der
  Chaos Fenster und reclaims Rolle. Beide transitions sind gemessen.
- Jeder 180 ms, 1 zu 2 online Replikate jeder erzeugen 1 zu 3 Betrieb:
  Zeichenebene `txt` Änderungen gegen der six hot Notizen (so gleichzeitig Text Oder
  collides durch Entwurf), `ins` von neu Notizen, und LWW Eigenschaft `set` patches.
- Two Replikate (`BOT-49`, `BOT-50`) niemals flap. Sie sind der stabil witnesses
  das expire der dead Sequencer. Everyone sonst ist fair game. Ohne ein stabil
  witness, 50 unabhängig Neuverbindung timers kann behalten resetting der dead hub's
  Präsenz lease und machen der failover Assertion ein coin flip.

Jeder disconnect ist ein echt Socket close (`engine.setOnline(false)`), nicht ein
Meldung filter. Reconnects Aufruf `engine.setOnline(true)`, welche retransmits
unacknowledged work und läuft anti-entropy.

## Assertions

Der Bericht ist ein Bestanden nur wenn alle von diese hold:

| Assertion | Meaning |
| --- | --- |
| `client-set-complete` | Genau 50 eindeutig Replikate gemeldet |
| `all-clients-online` | Jeder Replikat ist online bei snapshot Zeit |
| `single-sequencer` | Genau eine `hub`, und es ist `BOT-01` |
| `revision-agreement` | Alle Replikate Bericht der gleich `rev` |
| `document-hash-identical` | Eine eindeutig SHA-256 über jeder replica's `doc.nodes` |
| `no-unacknowledged-work` | `unacked`, `queued` und `inbox` sind alle null everywhere |
| `hash-cross-check` | Python's SHA-256 equals Node Prüfsumme auf jeder Replikat |
| `chaos-actually-happened` | Bei mindestens 6 Ausfälle, 6 reconnects und 60 lokal Betrieb |
| `sequencer-handoff-exercised` | Bei mindestens eine observed Hub Änderung |

Der endgültig Hash ist computed in Python von Dokument pulled über der control
API, mit Schlüssel-sorted JSON mit kein whitespace. Der Node Prüfsumme existiert nur für
fast polling während der ausführen; `hash-cross-check` beweist beide canonicalizations
zustimmen Byte für Byte.

## Bericht schema

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

Auf Fehler, `firstDivergence` Namen der erste node das differs zwischen two
Replikate, mit der two node values (Text truncated zu 80 Zeichen). Der
Prozess exits non-zero.

## Ergebnis von der checked-in ausführen

Seed `20261109`, 50 Replikate:

| Metric | Wert |
| --- | --- |
| Clients | 50 / 50 |
| Urteil | Bestanden |
| Revision | 255 |
| Knoten | 75 |
| Eindeutig SHA-256 | 1 (`5f74f3c075d575e50187e2a73ea002f6567c21fc35e3efb0e40dc74bd7e27505`) |
| Lokal Betrieb | 249 |
| Ausfälle / reconnects | 57 / 57 |
| Sequencer Übergaben | 2 (`BOT-01` zu `BOT-02` bei +10.3s, zurück bei +14.5s) |
| Minimum online | 34 |
| Relay traffic | 184,632 deliveries, 85 MB |
| Konvergenz nach heal | 2.9 s |

Zählungen bewegen zwischen läuft weil Socket timings race der 3-zweite Ausfall
Zeitplan; Urteil macht nicht. Revision, node Anzahl und Hash sind properties von
das particular Vorgang stream, so sie sind compared über alle 50 Replikate
innen eine ausführen, nicht gegen ein behoben expectation.

## Ein Fehler dies harness gefunden

Der erste 3-zweite sequencer-outage ausführen tat nicht converge:

```
[FAIL] 8 clients did not converge
  - no-unacknowledged-work: unacked=77, queued=0, inbox=0
```

Verursachen: Betrieb gesendet während der sequencer's Socket war down sind dropped durch
Relay. Clients behalten sie in `unacked`, aber Präsenz macht nicht expire der
Sequencer für 8 Sekunden, so kein re-election und kein retransmit happens. Später
Betrieb sind diffed gegen ein Ansicht das enthält der lost Änderungen, und carry ein
Version Vektor claiming predecessors Sequencer niemals saw. Der Sequencer
dann gilt sie in der falsch order.

Kcorrektur, jetzt Teil von `SyncEngine`:

1. Wenn ein Sequencer finishes warming up, seiner Protokoll replay trägt `replay: true`.
   Clients retransmit ihrer `unacked` Warteschlange auf das signal. Ein Neuverbindung auch
   retransmits vor flushing der offline outbox.
2. Vor sequencing ein op, Hub Prüfungen jeder Eintrag in seiner `vv` gegen
   `seen`. Fehlt predecessors park der op in ein per-site Warteschlange. Wenn der
   fehlt Einträge arrive, Warteschlange drains in causal order.

Duplicates sind kostenlos: der hub's `seen` Set bereits de-duplicates retransmits.

Reproduction:

```bash
python3 chaos/fuzzer.py --clients 8 --chaos-seconds 8 --hub-outage 3 --seed 7
```

Vor Kcorrektur dies exits 1 mit `unacked` in der dozens; nach Kcorrektur es
exits 0. Der 50-Client ausführen oben ist der gleich Code Pfad bei vollständig Skalierung.

## Grenzen

- **Eine Node Prozess hosts alle 50 Replikate.** Verbindungsabbrüche sind per-socket,
  welche ist der fault dies experiment ist about. Ein Prozess crash ist außer von Umfang.
- **Loopback nur.** Der Relay und der agent ausführen auf 127.0.0.1; WAN jitter,
  packet reordering und partial schreibt sind nicht simulated.
- **Im Arbeitsspeicher nur.** Dort ist kein Persistenz Ebene zu Test. Restarting der
  agent loses Raum durch Entwurf.
- **Final-state Assertion.** Der harness beweist Konvergenz und der absence
  von stranded work bei Rest, nicht per-operation latency oder UI Rahmen Rate.
- **Two observers.** Sie sind excluded von Zufall Ausfälle zu machen failover
  deterministisch. Der andere 48 Replikate noch flap.
- **Kein authentication.** Der Relay accepts irgendein Standort id, matching der
  prototype's boundaries.
