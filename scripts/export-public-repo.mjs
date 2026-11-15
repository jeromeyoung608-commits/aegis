#!/usr/bin/env node
// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
// scripts/export-public-repo.mjs — build the PUBLIC repository from the private one.
//
// The private repo carries internal material (attorney notes, audits listing
// "claims do not match the tree", promo pipeline, media). Apache-2.0 promises
// the customer may read the source, so what we publish must not contain it.
// Rewriting private history is forbidden; deleting the internal files would
// destroy the audit trail. So the two repos are SEPARATE:
//
//   private  ~/Documents/Aegis          full history + internal material (never pushed)
//   public   ~/Documents/Aegis-public   fresh history, publishable surface only
//
// The public tree = git-tracked files minus an explicit deny list. Nothing is
// deleted from the working tree; nothing is committed to the private repo here.
//
//   node scripts/export-public-repo.mjs                       # -> ../Aegis-public
//   node scripts/export-public-repo.mjs --out /tmp/aegis-pub  # elsewhere
//   node scripts/export-public-repo.mjs --dry-run             # list only
//   node scripts/export-public-repo.mjs --no-commit           # skip the commit
//
// Zero dependencies: node: built-ins only.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const argVal = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const OUT = path.resolve(ROOT, argVal('--out', path.join(ROOT, '..', 'Aegis-public')));
const DRY = args.includes('--dry-run');
const NO_COMMIT = args.includes('--no-commit');

// Deny list — internal material, promo pipeline, media, secrets.
// Anything NOT denied here is published, so keep it explicit and reviewable.
const DENY_PREFIX = [
  '_audit/',
  'docs/AUDIT-',
  'AEGIS_',
  'video-tool/src/',
  'video-tool/public/',
  'video-tool/assets/',
  'video-tool/artifacts/',
  'video-tool/out/',
  'modules/doc-redactor/.trae-html-share-packages/',
  'data/',
];
const DENY_FILE = [
  'video-tool/capture.mjs',
  'video-tool/durations.mjs',
  'video-tool/tts.mjs',
  'video-tool/package.json',
  'video-tool/package-lock.json',
  'config/local.json',
];
const DENY_EXT = new Set(['.mp3', '.mp4', '.mov', '.webm', '.m4a', '.wav', '.tgz', '.zip',
  '.7z', '.pem', '.key', '.crt', '.p12', '.pfx', '.pcap', '.log', '.pyc', '.db',
  '.db-shm', '.db-wal', '.sqlite', '.sqlite3', '.DS_Store']);
const DENY_BASENAME = new Set(['pre-patch.tgz', 'pre-p3.tgz', 'package-lock.json.bak']);
const DENY_RE = [/^video-tool\/probe.*\.mjs$/];

const denied = (rel) =>
  DENY_PREFIX.some((p) => rel.startsWith(p)) ||
  DENY_FILE.includes(rel) ||
  DENY_EXT.has(path.extname(rel).toLowerCase()) ||
  DENY_BASENAME.has(path.basename(rel)) ||
  DENY_RE.some((re) => re.test(rel));

// Precise on purpose. A broad /attorney/i would false-positive on the customer-facing
// "have a qualified EU attorney review it" note and on product dictionaries.
const INTERNAL_MARKERS = [
  /LAWYER[- ]NOTE/i,        // attorney working notes
  /does not match the tree/i,
  /claims do not match/i,
];
// Path-shaped references are a leak only in prose. The packer and the export
// script legitimately name these paths in order to EXCLUDE them.
const PATH_MARKERS = [/_audit\//, /docs\/AUDIT-/];
// BSL wording is a leak in CUSTOMER DOCS only. The gate script legitimately carries
// these strings as the patterns it forbids, and CHANGELOG keeps the licence history.
const BSL_MARKERS = [/BUSL-1\.1/i, /BSL-1\.1/i, /Business Source License/i,
  /source-available/i, /not open source/i];
const isCustomerDoc = (rel) =>
  /\.md$/i.test(rel) && !isChangelog(rel) && !rel.startsWith('scripts/');
const isChangelog = (rel) => path.basename(rel).toLowerCase() === 'changelog.md';

function selfCheck(files) {
  const problems = [];
  for (const rel of files) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue;
    const st = fs.statSync(abs);
    const legitBig = /^modules\/doc-redactor\/vendor\/(tessdata|tesseract-core)\//.test(rel);
    if (!legitBig && st.size > 2 * 1024 * 1024) {
      problems.push(rel + ' — ' + (st.size / 1048576).toFixed(1) + ' MiB, not a known runtime asset');
    }
    if (/\.(md|json|txt|js|mjs|html|css|yml|yaml)$/.test(rel)) {
      const text = fs.readFileSync(abs, 'utf8');
      // Scripts legitimately name the very phrases they forbid, so the prose
      // markers are checked in documents only — otherwise this script would
      // flag itself.
      if (!rel.startsWith('scripts/')) {
        for (const re of INTERNAL_MARKERS) {
          if (!re.test(text)) continue;
          const hit = text.match(new RegExp(re.source, 'i'));
          problems.push(rel + ' — internal marker ' + (hit ? hit[0] : re.source));
          break;
        }
      }
      if (isCustomerDoc(rel)) {
        for (const re of PATH_MARKERS) {
          if (!re.test(text)) continue;
          const flags = re.flags.replace(/g/g, '');
          const hit = text.match(new RegExp(re.source, flags.includes('m') ? flags : flags + 'm'));
          problems.push(rel + ' — internal path referenced: ' + (hit ? hit[0] : re.source));
          break;
        }
        for (const re of BSL_MARKERS) {
          if (!re.test(text)) continue;
          const hit = text.match(new RegExp(re.source, 'i'));
          problems.push(rel + ' — BSL wording in customer doc: ' + (hit ? hit[0] : re.source));
          break;
        }
      }
    }
  }
  return problems;
}

