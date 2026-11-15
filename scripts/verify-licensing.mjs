// scripts/verify-licensing.mjs
// Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
//
// Licensing gate (REUSE-aligned). Every first-party source file must carry BOTH:
//   1. the Aegis copyright line, and
//   2. an SPDX-License-Identifier: Apache-2.0 line.
// Vendored third-party code (under any `vendor/` dir) is intentionally excluded.
//
// Also checks that every first-party LICENSE is Apache-2.0 (not MIT/BSL), that
// first-party docs make no MIT claim, and that customer-facing docs no longer
// describe Aegis as BSL / source-available / not open source.
//
//   node scripts/verify-licensing.mjs          # report + exit non-zero on misses
//   node scripts/verify-licensing.mjs --fix    # inject the missing SPDX line
//
// Wire into `npm test` so licensing coverage can never silently regress.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const COPYRIGHT = 'Copyright (c) 2026 Jerome Young (Yang Jie)';
const SPDX = 'Apache-2.0';
const SPDX_LINE = `SPDX-License-Identifier: ${SPDX}`;
const TARGET_EXT = new Set(['.js', '.mjs', '.cjs', '.ts', '.css', '.html']);
const SKIP_DIRS = new Set(['node_modules', 'vendor', 'dist', 'build', '.git', '_audit']);
const ROOT = process.cwd();

// First-party docs must not claim Aegis itself is MIT. Third-party MIT facts
// (NOTICE, DEPENDENCY_AUDIT, vendor) don't use these phrases and are excluded.
const MIT_CLAIM_PATTERNS = [
  /\*\*MIT License\*\*/,
  /MIT — kommerzielle/,
  /free for any use/i,
  /Any use is permitted, commercial included/i,
];

// Customer-facing docs must not describe the old BSL / source-available model.
// Third-party and internal dirs are skipped by walk(); CHANGELOG history lines
// are exempted because they accurately record the license change.
const BSL_CLAIM_PATTERNS = [
  /BUSL-1\.1/,
  /BSL-1\.1/,
  /Business Source License/i,
  /source-available/i,
  /not open source/i,
];
const isChangelog = (rel) => basename(rel).toLowerCase() === 'changelog.md';

function walk(dir, out, exts) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === 'vendor') continue; // third-party — excluded by design
      walk(p, out, exts);
    } else if (exts.has(extname(name))) {
      out.push(p);
    }
  }
}

const files = [];
walk(ROOT, files, TARGET_EXT);

// ── doc claim gates over first-party markdown ────────────────────────────────
const mdFiles = [];
walk(ROOT, mdFiles, new Set(['.md']));
const mitClaimProblems = [];
const bslClaimProblems = [];
for (const f of mdFiles) {
  const rel = f.replace(ROOT + '/', '');
  // Translations are exempt: the English original is the authoritative text, and
  // a translation carries the wording of its own language, not the English one.
  if (/\.(de|fr|es)\.md$/.test(rel)) continue;
  const lines = readFileSync(f, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const mitHit = MIT_CLAIM_PATTERNS.find((re) => re.test(line));
    if (mitHit) mitClaimProblems.push({ f: rel, line: i + 1, pattern: String(mitHit) });
    if (!isChangelog(rel)) {
      const bslHit = BSL_CLAIM_PATTERNS.find((re) => re.test(line));
      if (bslHit) bslClaimProblems.push({ f: rel, line: i + 1, pattern: String(bslHit) });
    }
  }
}

function spdxLiteral(ext) {
  if (ext === '.html') return `<!-- ${SPDX_LINE} -->`;
  if (ext === '.css') return `/* ${SPDX_LINE} */`;
  return `// ${SPDX_LINE}`;
}

// First-party files intentionally not under Apache (e.g. MIT/Apache test
// fixtures that must stay that way) can be listed here as repo-relative paths.
const EXEMPT = new Set([
  // e.g. 'modules/x/test/fixtures/sample.js',
]);
const scoped = files.filter((f) => !EXEMPT.has(f.replace(ROOT + '/', '')));

