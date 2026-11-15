<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/sync-canvas/TEST_REPORT.md
> Translation for convenience only. The English text prevails.
> Übersetzung zur Erleichterung — bei Abweichungen ist der englische Text maßgeblich.

# sync-canvas Engineering Test Bericht

| Punkt | Wert |
| --- | --- |
| Version unter Test | sync-canvas 1.0.0 (`package.json`) |
| Bericht Version | v1.0 |
| Test Datum | 2026-11-09 |
| Umfang | `src/engine/*` (Oder, BoardOT, SyncEngine, SocketProvider, Sperre), `src/audit/*` (HashChain), `src/canvas/*`, `src/main.js`, `tests/stamp.test.mjs` |
| Urteil | **Bestanden**: TP1 0 Fehler; Konvergenz Fuzz 60/60 und 300/300; Zwei-Tab Browser E2E bestanden; 50-Replikat WebSocket Chaos converged zu eine SHA-256; Modul 2 stamp/lock/audit 14/14 Assertions bestanden (cross-engine Sperre Abnahme erfüllt); delivery-Compliance Prüfungen bestanden |

---

## 1. Objectives

Dies Projekt ist ein kollaborativ Canvas mit ein hand-written Oder Engine. Der Tests nur care about vier things das kann break:

1. **Text Oder satisfies TP1**: two gleichzeitig Änderungen produce der gleich Ergebnis regardless von Anwendung order.
2. **Replikate converge**: unter Zufall concurrency, Zufall Verbindungsabbrüche und Zufall Sequencer Übergaben, jeder Replikat ends mit identisch `doc.nodes`, `rev` und `unacked`.
3. **Verbindungsabbrüche sind recoverable**: Betrieb missed während offline muss sein wiederhergestellt durch anti-entropy (`requestSync`), nicht durch luck.
4. **Es actually läuft in ein Browser**: two echt Registerkarten Synchronisation über BroadcastChannel und UI Berichte kein Fehler.

TP2 (three-way gleichzeitig Text Oder) ist **nicht** ein Gate. Es ist ein Modell Grenze von position-based Oder, verwendet zu justify warum Architektur benötigt ein single-writer Sequencer (siehe 4.3).

---

## 2. Umgebung

| Punkt | Wert |
| --- | --- |
| OS | macOS (Apple Silicon) |
| Node.js | v26.0.0 |
| Statisch Server | `python3 -m http.server 8098` |
| Browser | Chrome für Testing (Playwright Cache `chromium-1254`), Headless |
| Browser automation | `playwright-core@1.55.0` (ad-hoc Abnahme Skript, nicht ein Projekt Abhängigkeit) |
| Python (Chaos harness) | 3.14 |
| Python Paket | `websockets` 17.4 (der nur non-stdlib Abhängigkeit) |
| Node agent | v26.0.0 mit der eingebaut global `WebSocket` |
| Netzwerk | T1-T6: lokal nur, BroadcastChannel. T7: loopback WebSocket Relay, 50 gleichzeitig sockets |

---

## 3. Test inventory

| ID | Ebene | Eintrag Punkt | Kern Assertions | Gate |
| --- | --- | --- | --- | --- |
| T1 | Eigenschaft Test | Läuft automatisch innen `tests/fuzz.mjs` | TP1: `apply(apply(base,b),a') === apply(apply(base,a),b')`, 400 Zufall rounds | Ja (exit Code) |
| T2 | Konvergenz Fuzz | `node tests/fuzz.mjs [runs]` | Nach 60 oder 300 rounds alle Replikate teilen der gleich `doc.nodes` JSON, der gleich `rev`, und `unacked === 0` | Ja |
| T3 | No-partition Baseline | `node tests/fuzz.mjs 60 --nopart` | Gleich Assertion mit disconnect injection deaktiviert (`netOutages` muss sein 0) | Ja |
| T4 | TP2 diagnostic | `node tests/tp2.mjs` | Divergence Anzahl über 3000 three-way groups und 6 Anwendung orders | Kein (divergence erwartet; aufgezeichnet nur) |
| T5 | Browser E2E | Playwright Zwei-Tab Skript (siehe 7.2) | First-paint parity, cross-tab Synchronisation, offline merge, Sequencer takeover, null Konsole Fehler | Ja (Skript exit Code) |
| T6 | Compliance statisch Prüfungen | `node --check` + keyword scannt | Syntax besteht; Copyright Kopfzeile / Konsole Banner / Status bar / Canvas Stempel vorhanden; null unrelated Kennzeichen solche as `trae` | Handbuch |
| T7 | Distributed Chaos | `python3 chaos/fuzzer.py --clients 50` | 50 echt `SyncEngine` Replikate über ein WebSocket Relay; Zufall 3s Socket cuts, ein 10.5s Sequencer Ausfall, 249 text/insert/patch Betrieb; endgültig SHA-256 identisch auf alle Replikate, `unacked/queued/inbox` null | Ja (exit Code) |
| T8 | Modul 2 Abnahme | `node tests/stamp.test.mjs` | Hash-Kette linkage + Manipulation Erkennung; determinism/divergence; Sperre Richtlinie `canMove`/`canDelete`; ein Sperre Set durch Ein replicates zu B durch Oder Engine und B kann nicht move/delete es; A/B Dokumente converge | Ja (exit Code) |

