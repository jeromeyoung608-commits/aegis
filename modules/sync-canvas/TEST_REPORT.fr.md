<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: modules/sync-canvas/TEST_REPORT.md
> Translation for convenience only. The English text prevails.
> Traduction à titre indicatif — en cas de divergence, le texte anglais prévaut.

# sync-canvas Engineering Test Rapport

| Élément | Valeur |
| --- | --- |
| Version sous test | sync-canvas 1.0.0 (`package.json`) |
| Rapport version | v1.0 |
| Test date | 2026-11-09 |
| Portée | `src/engine/*` (O, BoardOT, SyncEngine, SocketProvider, verrou), `src/audit/*` (HashChain), `src/canvas/*`, `src/main.js`, `tests/stamp.test.mjs` |
| Verdict | **Résumi**: TP1 0 échecs; convergence fuzz 60/60 et 300/300; deux onglets navigateur E2E résumi; 50-réplique WebSocket chaos converged à un SHA-256; module 2 stamp/lock/audit 14/14 assertions résumi (cross-engine verrou reception rempli); delivery-conformité contrôles résumi |

---

## 1. Objectives

Ce projet est un collaboratif canvas avec un hand-written O moteur. Le tests uniquement care about quatre things que peut break:

1. **Texte O satisfies TP1**: two concurrent modifications produce le même résultat regardless de application order.
2. **Répliques converge**: sous aléatoire concurrency, aléatoire déconnexions et aléatoire séquenceur remises, chaque réplique ends avec identique `doc.nodes`, `rev` et `unacked`.
3. **Déconnexions sont recoverable**: opérations missed pendant hors ligne doit être restauré par anti-entropy (`requestSync`), ne pas par luck.
4. **Il actually s.exécute dans un navigateur**: two rél onglets synchronisation au-dessus de BroadcastChannel et le UI rapports aucun erreurs.

TP2 (three-way concurrent texte O) est **ne pas** un gate. Il est un modèle frontière de position-based O, utilisé à justify pourquoi le architecture nécessite un single-writer séquenceur (voir 4.3).

---

## 2. Environnement

| Élément | Valeur |
| --- | --- |
| OS | macOS (Apple Silicon) |
| Node.js | v26.0.0 |
| Statique serveur | `python3 -m http.server 8098` |
| navigateur | Chrome pour Testing (Playwright cache `chromium-1254`), headless |
| navigateur automation | `playwright-core@1.55.0` (ad-hoc reception script, ne pas un projet dépendance) |
| Python (chaos harness) | 3.14 |
| Python paquet | `websockets` 17.4 (le uniquement non-stdlib dépendance) |
| Node agent | v26.0.0 avec le intégré global `WebSocket` |
| réseau | T1-T6: local uniquement, BroadcastChannel. T7: loopback WebSocket relais, 50 concurrent sockets |

---

## 3. Test inventory

| ID | Niveau | Entrée point | Cœur assertions | Gate |
| --- | --- | --- | --- | --- |
| T1 | Propriété test | S.exécute automatiquement à l.íntérieur `tests/fuzz.mjs` | TP1: `apply(apply(base,b),a') === apply(apply(base,a),b')`, 400 aléatoire rounds | Oui (exit code) |
| T2 | Convergence fuzz | `node tests/fuzz.mjs [runs]` | Après 60 ou 300 rounds tous répliques partager le même `doc.nodes` JSON, le même `rev`, et `unacked === 0` | Oui |
| T3 | No-partition base de référence | `node tests/fuzz.mjs 60 --nopart` | Même assertion avec disconnect injection désactivé (`netOutages` doit être 0) | Oui |
| T4 | TP2 diagnostic | `node tests/tp2.mjs` | Divergence nombre au-dessus de 3000 three-way groups et 6 application orders | Aucun (divergence attendu; enregistré uniquement) |
| T5 | navigateur E2E | Playwright deux onglets script (voir 7.2) | First-paint parity, cross-tab synchronisation, hors ligne merge, séquenceur takeover, zéro console erreurs | Oui (script exit code) |
| T6 | conformité statique contrôles | `node --check` + keyword balaye | Syntax résuit; droit d.auteur en-tête / console bandeau / statut bar / canvas tampon présent; zéro unrelated marques tels as `trae` | Manuel |
| T7 | Distributed chaos | `python3 chaos/fuzzer.py --clients 50` | 50 rél `SyncEngine` répliques au-dessus de un WebSocket relais; aléatoire 3s socket cuts, un 10.5s séquenceur panne, 249 text/insert/patch opérations; final SHA-256 identique sur tous répliques, `unacked/queued/inbox` zéro | Oui (exit code) |
| T8 | module 2 reception | `node tests/stamp.test.mjs` | empreinte-chain linkage + falsification détection; determinism/divergence; verrou politique `canMove`/`canDelete`; un verrou ensemble par Un replicates à B à travers le O moteur et B ne peut pas move/delete il; A/B documents converge | Oui (exit code) |

