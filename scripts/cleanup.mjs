#!/usr/bin/env node
// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
// scripts/cleanup.mjs — safe teardown / uninstall helper for Aegis.
// SAFE BY DEFAULT: prints a plan and removes nothing unless --yes is passed.
//
//   node scripts/cleanup.mjs                 # dry run (shows what would go)
//   node scripts/cleanup.mjs --yes           # remove runtime artifacts
//   node scripts/cleanup.mjs --yes --all     # also remove TLS secrets + OPFS cache
//   node scripts/cleanup.mjs --yes --all --with-node-modules
//
// It ONLY ever removes runtime artifacts — the delivery build (dist/), the
// runtime SQLite data dir/db, the TLS key material under ~/.aegis, and the
// optional node_modules cache. SOURCE FILES ARE NEVER TOUCHED. Every candidate
// path is rejected unless it resolves inside the project root or ~/.aegis.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = new Set(process.argv.slice(2));
const apply = args.has('--yes');
const all = args.has('--all');
const withNode = args.has('--with-node-modules');

const dataDb = process.env.AEGIS_DB || path.join(ROOT, 'data', 'aegis.db');
const targets = [
  { label: 'delivery build (dist/)', p: path.join(ROOT, 'dist') },
  { label: 'runtime data dir', p: path.dirname(dataDb) },
  { label: 'runtime data db', p: dataDb },
];
if (all) {
  targets.push({ label: 'TLS secrets (~/.aegis/tls)', p: path.join(os.homedir(), '.aegis', 'tls') });
  targets.push({ label: 'vault OPFS cache (~/.aegis/opfs)', p: path.join(os.homedir(), '.aegis', 'opfs') });
  if (withNode) targets.push({ label: 'node_modules/', p: path.join(ROOT, 'node_modules') });
}

const home = path.join(os.homedir(), '.aegis');
function allowed(p) {
  const rp = path.resolve(p);
  return rp === ROOT || rp.startsWith(ROOT + path.sep) ||
         rp === home || rp.startsWith(home + path.sep);
}

console.log(`Aegis cleanup${apply ? '' : ' — DRY RUN (nothing removed; pass --yes to apply)'}`);
const toRemove = [];
for (const t of targets) {
  const rp = path.resolve(t.p);
  if (!allowed(rp)) { console.error(`  REFUSED (outside allowed roots): ${t.p}`); continue; }
  const exists = fs.existsSync(rp);
  console.log(`  [${exists ? 'present' : 'absent '}] ${t.label}: ${rp}`);
  if (exists) toRemove.push(rp);
}
if (!apply) {
  console.log('\nDry run complete. Re-run with --yes to actually remove the [present] paths.');
  process.exit(0);
}
if (toRemove.length === 0) { console.log('\nNothing to remove.'); process.exit(0); }

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const answer = await new Promise((res) =>
  rl.question(`Remove ${toRemove.length} path(s) listed above? Type YES to confirm: `, (a) => { rl.close(); res(a); }));
if (answer.trim() !== 'YES') { console.log('Aborted — no changes made.'); process.exit(0); }

for (const p of toRemove) {
  try {
    fs.rmSync(p, { recursive: true, force: true });
    console.log(`  removed: ${p}`);
  } catch (e) {
    console.error(`  FAILED: ${p} — ${e.message}`);
  }
}
console.log('\nCleanup complete. Source files are untouched; reinstall with `npm run setup` / `npm run pack:delivery`.');