---

## 4. Ergebnisse

### 4.1 T1 Text TP1

```text
text TP1: ✓ passed
```

400 Zufall rounds (Basis Länge 6–15, Zufall insert/delete, two gleichzeitig Betrieb): 0 Fehler.

### 4.2 T2/T3 Konvergenz Fuzz

Jeder Runde verwendet 2–4 Zufall Peers, 90 Zufall Schritte von `ins / del / set / txt`, ein 5% chance pro Schritt von flipping ein peer's online Zustand (ein Wächter always behält bei mindestens eine online), dann brings everyone online und läuft two `requestSync` rounds.

| Befehl | Ergebnis | Avg Knoten | Verbindungsabbrüche | Sequencer Übergaben |
| --- | --- | --- | --- | --- |
| `node tests/fuzz.mjs 60` | `60/60 runs identical` | 8 | 235 | 339 |
| `node tests/fuzz.mjs 60 --nopart` | `60/60 runs identical` | 9 | 0 | 60 |
| `node tests/fuzz.mjs 300` | `300/300 runs identical` | 8 | 1138 | 1688 |

Notizen:

- Zählungen vary auf jeder ausführen (für Beispiel der 300-Runde disconnect Anzahl lands zwischen roughly 1100 und 1200); **Urteil macht nicht**.
- Der 60 Übergaben unter `--nopart` sind initial elections, eine pro Runde, nicht Ausfälle.
- Irgendein Fehler macht Prozess exit non-zero (`tests/fuzz.mjs:322`).

### 4.3 T4 TP2 diagnostic (divergence erwartet)

```text
TP2 failures: 2763   (out of 3000 groups)
```

Mit eine Basis Text, drei gleichzeitig Text Betrieb und 6 Anwendung orders, about 92% von combinations Ende in unterschiedlich Ergebnisse. Dies ist ein inherent Eigenschaft von position-based Oder mit more als two gleichzeitig Betrieb, nicht ein Implementierung Fehler; es ist genau der justification für "Reihenfolge muss go durch ein einzeln Hub" dokumentiert in der [README](README.md). Der Skript prints statistics nur und Mengen kein Fehler Gate.

### 4.4 T5 Zwei-Tab Browser E2E

Two Seiten in der gleich Browser Kontext join eine Raum (`#E2E****`); Engine Zustand ist lesen durch `window.__sync`:

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

Vier scenarios:

