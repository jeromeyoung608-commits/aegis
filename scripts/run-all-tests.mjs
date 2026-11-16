// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
/**
 * run-all-tests.mjs — zero-dependency test aggregator for Aegis.
 *
 * Walks `aegis-shell/` and `modules/<name>/` for any file ending in
 * .test.mjs / .test.cjs / .test.js and runs them all with a single
 * `node --test <files...>` invocation (passing explicit file paths avoids the
 * directory-mode loader quirk on this Node build). Exits non-zero if ANY
 * module's suite fails, so `npm test` is a reliable gate.
 */
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SUFFIXES = ['.test.mjs', '.test.cjs', '.test.js'];

// Browser-driven E2E (Playwright) needs a real browser with GPU/WASM. Headless here it
// never settles — it held the old aggregator open for 12+ minutes. The default gate is
// unit-only; run the browser suite explicitly on a machine that has a browser.
const BROWSER_ONLY = /\/tests\/e2e\.test\.cjs$/;
const skipped = [];

function findTests(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...findTests(p));
    else if (SUFFIXES.some((s) => name.endsWith(s))) {
      if (BROWSER_ONLY.test(p)) skipped.push(p);
      else out.push(p);
    }
  }
  return out;
}

// 'adapters' is a root too: adapters/tsa-rfc3161/tests/rfc3161.test.mjs is a
// real suite (9 tests: DER encoding, TSTInfo parsing, fail-safe on an
// unreachable TSA, mock-TSA round trip). It sat outside the old roots, so
// `npm test` never ran it — the adapter was shipped with untested code.
const roots = [
  join(root, 'aegis-shell'),
  join(root, 'modules'),
  join(root, 'adapters'),
].filter(existsSync);
let files = [];
for (const r of roots) files.push(...findTests(r));

if (files.length === 0) {
  console.log('[run-all-tests] no test files discovered');
  process.exit(0);
}

console.log(`[run-all-tests] discovered ${files.length} test file(s)`);
if (skipped.length) {
  console.log(`[run-all-tests] skipped ${skipped.length} browser-only file(s) (needs a real browser):`);
  for (const s of skipped) console.log(`  · ${s.slice(root.length + 1)}`);
}
const res = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
const code = res.status ?? 1;
console.log(`[run-all-tests] ${code === 0 ? 'ALL GREEN' : 'FAILURES PRESENT'} (exit ${code})`);
process.exit(code);