// ── LICENSE-file gate ────────────────────────────────────────────────────────
// Every first-party LICENSE must be Apache-2.0: either the verbatim full text
// (root) or a short SPDX pointer. Third-party vendor LICENSE files are NOT
// checked — they keep their upstream license and copyright.
function firstPartyLicenseFiles() {
  const out = [join(ROOT, 'LICENSE')];
  const shell = join(ROOT, 'aegis-shell', 'LICENSE');
  if (existsSync(shell)) out.push(shell);
  const modsDir = join(ROOT, 'modules');
  if (existsSync(modsDir)) {
    for (const e of readdirSync(modsDir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const p = join(modsDir, e.name, 'LICENSE');
      if (existsSync(p)) out.push(p);
    }
  }
  return out;
}
const licenseFiles = firstPartyLicenseFiles();
const licenseProblems = [];
for (const lf of licenseFiles) {
  const t = readFileSync(lf, 'utf8');
  const isApache = t.includes('Apache License') && (t.includes('Version 2.0') || t.includes(SPDX));
  const isBsl = t.includes('BUSL-1.1') || t.includes('Business Source License');
  const isMit = /MIT License/.test(t) || /Permission is hereby granted, free of charge/.test(t);
  if (!isApache || isBsl || isMit) licenseProblems.push({ f: lf, isApache, isBsl, isMit });
}

// ── source header gate ───────────────────────────────────────────────────────
const problems = [];
for (const f of scoped) {
  const head = readFileSync(f, 'utf8').split('\n').slice(0, 6).join('\n');
  const hasCopy = head.includes(COPYRIGHT);
  const hasSpdx = head.includes(SPDX);
  if (!hasCopy || !hasSpdx) problems.push({ f, hasCopy, hasSpdx });
}

function printFailures() {
  if (bslClaimProblems.length) {
    console.log(`[licensing] FAIL — ${bslClaimProblems.length} customer doc BSL/source-available claim(s) (Apache relicensing incomplete):`);
    for (const { f, line, pattern } of bslClaimProblems) console.log(`  - ${f}:${line} (${pattern})`);
  }
  if (mitClaimProblems.length) {
    console.log(`[licensing] FAIL — ${mitClaimProblems.length} first-party doc MIT claim(s):`);
    for (const { f, line, pattern } of mitClaimProblems) console.log(`  - ${f}:${line} (${pattern})`);
  }
  if (licenseProblems.length) {
    console.log(`[licensing] FAIL — ${licenseProblems.length} first-party LICENSE file(s) not Apache-2.0:`);
    for (const { f, isApache, isBsl, isMit } of licenseProblems) {
      const why = [];
      if (!isApache) why.push('missing Apache-2.0');
      if (isBsl) why.push('contains BSL text');
      if (isMit) why.push('contains MIT text');
      console.log('  -', f.replace(ROOT + '/', ''), `(${why.join(' + ')})`);
    }
  }
  if (problems.length) {
    console.log(`[licensing] FAIL — ${problems.length} of ${scoped.length} first-party files missing required licensing metadata:`);
    for (const { f, hasCopy, hasSpdx } of problems) {
      const miss = [];
      if (!hasCopy) miss.push('copyright');
      if (!hasSpdx) miss.push('SPDX');
      console.log('  -', f.replace(ROOT + '/', ''), `(${miss.join(' + ')})`);
    }
  }
}
const allOk = () => problems.length === 0 && licenseProblems.length === 0 && mitClaimProblems.length === 0 && bslClaimProblems.length === 0;

const fix = process.argv.includes('--fix');
if (fix) {
  let fixed = 0;
  for (const { f, hasCopy, hasSpdx } of problems) {
    if (hasCopy && !hasSpdx) {
      const lines = readFileSync(f, 'utf8').split('\n');
      const cIdx = lines.findIndex((l) => l.includes(COPYRIGHT));
      if (cIdx === -1) continue; // copyright missing — verify-headers owns that
      lines.splice(cIdx + 1, 0, spdxLiteral(extname(f)));
      writeFileSync(f, lines.join('\n'));
      fixed++;
    }
  }
  console.log(`[licensing] injected SPDX into ${fixed} file(s).`);
  if (fixed > 0) {
    let still = 0;
    for (const p of problems) {
      if (!p.hasCopy) continue;
      if (!readFileSync(p.f, 'utf8').split('\n').slice(0, 6).join('\n').includes(SPDX)) {
        console.log('  STILL MISSING SPDX:', p.f.replace(ROOT + '/', ''));
        still++;
      }
    }
    console.log(still === 0 ? '[licensing] ALL COVERED' : `[licensing] ${still} still missing`);
  }
  if (!allOk()) printFailures();
  if (allOk()) console.log('[licensing] PASS — all licensing gates satisfied.');
  process.exit(allOk() ? 0 : 1);
}

if (allOk()) {
  console.log(`[licensing] PASS — ${scoped.length} first-party source files carry copyright + ${SPDX}; ${licenseFiles.length} first-party LICENSE files are Apache-2.0; ${mdFiles.length} docs free of MIT/BSL claims (third-party vendor LICENSEs untouched).`);
  process.exit(0);
}
printFailures();
process.exit(1);