---

## 4. Résultats

### 4.1 T1 texte TP1

```text
text TP1: ✓ passed
```

400 aléatoire rounds (base longueur 6–15, aléatoire insert/delete, two concurrent opérations): 0 échecs.

### 4.2 T2/T3 convergence fuzz

Chaque tour utilise 2–4 aléatoire pairs, 90 aléatoire étapes de `ins / del / set / txt`, un 5% chance par étape de flipping un peer's en ligne état (un garde always conserve à au moins un en ligne), alors brings everyone en ligne et s.exécute two `requestSync` rounds.

| Commande | Résultat | Avg nœuds | Déconnexions | Séquenceur remises |
| --- | --- | --- | --- | --- |
| `node tests/fuzz.mjs 60` | `60/60 runs identical` | 8 | 235 | 339 |
| `node tests/fuzz.mjs 60 --nopart` | `60/60 runs identical` | 9 | 0 | 60 |
| `node tests/fuzz.mjs 300` | `300/300 runs identical` | 8 | 1138 | 1688 |

Notes:

- Comptes vary sur chaque exécuter (pour exemple le 300-tour disconnect nombre lands entre roughly 1100 et 1200); **le verdict fait ne pas**.
- Le 60 remises sous `--nopart` sont initial elections, un par tour, ne pas pannes.
- Aucun échec fait le processus exit non-zero (`tests/fuzz.mjs:322`).

### 4.3 T4 TP2 diagnostic (divergence attendu)

```text
TP2 failures: 2763   (out of 3000 groups)
```

Avec un base texte, trois concurrent texte opérations et 6 application orders, about 92% de combinations fin dans différent résultats. Ce est un inherent propriété de position-based O avec more que two concurrent opérations, ne pas un implémentation défaut; il est exactement le justification pour "ordonnancement doit go à travers un unique hub" documenté dans le [README](README.md). Le script prints statistics uniquement et ensembles aucun échec gate.

### 4.4 T5 deux onglets navigateur E2E

Two pages dans le même navigateur contexte join un salle (`#E2E****`); moteur état est lire à travers `window.__sync`:

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

Quatre scenarios:

