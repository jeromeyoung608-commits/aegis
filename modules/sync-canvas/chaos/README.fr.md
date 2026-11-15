<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/sync-canvas/chaos/README.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# sync-canvas Distributed Chaos Test

Un 50-réplique chaos exécuter pour le sync-canvas O moteur: aléatoire socket cuts,
forced séquenceur failover, un storm de niveau caractère texte et insert
opérations, alors un SHA-256 par réplique et un JSON rapport.

Le exécuter est driven par Python (`asyncio` + `websockets`). Le moteur sous test
est le rél JavaScript `SyncEngine` livré dans `src/engine`, hosted par un thin
Node agent.

```bash
python3 -m pip install websockets     # the only Python dependency
npm run chaos                         # 50 clients, 14s of chaos
```

ou avec explicite knobs:

```bash
python3 chaos/fuzzer.py \
  --clients 50 \
  --chaos-seconds 14 \
  --hub-outage 10.5 \
  --seed 20261109 \
  --report chaos/chaos-report.json
```

Requirements: Python 3.10+, Node 22+ (global `WebSocket`), macOS ou Linux.
Aucun npm packages. Le Node agent imports le project's ES modules directement;
là est aucun build étape.

## Quoi un exécuter looks comme

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

Quand stdout est un TTY chaque `[PASS]` ligne est vert. Le 50 per-client lignes sont
le preuve que chaque réplique, ne pas juste un summary, contient le même document.

## Architecture

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

Pourquoi le moteur s.exécute dans Node:

- Le thing étant testé est le livré `src/engine` module. Re-implementing
  O dans Python serait prouver que un deuxième implémentation agrees avec lui-même.
- Python possède tout around le moteur: le hostile réseau, le panne
  décal, le opération storm, le control API, le final délégation d'empreintes et le
  assertions. Que est le chaos experiment.
- Le 50 répliques direct dans un Node processus uniquement à conserver le exécuter laptop-sized.
  Isolation est à le réseau couche: chaque réplique possède son socket, Prestataire,
  présence roster et timers. Killing le Node processus serait kill tous 50, donc
  processus crashes sont ne pas partie de ce experiment.

Le relais est un dumb salle: il transmet un cadre à chaque autres socket dans le
salle et jamais echoes à le expéditeur, matching `BroadcastChannel`. Un routage
règle est ajouté pour échelle: un `sync-ops` cadre que porte `to` est livré uniquement
à que site. Le moteur déjà filters tels frames; routage eux à le relais
conserve un 50-pair anti-entropy tour linear plutôt de 50 x 49 full-log
broadcasts.

## Chaos modèle

| Phase | Duration | Quoi happens |
| --- | --- | --- |
| Démarrage | jusqu.à tous 50 rapport | Répliques connect, elect `BOT-01`, attendre pour `rev = 0` sur chaque side |
| Seed | jusqu.à tous accepter | Le séquenceur inserts six partagé hot notes (`seed-01` .. `seed-06`) |
| Chaos | 14 s | Aléatoire pannes, un séquenceur kill, continuous text/insert storm |
| Heal | immediate | Chaque socket est restauré, alors anti-entropy s.exécute |
| Vérifier | jusqu.à quiescent | 3 stable polls, snapshot, SHA-256 dans Python, JSON rapport |

Pendant le chaos fenêtre:

- Chaque ~0.9 s, 3 à 5 aléatoire répliques lose leur socket pour 2.8 à 3.3 s.
  Le fuzzer always conserve à au moins 12 en ligne.
- À t+3.6 s le actuel séquenceur (`BOT-01`) est cut pour 10.5 s. Présence
  expires après 8 s, donc `BOT-02` takes au-dessus de. `BOT-01` retourne à le fin de le
  chaos fenêtre et reclaims le rôle. Les deux transitions sont mesuré.
- Chaque 180 ms, 1 à 2 en ligne répliques chaque générer 1 à 3 opérations:
  niveau caractère `txt` modifications contre le six hot notes (donc concurrent texte O
  collides par conception), `ins` de nouveau notes, et LWW propriété `set` patches.
- Two répliques (`BOT-49`, `BOT-50`) jamais flap. Ils sont le stable witnesses
  que expire le dead séquenceur. Everyone sinon est fair game. Sans un stable
  witness, 50 indépendant reconnexion timers peut conserver resetting le dead hub's
  présence lease et faire le failover assertion un coin flip.

Chaque disconnect est un rél socket close (`engine.setOnline(false)`), ne pas un
message filter. Reconnects appel `engine.setOnline(true)`, lequel retransmits
unacknowledged work et s.exécute anti-entropy.

## Assertions

Le rapport est un Résumi uniquement si tous de ces hold:

