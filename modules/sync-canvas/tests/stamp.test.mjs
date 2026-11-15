// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
/**
 * Signature-stamp acceptance tests (no DOM, runs under Node).
 *
 * Covers Module 2 requirements:
 *   - the audit hash chain is Hash(prev + op) and tamper-evident;
 *   - two chains with identical inputs converge, different genesis diverge;
 *   - the locking policy forbids moving/deleting a locked stamp;
 *   - a lock set by A replicates to B through the OT engine, so B sees A's
 *     stamp as immovable (the two-tab acceptance criterion).
 */

import * as BoardOT from '../src/engine/BoardOT.js';
import { SyncEngine } from '../src/engine/SyncEngine.js';
import { EventBus } from '../src/utils/EventBus.js';
import { HashChain, sha256Hex, canonical, GENESIS } from '../src/audit/HashChain.js';
import { isLocked, canMove, canDelete } from '../src/engine/lock.js';

let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  } else {
    console.log(`  ✓ ${msg}`);
  }
}

// ── 1. hash chain linkage ──────────────────────────────────────────────────

async function testChain() {
  const c = new HashChain();
  const e0 = await c.append({ id: 'a', kind: 'stamp', x: 1, y: 2 });
  const e1 = await c.append({ id: 'b', kind: 'stamp', x: 3, y: 4 });
  const expect0 = await sha256Hex(`${GENESIS}|${canonical({ id: 'a', kind: 'stamp', x: 1, y: 2 })}`);
  const expect1 = await sha256Hex(`${e0.hash}|${canonical({ id: 'b', kind: 'stamp', x: 3, y: 4 })}`);
  assert(e0.hash === expect0, 'first link = Hash(genesis | op0)');
  assert(e1.prev === e0.hash && e1.hash === expect1, 'second link folds in the previous hash');
  assert((await c.verify()) === null, 'verify() reports an intact chain');
  c.entries[0].hash = 'deadbeef'.padEnd(64, '0');
  assert((await c.verify()) === 0, 'verify() detects a tampered link');
}

// ── 2. determinism / divergence ──────────────────────────────────────────────

async function testDeterminism() {
  const a = new HashChain();
  await a.append({ x: 1 });
  const b = new HashChain();
  await b.append({ x: 1 });
  assert(a.head === b.head, 'identical inputs produce an identical chain head');
  const c = new HashChain('f'.repeat(64));
  await c.append({ x: 1 });
  assert(c.head !== a.head, 'a different genesis diverges the chain');
}

// ── 3. locking policy ────────────────────────────────────────────────────────

function testLock() {
  const open = { id: 's1', kind: 'stamp', locked: false };
  const sealed = { id: 's2', kind: 'stamp', locked: true };
  assert(isLocked(open) === false && isLocked(sealed) === true, 'isLocked reflects the flag');
  assert(canMove(open) === true && canMove(sealed) === false, 'a locked stamp cannot be moved');
  assert(canDelete(open) === true && canDelete(sealed) === false, 'a locked stamp cannot be deleted');
}

// ── 4. lock replicates across engines ────────────────────────────────────────

class Net {
  constructor() {
    this.clients = [];
    this.queue = [];
  }
  join(c) {
    this.clients.push(c);
  }
  broadcast(from, msg) {
    for (const c of this.clients) {
      if (c === from || !c.engine.online) continue;
      this.queue.push({ to: c, msg: JSON.parse(JSON.stringify(msg)) });
    }
  }
  drain() {
    let n = 0;
    while (this.queue.length) {
      this.queue.sort((a, b) => a.to.site.localeCompare(b.to.site));
      const item = this.queue.shift();
      if (item.to.engine.online) item.to.engine.receive(item.msg);
      if (++n > 50000) throw new Error('network failed to quiesce');
    }
  }
}

function makePeer(net, site) {
  const bus = new EventBus();
  const peer = {
    site,
    bus,
    engine: null,
  };
  peer.provider = {
    send: (msg) => {
      if (!peer.engine.online) return;
      net.broadcast(peer, msg);
    },
    suspend: () => {},
    resume: () => {},
  };
  peer.engine = new SyncEngine({ site, provider: peer.provider, bus, now: () => Date.now(), warmMs: 50 });
  net.join(peer);
  return peer;
}

async function testReplication() {
  const net = new Net();
  const A = makePeer(net, 'AAAAA');
  const B = makePeer(net, 'BBBBB');
  net.drain();
  A.engine.setPeers(['AAAAA', 'BBBBB']);
  B.engine.setPeers(['AAAAA', 'BBBBB']);
  net.drain();

  const id = 'aaaaa-1-s';
  A.engine.local(
    BoardOT.ops.ins(A.engine.view.nodes.length, {
      id,
      kind: 'stamp',
      x: 100,
      y: 120,
      w: BoardOT.STAMP_W,
      h: BoardOT.STAMP_H,
      name: 'Alice',
      by: 'AAAAA',
      locked: false,
    }),
  );
  net.drain();
  A.engine.local(
    BoardOT.ops.set(id, {
      locked: true,
      lockedBy: 'AAAAA',
      fp: 'ab12cd34ef56',
      hash: '0'.repeat(64),
      prevHash: '0'.repeat(64),
    }),
  );
  net.drain();

  const bNode = B.engine.view.nodes.find((n) => n.id === id);
  assert(!!bNode, 'B receives A’s stamp node');
  assert(bNode && bNode.locked === true, 'B sees the stamp locked (state lock replicated)');
  assert(bNode && canMove(bNode) === false, 'acceptance: B cannot move A’s locked stamp');
  assert(bNode && canDelete(bNode) === false, 'acceptance: B cannot delete A’s locked stamp');
  assert(
    JSON.stringify(A.engine.doc.nodes) === JSON.stringify(B.engine.doc.nodes),
    'A and B documents converge',
  );
}

(async () => {
  console.log('stamp / lock / audit-chain tests\n');
  await testChain();
  await testDeterminism();
  testLock();
  await testReplication();
  console.log(failures === 0 ? '\n✓ all stamp tests passed' : `\n✗ ${failures} assertion(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
})();