1. **First-paint seeding**: Hub seeds 7 Knoten; beide sides show `rev=7`, 7 Knoten und byte-identisch Dokument JSON; roles split in 1 Hub + 1 Client.
2. **Cross-tab Synchronisation**: Ein inserts ein Hinweis; beide sides bewegen zu `rev=8` und `unacked` gibt zurück zu 0.
3. **Offline merge**: Client Aufrufe `setOnline(false)`, beide sides schreiben ein node (der client's schreiben gilt lokal), dann es comes zurück online und Aufrufe `requestSync()`; beide sides reach `rev=10`, 10 Knoten, identisch JSON, `unacked=0`.
4. **Sequencer takeover**: mit Hub offline Client recomputes Peers und becomes `hub`; wenn Hub gibt zurück, re-election wiederherstellt der smallest Standort as `hub` und beide Dokumente bleiben byte-identisch.

### 4.5 T6 Compliance statisch Prüfungen

| Prüfen | Ergebnis |
| --- | --- |
| `node --check` (`src/main.js`, `src/engine/*`, `src/canvas/CanvasRenderer.js`) | Alle bestanden |
| Copyright Kopfzeile (`Copyright (c) 2026 Jerome Young`) | Vorhanden in `OT.js`, `BoardOT.js`, `SyncEngine.js`, `SocketProvider.js` |
| Konsole Zuordnung | Prints der `sync-canvas` badge und licensing Kontakt bei startup |
| Status bar Zuordnung | `ENGINE BY JEROME YOUNG` sichtbar |
| Canvas Zuordnung | Gold dot + `JEROME YOUNG` bei der top-left von jeder Hinweis |
| Unrelated Drittanbieter Kennzeichen (`trae / marscode / doubao / bytedance / coze`) | 0 passt |
| Lizenz Datei | `LICENSE` vorhanden (Apache-2.0 pointer) und referenced durch jeder source Kopfzeile |

### 4.6 T7 distributed Chaos (50 Replikate)

Befehl: `python3 chaos/fuzzer.py --clients 50 --seed 20261109` (auch `npm run chaos`). Der harness boots ein Python Raum Relay und ein Python control API, dann 50 echt `SyncEngine` Replikate innen `chaos/agent.mjs`. Jeder Replikat besitzt seiner Socket, Präsenz roster und timers; Python nur steuert der hostile Netzwerk und prüft Ergebnis.

```text
[1/4] boot        50 engine replicas registered (266ms)
[2/4] seed        6 shared notes, hub=BOT-01
[3/4] chaos       57 outages, 2 handoff(s), 249 ops
[4/4] verify      255 revisions, 75 nodes, 1 unique hash(es)
[PASS] 50 clients converged in 2.9s (5f74f3c075d575e5..., rev 255)
```

| Metric | Wert |
| --- | --- |
| Replikate | 50 / 50 gemeldet, alle online |
| Urteil | Bestanden (9/9 Assertions) |
| Endgültig revision | 255 |
| Endgültig Knoten | 75 |
| Eindeutig SHA-256 | 1: `5f74f3c075d575e50187e2a73ea002f6567c21fc35e3efb0e40dc74bd7e27505` |
| Lokal Betrieb | 249 (`txt`, `ins`, `set`) |
| Socket Ausfälle / reconnects | 57 / 57 (2.8-3.3s jeder) |
| Sequencer Übergaben | 2 (`BOT-01` -> `BOT-02` bei +10.3s, zurück bei +14.5s) |
| Minimum online | 34 (2 observers niemals flap) |
| Relay deliveries | 184,632 frames, 84,706,527 Bytes |
| Konvergenz nach heal | 2.915s (3 stabil polls) |
| Python vs Node Hash | Byte-identisch auf alle 50 Replikate |

Zählungen vary zwischen läuft weil Socket Zeitplan races Neuverbindung timers; Urteil macht nicht. Revision, node Anzahl und Hash describe eine Vorgang stream und sind compared über alle 50 Replikate innerhalb der gleich ausführen, nicht gegen ein behoben expectation.

Der endgültig Hash ist computed in Python von jeder replica's `doc.nodes` (Schlüssel-sorted JSON, kein whitespace), nach alle sockets sind wiederhergestellt und anti-entropy hat ausführen. `hash-cross-check` additionally prüft Python's canonicalization gegen Node Prüfsumme.

#### 4.6.1 Fehler gefunden und behoben

Der erste short-outage ausführen fehlgeschlagen:

```text
[FAIL] 8 clients did not converge
  - no-unacknowledged-work: unacked=77, queued=0, inbox=0
```

- **Auslöser**: Sequencer war cut für 3 Sekunden, shorter als der 8-zweite Präsenz Ablauf. Betrieb gesendet während Fenster waren dropped durch Relay und stayed in `unacked`; kein re-election und daher kein retransmit occurred. Später Betrieb waren diffed gegen ein Ansicht containing der lost Änderungen, und ihrer `vv` named predecessors Sequencer niemals saw.
- **Kcorrektur 1**: der sequencer's warm-up replay jetzt trägt `replay: true`; Clients retransmit `unacked` auf das signal. Ein Neuverbindung auch retransmits `unacked` vor flushing `outbox`.
- **Kcorrektur 2**: vor sequencing, Hub Prüfungen jeder Eintrag in der op's `vv` gegen `seen` und parks der op pro Standort bis fehlt predecessors arrive, dann drains in causal order.
- **Prüfung**: der 8-Client reproduction (`--clients 8 --chaos-seconds 8 --hub-outage 3`) jetzt exits 0, und der 50-Client ausführen oben converges mit 2 Übergaben und null stranded work.

### 4.7 T8 Signatur Stempel, locking & Audit chain

`node tests/stamp.test.mjs` ist ein DOM-free Node Suite (14 Assertions) abdeckend Modul 2. Es reuses `SyncEngine` + `EventBus` hinter ein toy im Arbeitsspeicher Netzwerk (`Net`/`makePeer`) so two engines replicate genau wie two Browser Registerkarten.

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

Der vier Assertion groups:

1. **Hash-Kette linkage & tamper-Beweis** (`src/audit/HashChain.js`): der erste Verknüpfung equals `Hash(GENESIS | op0)`, jeder subsequent Verknüpfung folds in der prior Hash, `verify()` gibt zurück `null` auf ein unversehrt chain und Index von der erste bad Verknüpfung nach tampering.
2. **Determinism / divergence**: two chains fed identisch inputs reach der gleich Kopf; ein unterschiedlich genesis diverges.
3. **Locking Richtlinie** (`src/engine/lock.js`): `isLocked`, `canMove` und `canDelete` alle lesen der `locked` Schalter — ein unlocked Stempel ist movable/deletable, ein gesperrt eine ist neither.
4. **Cross-engine Sperre replication (Abnahme criterion)**: Engine Ein inserts ein Stempel dann replicates `set(id, { locked: true, lockedBy, fp, hash, prevHash })`; nach der toy Netzwerk drains, Engine B besitzt der node, `bNode.locked === true`, `canMove`/`canDelete` sind beide `false`, und `JSON.stringify(A.doc.nodes) === JSON.stringify(B.doc.nodes)`. Dies ist Headless form von Zwei-Tab Anforderung: *nach Ein Stempel und locks, B kann nicht bewegen es.*

---

## 5. Assertions und Fehler Kriterien

### 5.1 Engine Konvergenz Gate (T1-T3)

"Konvergenz" bei `tests/fuzz.mjs:234-238` erfordert alle drei conditions bei einmal:

```js
const docs = peers.map((p) => JSON.stringify(p.engine.doc.nodes));
const ok = docs.every((d) => d === head) &&
  peers.every((p) => p.engine.unacked.length === 0) &&
  peers.every((p) => p.engine.rev === peers[0].engine.rev);
```

- `doc.nodes` byte-identisch: gleich order, gleich properties, gleich Text — nicht merely der gleich Anzahl.
- `unacked === 0`: kein lokal Vorgang ist links waiting forever für ein acknowledgement.
- `rev` equal: der global Zähler hat nicht drifted zwischen Replikate.

Auf Fehler, `--verbose` prints jeder peer's `role / rev / unacked / inbox / outbox` plus der erste diverging node.

### 5.2 T7 distributed Chaos Gate

`chaos/fuzzer.py` schreibt jeder Assertion in Bericht und exits non-zero wenn irgendein schlägt fehl. Ein ausführen ist ein Bestanden nur wenn alle nine hold:

| Assertion | Bestanden condition |
| --- | --- |
| `client-set-complete` | Genau `--clients` eindeutig Replikate gemeldet über der control API |
| `all-clients-online` | Jeder Replikat ist online bei snapshot Zeit |
| `single-sequencer` | Genau eine `hub`, und es ist der smallest Standort id (`BOT-01`) |
| `revision-agreement` | Alle Replikate Bericht der gleich `rev` |
| `document-hash-identical` | Eine eindeutig SHA-256 über alle replicas' `doc.nodes` |
| `no-unacknowledged-work` | `unacked`, `queued` und `inbox` sind null auf jeder Replikat |
| `hash-cross-check` | Python's canonical SHA-256 equals Node Prüfsumme Byte für Byte |
| `chaos-actually-happened` | Bei mindestens 6 Ausfälle, 6 reconnects und 60 lokal Betrieb |
| `sequencer-handoff-exercised` | Bei mindestens eine observed Hub Änderung wenn `--hub-outage >= 8` |

Der Übergabe Assertion ist nur geschützt wenn Sequencer Ausfall kann outlast der 8-zweite Präsenz Ablauf. Ein shorter Ausfall (`--hub-outage 3`) deliberately Tests lost-ack Wiederherstellung stattdessen von failover, so es ist nicht erforderlich zu hand aus.

---

## 6. Abdeckung und bekannt Lücken

**Abgedeckt**

- Text TP1 (400 rounds), board Konvergenz (60 und 300 rounds), offline Wiederherstellung, Sequencer takeover, echt Zwei-Tab Synchronisation.
- Five Vorgang families: insert, löschen, Eigenschaft LWW, Text Oder, absolute-coordinate ziehen commit.
- Ein no-partition Baseline, proving der disconnect injection ist der nur variable in Fuzz ausführen.
- **Echt WebSocket Verknüpfung**: T7 exercises `SocketProvider`-equivalent Transport über ein echt WebSocket Relay mit 50 gleichzeitig sockets und genuine Socket schließt.
- **Präsenz Ablauf und der 8-zweite Fenster**: T7 läuft Produktion 3s heartbeat / 8s Ablauf timing; der 10.5s Sequencer Ausfall forces Ablauf, re-election und ein gemessen Übergabe.
- **Modul 2 — Signatur Stempel, locking & Audit chain (T8)**: Hash-Kette linkage und Manipulation Erkennung, deterministic/divergent genesis, der `locked` Wächter Richtlinie, und cross-engine Sperre replication (Zwei-Tab Abnahme criterion) unter ein DOM-free two-engine harness.

**Nicht abgedeckt (durch Entwurf oder durch constraint)**

- **Neu laden Persistenz**: Persistenz ist absichtlich absent (siehe README boundaries); ein Neu laden lässt Raum, und nichts Tests das.
- **Visuell Regression**: kein pixel snapshot diffing; Layout und Zuordnung waren checked durch Handbuch screenshots.
- **Leistung**: kein large-Dokument oder long-session Last Test; Fuzz `drain()` cap von 50,000 Nachrichten nur verhindert infinite loops.
- **Cross-Browser**: Chromium nur; Firefox/Safari BroadcastChannel behavior untested.
- **TP2**: nicht ein Gate; divergence ist erwartet.

---

## 7. Reproduction

### 7.1 Engine Ebene

```bash
npm test                              # = node tests/fuzz.mjs + node tests/stamp.test.mjs
node tests/fuzz.mjs 300               # 300 rounds
node tests/fuzz.mjs 60 --nopart       # disable disconnect injection
STEPS=120 node tests/fuzz.mjs 60      # change steps per round from 90 to 120
node tests/fuzz.mjs --verbose         # print replica diffs on failure (first 8 rounds print automatically)
node tests/stamp.test.mjs             # Module 2: chain integrity, lock policy, cross-engine lock (14 assertions)
node tests/tp2.mjs                    # TP2 diagnostic, prints divergence count, no exit-code gate
```

### 7.2 Browser E2E

```bash
python3 -m http.server 8098
# in a second terminal, run the Playwright two-tab script
node <two-tab-script>                 # both pages join the same #ROOM and read window.__sync
```

Der E2E hängt ab auf der debug handle `window.__sync = { engine, provider, viewport, presence, interaction, room, site }` (`src/main.js:120`); jeder Assertion liest durch das handle vielmehr als reverse-engineering DOM.

### 7.3 Distributed Chaos (T7)

```bash
python3 -m pip install websockets          # only Python dependency, version 17.4 used here
npm run chaos                              # 50 clients, 14s of chaos, JSON report
python3 chaos/fuzzer.py --clients 50 --seed 20261109 --verbose
python3 chaos/fuzzer.py --clients 8 --chaos-seconds 8 --hub-outage 3   # short-outage regression
python3 chaos/fuzzer.py --clients 50 --hub-outage 0                     # chaos without failover
python3 chaos/fuzzer.py --clients 50 --no-color                        # plain text for CI logs
```

Der Befehl exits 0 auf Bestanden und 1 auf Fehlgeschlagen. Der Bericht Pfad defaults zu `chaos/chaos-report.json`; `--report` overrides es. `--verbose` prints ein role/online/hub Zeile jeder poll, welche ist useful wenn ein ausführen schlägt fehl zu settle.

---

## 8. Conclusion

| Punkt | Urteil |
| --- | --- |
| TP1 Text Oder | Bestanden (0/400 Fehler) |
| Multi-replica Konvergenz | Bestanden (60/60 und 300/300; einschließlich 1138 Verbindungsabbrüche und 1688 Übergaben) |
| Offline Wiederherstellung | Bestanden (`unacked` gibt zurück zu null, `rev` agrees) |
| Zwei-Tab Browser | Bestanden (4 scenarios, 0 Konsole Fehler) |
| 50-Replikat WebSocket Chaos | Bestanden (9/9 Assertions, 57 Ausfälle, 2 Übergaben, eine SHA-256 über alle 50 Replikate, 2.9s zu converge) |
| Modul 2 — Stempel / Sperre / Audit | Bestanden (14/14 Assertions: chain linkage, Manipulation Erkennung, Sperre Richtlinie, cross-engine Sperre replication) |
| TP2 diagnostic | Diverges as erwartet; aufgezeichnet as architectural Beweis |
| Lieferung Compliance | Bestanden (vier Zuordnung layers vorhanden, Lizenz vorhanden, kein unrelated Kennzeichen) |

**Signiert aus: Tests bestanden, dies Bericht stands as Abnahme Basis für 1.0.0.**