const all = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 })
  .toString('utf8').split('\0').filter(Boolean);
const publish = all.filter((rel) => !denied(rel));
const skipped = all.filter((rel) => denied(rel));
const sizeOf = (rel) => {
  const abs = path.join(ROOT, rel);
  return fs.existsSync(abs) && fs.statSync(abs).isFile() ? fs.statSync(abs).size : 0;
};
const payloadBytes = publish.reduce((n, rel) => n + sizeOf(rel), 0);

console.log('[export] source      ' + ROOT);
console.log('[export] destination ' + OUT);
console.log('[export] tracked ' + all.length + ' → publish ' + publish.length + ', withhold ' + skipped.length);
console.log('[export] publish payload ' + (payloadBytes / 1048576).toFixed(1) + ' MiB');
if (skipped.length) {
  const grouped = new Map();
  for (const rel of skipped) {
    const key = path.dirname(rel) === '.' ? rel : path.dirname(rel);
    grouped.set(key, (grouped.get(key) || 0) + 1);
  }
  console.log('[export] withheld (internal / promo / media / secret):');
  for (const [k, n] of [...grouped.entries()].sort()) console.log('  - ' + k + (n > 1 ? ' (' + n + ' files)' : ''));
}

const problems = selfCheck(publish);
if (problems.length) {
  console.error('[export] FAIL — internal material would be published:');
  for (const p of problems) console.error('  ! ' + p);
  process.exit(1);
}
console.log('[export] self-check PASS — no internal material, no oversized leftovers');
if (DRY) {
  console.log('[export] dry-run: nothing written.');
  process.exit(0);
}
if (OUT.startsWith(ROOT + path.sep)) {
  console.error('[export] FAIL — destination must be OUTSIDE the private repo');
  process.exit(1);
}

// Sync in place instead of deleting the destination: recursive removal of a
// directory outside the workspace is a destructive operation that some IDEs
// refuse to run unattended. Stale files are unlinked one by one, and the old
// .git is moved aside so the public repo gets a fresh history.
fs.mkdirSync(OUT, { recursive: true });
const oldGit = path.join(OUT, '.git');
if (fs.existsSync(oldGit)) {
  const parked = path.join(os.tmpdir(), 'aegis-public-git-old-' + Date.now());
  fs.renameSync(oldGit, parked);
  console.log('[export] previous .git moved aside to ' + parked);
}
// Remove files that are no longer part of the publish set (one by one).
const keep = new Set(publish);
let removed = 0;
const stale = [];
(function scan(dir, rel) {
  for (const name of fs.readdirSync(dir)) {
    if (name === '.git') continue;
    const abs = path.join(dir, name);
    const r = rel ? rel + '/' + name : name;
    if (fs.statSync(abs).isDirectory()) scan(abs, r);
    else if (!keep.has(r)) stale.push(abs);
  }
})(OUT, '');
for (const f of stale) {
  fs.unlinkSync(f);
  removed++;
}
if (removed) console.log('[export] removed ' + removed + ' stale file(s) from the previous export');

let copied = 0;
for (const rel of publish) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue;
  const dest = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(abs, dest);
  copied++;
}
console.log('[export] copied ' + copied + ' files');

// Fresh history in the public repo — one commit, no private history.
execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: OUT });
execFileSync('git', ['add', '-A'], { cwd: OUT });
const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
if (!NO_COMMIT) {
  execFileSync('git', ['commit', '-q', '-m',
    'AEGIS v' + version + ' — open-source release under Apache-2.0\n\n' +
    'Local-first, zero-dependency collaboration workbench for classified\n' +
    'industrial documents: redaction, signing, P2P delivery, encrypted vault\n' +
    'and tamper-evident audit — all on the operator\'s machine.\n\n' +
    'Software is free for any use, including commercial. Paid support and\n' +
    'services are optional (see PRICING.md).\n'], { cwd: OUT });
  execFileSync('git', ['tag', '-a', 'v' + version, '-m', 'AEGIS ' + version + ' (Apache-2.0, open source)'], { cwd: OUT });
}
const head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: OUT, encoding: 'utf8' }).trim();
console.log('[export] public repo ready: ' + OUT);
console.log('[export] branch main, HEAD ' + head + (NO_COMMIT ? ' (commit skipped)' : ', tagged v' + version));
console.log('[export] next: cd ' + OUT + ' && git remote add origin <github-url> && git push -u origin main --tags');
