// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * ========================================================================
 * Aegis — Tamper-Evident Hash-Chained Audit Trail
 *
 * Licensed under the Apache License, Version 2.0 (SPDX: Apache-2.0). You may
 * not use this file except in compliance with the License. A copy ships as
 * LICENSE at the repository root; see http://www.apache.org/licenses/LICENSE-2.0
 * ========================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { HashChain, GENESIS } from '../src/hash-chain.js';
import {
  AuditTrail,
  TRAIL_KEY,
  TRAIL_SCHEMA,
  formatClock,
  shortHash,
} from '../src/trail.js';

function memoryStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    dump: () => Object.fromEntries(map),
  };
}

const T0 = new Date(2026, 10, 10, 9, 30, 0);
const at = (minutes, seconds = 0) => new Date(2026, 10, 10, 9, 30 + minutes, seconds).toISOString();

test('appends links in order and chains each hash to the previous one', async () => {
  const trail = new AuditTrail({ now: () => T0 });

  const first = await trail.append({ actor: 'Engineer-A', event: 'Redaction started', at: at(0) });
  const second = await trail.append({ actor: 'Engineer-A', event: 'ECDSA signature generated', at: at(1) });
  const third = await trail.append({ actor: 'Boss-B', event: 'Verification passed', at: at(3) });

  assert.equal(first.index, 0);
  assert.equal(first.prev, GENESIS);
  assert.equal(second.prev, first.hash);
  assert.equal(third.prev, second.hash);
  assert.equal(trail.head, third.hash);
  assert.equal(trail.entries.length, 3);
  assert.equal(await trail.verify(), null);
});

test('concurrent appends are serialized into one unbroken chain', async () => {
  const trail = new AuditTrail();

  const links = await Promise.all([
    trail.append({ actor: 'Engineer-A', event: 'one', at: at(0) }),
    trail.append({ actor: 'Engineer-A', event: 'two', at: at(1) }),
    trail.append({ actor: 'Boss-B', event: 'three', at: at(2) }),
  ]);

  assert.deepEqual(links.map((entry) => entry.index), [0, 1, 2]);
  assert.equal(links[1].prev, links[0].hash);
  assert.equal(links[2].prev, links[1].hash);
  assert.equal(await trail.verify(), null);
});

test('canonical serialization makes key order irrelevant to the link hash', async () => {
  const a = new HashChain();
  const b = new HashChain();

  const left = await a.append({ x: 1, y: [2, { z: 3 }] });
  const right = await b.append({ y: [2, { z: 3 }], x: 1 });

  assert.equal(left.hash, right.hash);
});

test('verify reports the first edited link', async () => {
  const trail = new AuditTrail();
  await trail.append({ actor: 'Engineer-A', event: 'Redaction started', at: at(0) });
  await trail.append({ actor: 'Engineer-A', event: 'Destructive PDF produced', at: at(1) });
  await trail.append({ actor: 'Boss-B', event: 'Verification passed', at: at(2) });

  trail.entries[1].payload.actor = 'Mallory';

  assert.equal(await trail.verify(), 1);
  assert.equal(trail.brokenAt, 1);
});

test('verify reports reordered links', async () => {
  const trail = new AuditTrail();
  await trail.append({ actor: 'Engineer-A', event: 'one', at: at(0) });
  await trail.append({ actor: 'Engineer-A', event: 'two', at: at(1) });

  [trail.entries[0], trail.entries[1]] = [trail.entries[1], trail.entries[0]];

  assert.equal(await trail.verify(), 0);
});

test('a link hash covers actor, event, detail and fingerprint', async () => {
  const base = new AuditTrail();
  const other = new AuditTrail();

  const one = await base.append({
    actor: 'Engineer-A',
    event: 'ECDSA signature generated',
    detail: 'Signer A',
    fingerprint: '9C4E8A2B1D3F',
    at: at(1),
  });
  const two = await other.append({
    actor: 'Engineer-A',
    event: 'ECDSA signature generated',
    detail: 'Signer A',
    fingerprint: '9C4E8A2B1D3F',
    at: at(1),
  });

  assert.equal(one.hash, two.hash);

  const changed = new AuditTrail();
  const three = await changed.append({
    actor: 'Engineer-A',
    event: 'ECDSA signature generated',
    detail: 'Signer A',
    fingerprint: 'DEADBEEF0000',
    at: at(1),
  });

  assert.notEqual(one.hash, three.hash);
});

