#!/usr/bin/env node
// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
// Aegis safe uninstall — removes RUNTIME artifacts only (data, audit, generated
// TLS, local config). It NEVER touches source, docs, or the git checkout.
//
// Usage:
//   node scripts/uninstall.mjs           # interactive (asks before deleting)
//   node scripts/uninstall.mjs --yes     # non-interactive, delete now
//   node scripts/uninstall.mjs --dry-run # show what would be removed
import { existsSync, rmSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';

const ROOT = resolve(process.cwd());
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const YES = args.includes('--yes');

// Runtime artifacts Aegis creates. All under the project root; none are source.
const TARGETS = [
  'data',        // SQLite store + bundle cache
  '_audit',      // audit trail export scratch
  'tls',         // auto-generated server cert/key (if any)
  'config/local.json', // locally generated issuer secret (if any)
];

// Never remove anything outside ROOT, and never match source/docs directories.
const FORBIDDEN = new Set(['server.js', 'server', 'aegis-shell', 'modules', 'scripts', 'docs', 'config', 'video-tool', '.git']);

function resolveTarget(t) {
  const p = resolve(ROOT, t);
  if (!p.startsWith(ROOT)) throw new Error(`refusing to touch ${t} (outside root)`);
  return p;
}

const found = TARGETS.map((t) => ({ t, p: resolveTarget(t), exists: existsSync(resolveTarget(t)) }))
  .filter((x) => x.exists);

console.log('Aegis uninstall — runtime artifacts only (source/docs are NOT touched).');
if (found.length === 0) {
  console.log('Nothing to remove — no runtime artifacts found.');
  process.exit(0);
}
console.log('Will remove:');
for (const x of found) console.log(`  · ${x.t}`);

if (DRY) { console.log('(dry-run) no changes made.'); process.exit(0); }

if (!YES) {
  const { createInterface } = await import('node:readline');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ans = await new Promise((r) => rl.question('Proceed? [y/N] ', r));
  rl.close();
  if (!/^y(es)?$/i.test(ans.trim())) { console.log('Aborted.'); process.exit(0); }
}

for (const x of found) {
  rmSync(x.p, { recursive: true, force: true });
  console.log(`removed ${x.t}`);
}
console.log('Done. If Aegis is running as a service, stop it separately:');
console.log('  docker stop <container>    # container deployment');
console.log('  systemctl stop aegis       # systemd (if installed)');
console.log('Source and docs remain intact — re-run `npm run setup && npm start` to redeploy.');
