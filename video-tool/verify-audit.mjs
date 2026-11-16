// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// Verify the audit-trail concurrency fix (cross-tab write lease) and the
// optional RFC 3161 TSA anchor interface. Pure Node — uses a shared in-memory
// "localStorage" mock so two AuditTrail instances behave like two browser tabs.
import assert from 'node:assert';
import { AuditTrail, createTsaAnchorProvider } from '../modules/audit-timeline/src/trail.js';

function makeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

// ── 1. Cross-tab concurrency: two tabs appending in parallel must not clobber.
{
  const storage = makeStorage();
  const t1 = new AuditTrail({ storage, now: () => new Date('2026-01-01T00:00:00Z') });
  const t2 = new AuditTrail({ storage, now: () => new Date('2026-01-01T00:00:00Z') });
  await t1.load();
  await t2.load();
  const N = 25;
  const writes = [
    ...Array.from({ length: N }, (_, i) => t1.append({ actor: 'Tab-A', event: 'a' + i })),
    ...Array.from({ length: N }, (_, i) => t2.append({ actor: 'Tab-B', event: 'b' + i })),
  ];
  await Promise.all(writes);

  // Reload from the shared storage — the source of truth.
  const t3 = new AuditTrail({ storage });
  await t3.load();
  assert.strictEqual(t3.entries.length, 2 * N, `expected ${2 * N} links, got ${t3.entries.length}`);
  assert.strictEqual(t3.brokenAt, null, 'chain must remain intact under concurrent writes');
  const actors = new Set(t3.entries.map((e) => e.payload.actor));
  assert.deepStrictEqual([...actors].sort(), ['Tab-A', 'Tab-B'], 'both tabs must be present');
  console.log(`[AUDIT concurrency] PASS — ${t3.entries.length} links, intact, both tabs present`);
}

// ── 2. TSA anchor: provider injection + snapshot carries the anchor.
{
  const storage = makeStorage();
  const t = new AuditTrail({ storage });
  await t.load();
  await t.append({ actor: 'X', event: 'setup' });

  let capturedHead = null;
  t.setAnchorProvider(async (head) => {
    capturedHead = head;
    return { token: 'MOCK-TS-TOKEN', tsa: 'mock-tsa', at: '2026-01-01T00:00:00Z' };
  });
  const anchor = await t.anchorChainToTSA();
  assert.strictEqual(anchor.head, t.head, 'anchor must record the current chain head');
  assert.strictEqual(anchor.token, 'MOCK-TS-TOKEN');
  assert.strictEqual(capturedHead, t.head);
  assert.strictEqual(t.snapshot().tsaAnchor.token, 'MOCK-TS-TOKEN', 'snapshot must include tsaAnchor');
  console.log(`[AUDIT tsa] PASS — head ${t.head.slice(0, 12)}… anchored, snapshot carries token`);

  // No provider configured → must reject loudly, not silently skip.
  const t2 = new AuditTrail({ storage });
  let threw = false;
  try { await t2.anchorChainToTSA(); } catch { threw = true; }
  assert.strictEqual(threw, true, 'anchorChainToTSA must throw without a provider');
  console.log('[AUDIT tsa] PASS — throws when no provider configured');

  // createTsaAnchorProvider is the documented factory (transport-agnostic).
  assert.strictEqual(typeof createTsaAnchorProvider, 'function');
  let rejected = false;
  try { createTsaAnchorProvider(''); } catch { rejected = true; }
  assert.strictEqual(rejected, true, 'factory must require a URL');
  console.log('[AUDIT tsa] PASS — createTsaAnchorProvider factory validated');
}

console.log('\n[AUDIT] ALL PASS');
process.exit(0);