test('persists a chain and restores it intact', async () => {
  const storage = memoryStorage();
  const first = new AuditTrail({ storage });

  await first.append({ actor: 'Engineer-A', event: 'Redaction started', at: at(0) });
  await first.append({ actor: 'Boss-B', event: 'Verification passed', at: at(1) });

  const restored = new AuditTrail({ storage });
  await restored.load();

  assert.equal(restored.entries.length, 2);
  assert.equal(restored.head, first.head);
  assert.equal(restored.brokenAt, null);
  assert.equal(await restored.verify(), null);

  const raw = JSON.parse(storage.dump()[TRAIL_KEY]);
  assert.equal(raw.schema, TRAIL_SCHEMA);
  assert.equal(raw.entries.length, 2);
});

test('restores a tampered persisted chain in a broken state', async () => {
  const storage = memoryStorage();
  const first = new AuditTrail({ storage });

  await first.append({ actor: 'Engineer-A', event: 'one', at: at(0) });
  await first.append({ actor: 'Engineer-A', event: 'two', at: at(1) });

  const raw = JSON.parse(storage.dump()[TRAIL_KEY]);
  raw.entries[1].payload.event = 'tampered';
  storage.setItem(TRAIL_KEY, JSON.stringify(raw));

  const restored = new AuditTrail({ storage });
  await restored.load();

  assert.equal(restored.entries.length, 2);
  assert.equal(restored.brokenAt, 1);
});

test('a corrupt stored log is reported instead of silently ignored', async () => {
  const storage = memoryStorage({ [TRAIL_KEY]: 'not-json' });
  const trail = new AuditTrail({ storage });

  await trail.load();

  assert.equal(trail.entries.length, 0);
  assert.equal(trail.brokenAt, 0);
  assert.match(trail.loadError, /not valid JSON/);
});

test('rejects an unknown schema', async () => {
  const storage = memoryStorage({
    [TRAIL_KEY]: JSON.stringify({ schema: 'aegis.audit.v999', entries: [] }),
  });
  const trail = new AuditTrail({ storage });

  await trail.load();

  assert.match(trail.loadError, /Unsupported audit schema/);
});

test('reset returns the trail to a fresh genesis state', async () => {
  const storage = memoryStorage();
  const trail = new AuditTrail({ storage });

  await trail.append({ actor: 'Engineer-A', event: 'one', at: at(0) });
  trail.reset();

  assert.equal(trail.entries.length, 0);
  assert.equal(trail.head, GENESIS);
  assert.equal(trail.brokenAt, null);
  assert.equal(storage.dump()[TRAIL_KEY], undefined);
});

test('appends after load continue the restored chain', async () => {
  const storage = memoryStorage();
  const first = new AuditTrail({ storage });

  await first.append({ actor: 'Engineer-A', event: 'one', at: at(0) });

  const second = new AuditTrail({ storage });
  await second.load();
  const third = await second.append({ actor: 'Boss-B', event: 'two', at: at(1) });

  assert.equal(third.index, 1);
  assert.equal(third.prev, first.head);
  assert.equal(await second.verify(), null);
});

test('append requires an actor and an event name', async () => {
  const trail = new AuditTrail();

  await assert.rejects(() => trail.append({ actor: '', event: 'x' }), /actor is required/);
  await assert.rejects(() => trail.append({ actor: 'Engineer-A', event: '' }), /event is required/);
});

test('snapshot is a content-free, exportable structure', async () => {
  const trail = new AuditTrail();
  await trail.append({
    actor: 'Engineer-A',
    event: 'ECDSA signature generated',
    detail: 'Signer A · Signer B',
    fingerprint: '9C4E8A2B1D3F',
    at: at(1),
  });

  const snapshot = trail.snapshot();

  assert.equal(snapshot.schema, TRAIL_SCHEMA);
  assert.equal(snapshot.algorithm, 'SHA-256');
  assert.equal(snapshot.genesis, GENESIS);
  assert.equal(snapshot.links, 1);
  assert.equal(snapshot.intact, true);
  assert.equal(snapshot.entries[0].payload.fingerprint, '9C4E8A2B1D3F');
});

test('clock and digest formatting stay compact', () => {
  const stamp = new Date(2026, 10, 10, 9, 5, 7).toISOString();

  assert.equal(formatClock(stamp), '09:05:07');
  assert.equal(formatClock('not-a-date'), '--:--:--');
  assert.equal(shortHash('9c4e8a2b1d3f', 8), '9C4E8A2B');
  assert.equal(shortHash('', 8), '');
});