1. **First-paint seeding**: le hub seeds 7 nœuds; les deux sides show `rev=7`, 7 nœuds et identique à l.octet document JSON; roles split dans 1 hub + 1 client.
2. **Cross-tab synchronisation**: Un inserts un note; les deux sides déplacer à `rev=8` et `unacked` retourne à 0.
3. **Hors ligne merge**: le client appels `setOnline(false)`, les deux sides écrire un node (le client's écrire s.applique localement), alors il comes retour en ligne et appels `requestSync()`; les deux sides reach `rev=10`, 10 nœuds, identique JSON, `unacked=0`.
4. **Séquenceur takeover**: avec le hub hors ligne le client recomputes pairs et becomes `hub`; quand le hub retourne, re-election restaure le smallest site as `hub` et les deux documents rester identique à l.octet.

### 4.5 T6 conformité statique contrôles

| Vérifier | Résultat |
| --- | --- |
| `node --check` (`src/main.js`, `src/engine/*`, `src/canvas/CanvasRenderer.js`) | Tous résumi |
| Droit d.auteur en-tête (`Copyright (c) 2026 Jerome Young`) | Présent dans `OT.js`, `BoardOT.js`, `SyncEngine.js`, `SocketProvider.js` |
| console attribution | Prints le `sync-canvas` badge et licensing contact à startup |
| Statut bar attribution | `ENGINE BY JEROME YOUNG` visible |
| Canvas attribution | Or dot + `JEROME YOUNG` à le top-left de chaque note |
| Unrelated tiers marques (`trae / marscode / doubao / bytedance / coze`) | 0 correspond |
| licence fichier | `LICENSE` présent (Apache-2.0 pointer) et referenced par chaque source en-tête |

### 4.6 T7 distributed chaos (50 répliques)

Commande: `python3 chaos/fuzzer.py --clients 50 --seed 20261109` (également `npm run chaos`). Le harness boots un Python salle relais et un Python control API, alors 50 rél `SyncEngine` répliques à l.íntérieur `chaos/agent.mjs`. Chaque réplique possède son socket, présence roster et timers; Python uniquement pilote le hostile réseau et vérifie le résultat.

```text
[1/4] boot        50 engine replicas registered (266ms)
[2/4] seed        6 shared notes, hub=BOT-01
[3/4] chaos       57 outages, 2 handoff(s), 249 ops
[4/4] verify      255 revisions, 75 nodes, 1 unique hash(es)
[PASS] 50 clients converged in 2.9s (5f74f3c075d575e5..., rev 255)
```

| Metric | Valeur |
| --- | --- |
| Répliques | 50 / 50 signalé, tous en ligne |
| Verdict | Résumi (9/9 assertions) |
| Final revision | 255 |
| Final nœuds | 75 |
| Unique SHA-256 | 1: `5f74f3c075d575e50187e2a73ea002f6567c21fc35e3efb0e40dc74bd7e27505` |
| Local opérations | 249 (`txt`, `ins`, `set`) |
| Socket pannes / reconnects | 57 / 57 (2.8-3.3s chaque) |
| Séquenceur remises | 2 (`BOT-01` -> `BOT-02` à +10.3s, retour à +14.5s) |
| Minimum en ligne | 34 (2 observers jamais flap) |
| relais deliveries | 184,632 frames, 84,706,527 octets |
| Convergence après heal | 2.915s (3 stable polls) |
| Python vs Node empreinte | Identique à l.octet sur tous 50 répliques |

Comptes vary entre s.exécute parce que le socket décal races le reconnexion timers; le verdict fait ne pas. Revision, node nombre et empreinte describe un opération stream et sont compared à travers tous 50 répliques dans le même exécuter, ne pas contre un corrigé expectation.

Le final empreinte est computed dans Python de chaque replica's `doc.nodes` (clé-sorted JSON, aucun whitespace), après tous sockets sont restauré et anti-entropy a exécuter. `hash-cross-check` additionally vérifie Python's canonicalization contre le Node empreinte.

#### 4.6.1 Défaut trouvé et corrigé

Le premier short-outage exécuter échoué:

```text
[FAIL] 8 clients did not converge
  - no-unacknowledged-work: unacked=77, queued=0, inbox=0
```

- **Déclencheur**: le séquenceur était cut pour 3 secondes, shorter que le 8-deuxième présence expiration. Opérations envoyé pendant que fenêtre étaient dropped par le relais et stayed dans `unacked`; aucun re-election et donc aucun retransmit occurred. Plus tard opérations étaient diffed contre un vue containing le lost modifications, et leur `vv` named predecessors le séquenceur jamais saw.
- **Correctif 1**: le sequencer's warm-up replay maintenant porte `replay: true`; clients retransmit `unacked` sur que signal. Un reconnexion également retransmits `unacked` avant flushing `outbox`.
- **Correctif 2**: avant sequencing, le hub contrôles chaque entrée dans le op's `vv` contre `seen` et parks le op par site jusqu.à manquant predecessors arrive, alors drains dans causal order.
- **Vérification**: le 8-client reproduction (`--clients 8 --chaos-seconds 8 --hub-outage 3`) maintenant exits 0, et le 50-client exécuter ci-dessus converges avec 2 remises et zéro stranded work.

### 4.7 T8 signature tampons, locking & audit chain

`node tests/stamp.test.mjs` est un DOM-free Node suite (14 assertions) couvrant module 2. Il reuses `SyncEngine` + `EventBus` derrière un toy en mémoire réseau (`Net`/`makePeer`) donc two engines replicate exactement comme two navigateur onglets.

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

Le quatre assertion groups:

1. **empreinte-chain linkage & tamper-preuve** (`src/audit/HashChain.js`): le premier lien equals `Hash(GENESIS | op0)`, chaque subsequent lien folds dans le prior empreinte, `verify()` retourne `null` sur un intact chain et le index de le premier bad lien après tampering.
2. **Determinism / divergence**: two chains fed identique inputs reach le même tête; un différent genesis diverges.
3. **Locking politique** (`src/engine/lock.js`): `isLocked`, `canMove` et `canDelete` tous lire le `locked` indicateur — un unlocked tampon est movable/deletable, un verrouillé un est neither.
4. **Cross-engine verrou replication (le reception criterion)**: moteur Un inserts un tampon alors replicates `set(id, { locked: true, lockedBy, fp, hash, prevHash })`; après le toy réseau drains, moteur B possède le node, `bNode.locked === true`, `canMove`/`canDelete` sont les deux `false`, et `JSON.stringify(A.doc.nodes) === JSON.stringify(B.doc.nodes)`. Ce est le headless form de le deux onglets exigence: *après Un tampons et locks, B ne peut pas déplacer il.*

---

## 5. Assertions et échec critères

### 5.1 Moteur convergence gate (T1-T3)

"Convergence" à `tests/fuzz.mjs:234-238` exige tous trois conditions à une fois:

```js
const docs = peers.map((p) => JSON.stringify(p.engine.doc.nodes));
const ok = docs.every((d) => d === head) &&
  peers.every((p) => p.engine.unacked.length === 0) &&
  peers.every((p) => p.engine.rev === peers[0].engine.rev);
```

- `doc.nodes` identique à l.octet: même order, même properties, même texte — ne pas merely le même nombre.
- `unacked === 0`: aucun local opération est gauche waiting forever pour un acknowledgement.
- `rev` equal: le global compteur a ne pas drifted entre répliques.

Sur échec, `--verbose` prints chaque peer's `role / rev / unacked / inbox / outbox` plus le premier diverging node.

### 5.2 T7 distributed chaos gate

`chaos/fuzzer.py` écrit chaque assertion dans le rapport et exits non-zero si aucun échoue. Un exécuter est un Résumi uniquement quand tous nine hold:

| Assertion | Résumi condition |
| --- | --- |
| `client-set-complete` | Exactement `--clients` unique répliques signalé au-dessus de le control API |
| `all-clients-online` | Chaque réplique est en ligne à snapshot temps |
| `single-sequencer` | Exactement un `hub`, et il est le smallest site id (`BOT-01`) |
| `revision-agreement` | Tous répliques rapport le même `rev` |
| `document-hash-identical` | Un unique SHA-256 à travers tous replicas' `doc.nodes` |
| `no-unacknowledged-work` | `unacked`, `queued` et `inbox` sont zéro sur chaque réplique |
| `hash-cross-check` | Python's canonical SHA-256 equals le Node empreinte octet pour octet |
| `chaos-actually-happened` | À au moins 6 pannes, 6 reconnects et 60 local opérations |
| `sequencer-handoff-exercised` | À au moins un observed hub modification quand `--hub-outage >= 8` |

Le passation assertion est uniquement protégé quand le séquenceur panne peut outlast le 8-deuxième présence expiration. Un shorter panne (`--hub-outage 3`) deliberately tests lost-ack récupération plutôt de failover, donc il est ne pas requis à hand désactivé.

---

## 6. Couverture et connu lacunes

**Couvert**

- Texte TP1 (400 rounds), board convergence (60 et 300 rounds), hors ligne récupération, séquenceur takeover, rél deux onglets synchronisation.
- Five opération families: insert, supprimer, propriété LWW, texte O, absolute-coordinate draguer commit.
- Un no-partition base de référence, proving le disconnect injection est le uniquement variable dans le fuzz exécuter.
- **Rél WebSocket lien**: T7 exercises `SocketProvider`-equivalent transport au-dessus de un rél WebSocket relais avec 50 concurrent sockets et genuine socket ferme.
- **Présence expiration et le 8-deuxième fenêtre**: T7 s.exécute le production 3s heartbeat / 8s expiration timing; le 10.5s séquenceur panne forces expiration, re-election et un mesuré passation.
- **module 2 — signature tampons, locking & audit chain (T8)**: empreinte-chain linkage et falsification détection, deterministic/divergent genesis, le `locked` garde politique, et cross-engine verrou replication (le deux onglets reception criterion) sous un DOM-free two-engine harness.

**Ne pas couvert (par conception ou par constraint)**

- **Recharger persistance**: persistance est délibérément absent (voir README boundaries); un recharger laisse le salle, et rien tests que.
- **Visuel régression**: aucun pixel snapshot diffing; mise en page et attribution étaient checked par manuel screenshots.
- **Performance**: aucun large-document ou long-session charge test; le fuzz `drain()` cap de 50,000 messages uniquement empêche infinite loops.
- **Cross-navigateur**: Chromium uniquement; Firefox/Safari BroadcastChannel behavior untested.
- **TP2**: ne pas un gate; divergence est attendu.

---

## 7. Reproduction

### 7.1 Moteur couche

```bash
npm test                              # = node tests/fuzz.mjs + node tests/stamp.test.mjs
node tests/fuzz.mjs 300               # 300 rounds
node tests/fuzz.mjs 60 --nopart       # disable disconnect injection
STEPS=120 node tests/fuzz.mjs 60      # change steps per round from 90 to 120
node tests/fuzz.mjs --verbose         # print replica diffs on failure (first 8 rounds print automatically)
node tests/stamp.test.mjs             # Module 2: chain integrity, lock policy, cross-engine lock (14 assertions)
node tests/tp2.mjs                    # TP2 diagnostic, prints divergence count, no exit-code gate
```

### 7.2 navigateur E2E

```bash
python3 -m http.server 8098
# in a second terminal, run the Playwright two-tab script
node <two-tab-script>                 # both pages join the same #ROOM and read window.__sync
```

Le E2E dépend sur le debug handle `window.__sync = { engine, provider, viewport, presence, interaction, room, site }` (`src/main.js:120`); chaque assertion lit à travers que handle plutôt que reverse-engineering le DOM.

### 7.3 Distributed chaos (T7)

```bash
python3 -m pip install websockets          # only Python dependency, version 17.4 used here
npm run chaos                              # 50 clients, 14s of chaos, JSON report
python3 chaos/fuzzer.py --clients 50 --seed 20261109 --verbose
python3 chaos/fuzzer.py --clients 8 --chaos-seconds 8 --hub-outage 3   # short-outage regression
python3 chaos/fuzzer.py --clients 50 --hub-outage 0                     # chaos without failover
python3 chaos/fuzzer.py --clients 50 --no-color                        # plain text for CI logs
```

Le commande exits 0 sur Résumi et 1 sur Échec. Le rapport chemin defaults à `chaos/chaos-report.json`; `--report` overrides il. `--verbose` prints un role/online/hub ligne chaque poll, lequel est useful quand un exécuter échoue à settle.

---

## 8. Conclusion

| Élément | Verdict |
| --- | --- |
| TP1 texte O | Résumi (0/400 échecs) |
| Multi-replica convergence | Résumi (60/60 et 300/300; y compris 1138 déconnexions et 1688 remises) |
| Hors ligne récupération | Résumi (`unacked` retourne à zéro, `rev` agrees) |
| Deux onglets navigateur | Résumi (4 scenarios, 0 console erreurs) |
| 50-réplique WebSocket chaos | Résumi (9/9 assertions, 57 pannes, 2 remises, un SHA-256 à travers tous 50 répliques, 2.9s à converge) |
| module 2 — tampons / verrou / audit | Résumi (14/14 assertions: chain linkage, falsification détection, verrou politique, cross-engine verrou replication) |
| TP2 diagnostic | Diverges as attendu; enregistré as architectural preuve |
| Livraison conformité | Résumi (quatre attribution layers présent, licence présent, aucun unrelated marques) |

**Signé désactivé: tests résumi, ce rapport stands as le reception base pour 1.0.0.**