| Assertion | Meaning |
| --- | --- |
| `client-set-complete` | Exactement 50 unique répliques signalé |
| `all-clients-online` | Chaque réplique est en ligne à snapshot temps |
| `single-sequencer` | Exactement un `hub`, et il est `BOT-01` |
| `revision-agreement` | Tous répliques rapport le même `rev` |
| `document-hash-identical` | Un unique SHA-256 au-dessus de chaque replica's `doc.nodes` |
| `no-unacknowledged-work` | `unacked`, `queued` et `inbox` sont tous zéro everywhere |
| `hash-cross-check` | Python's SHA-256 equals le Node empreinte sur chaque réplique |
| `chaos-actually-happened` | À au moins 6 pannes, 6 reconnects et 60 local opérations |
| `sequencer-handoff-exercised` | À au moins un observed hub modification |

Le final empreinte est computed dans Python de le document pulled au-dessus de le control
API, en utilisant clé-sorted JSON avec aucun whitespace. Le Node empreinte existe uniquement pour
fast polling pendant le exécuter; `hash-cross-check` prouve les deux canonicalizations
accepter octet pour octet.

## Rapport schema

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

Sur échec, `firstDivergence` noms le premier node que differs entre two
répliques, avec le two node values (texte truncated à 80 caractères). Le
processus exits non-zero.

## Résultat de le checked-in exécuter

Seed `20261109`, 50 répliques:

| Metric | Valeur |
| --- | --- |
| Clients | 50 / 50 |
| Verdict | Résumi |
| Revision | 255 |
| Nœuds | 75 |
| Unique SHA-256 | 1 (`5f74f3c075d575e50187e2a73ea002f6567c21fc35e3efb0e40dc74bd7e27505`) |
| Local opérations | 249 |
| Pannes / reconnects | 57 / 57 |
| Séquenceur remises | 2 (`BOT-01` à `BOT-02` à +10.3s, retour à +14.5s) |
| Minimum en ligne | 34 |
| relais traffic | 184,632 deliveries, 85 MB |
| Convergence après heal | 2.9 s |

Comptes déplacer entre s.exécute parce que socket timings race le 3-deuxième panne
décal; le verdict fait ne pas. Revision, node nombre et empreinte sont properties de
que particular opération stream, donc ils sont compared à travers tous 50 répliques
à l.íntérieur un exécuter, ne pas contre un corrigé expectation.

## Un défaut ce harness trouvé

Le premier 3-deuxième sequencer-outage exécuter fait ne pas converge:

```
[FAIL] 8 clients did not converge
  - no-unacknowledged-work: unacked=77, queued=0, inbox=0
```

Provoquer: opérations envoyé pendant le sequencer's socket était down sont dropped par
le relais. Clients conserver eux dans `unacked`, mais présence fait ne pas expire le
séquenceur pour 8 secondes, donc aucun re-election et aucun retransmit happens. Plus tard
opérations sont diffed contre un vue que contient le lost modifications, et carry un
version vecteur claiming predecessors le séquenceur jamais saw. Le séquenceur
alors s.applique eux dans le faux order.

Correctif, maintenant partie de `SyncEngine`:

1. Quand un séquenceur finishes warming up, son journal replay porte `replay: true`.
   Clients retransmit leur `unacked` file d'attente sur que signal. Un reconnexion également
   retransmits avant flushing le hors ligne outbox.
2. Avant sequencing un op, le hub contrôles chaque entrée dans son `vv` contre
   `seen`. Manquant predecessors park le op dans un per-site file d'attente. Quand le
   manquant entrées arrive, le file d'attente drains dans causal order.

Duplicates sont gratuit: le hub's `seen` ensemble déjà de-duplicates retransmits.

Reproduction:

```bash
python3 chaos/fuzzer.py --clients 8 --chaos-seconds 8 --hub-outage 3 --seed 7
```

Avant le correctif ce exits 1 avec `unacked` dans le dozens; après le correctif il
exits 0. Le 50-client exécuter ci-dessus est le même code chemin à complet échelle.

## Limites

- **Un Node processus hosts tous 50 répliques.** Déconnexions sont per-socket,
  lequel est le fault ce experiment est about. Un processus crash est hors de portée.
- **Loopback uniquement.** Le relais et le agent exécuter sur 127.0.0.1; WAN jitter,
  packet reordering et partial écrit sont ne pas simulated.
- **En mémoire uniquement.** Là est aucun persistance couche à test. Restarting le
  agent loses le salle par conception.
- **Final-state assertion.** Le harness prouve convergence et le absence
  de stranded work à reste, ne pas per-operation latency ou UI cadre débit.
- **Two observers.** Ils sont excluded de aléatoire pannes à faire failover
  déterministe. Le autres 48 répliques encore flap.
- **Aucun authentication.** Le relais accepts aucun site id, matching le
  prototype's boundaries.
