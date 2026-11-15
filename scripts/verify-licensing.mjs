// scripts/verify-licensing.mjs
// Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
//
// Licensing gate (REUSE-aligned). Every first-party source file must carry BOTH:
//   1. the Aegis copyright line, and
//   2. an SPDX-License-Identifier: BUSL-1.1 line.
// Vendored third-party code (under any `vendor/` dir) is intentionally excluded.
//
//   node scripts/verify-licensing.mjs          # report + exit non-zero on misses
//   node scripts/verify-licensing.mjs --fix    # inject the missing SPDX line
//
// Wire into `npm test` so licensing coverage can never silently regress.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const COPYRIGHT = 'Copyright (c) 2026 Jerome Young (Yang Jie)';
const SPDX = 'BUSL-1.1';
const SPDX_LINE = `SPDX-License-Identifier: ${SPDX}`;
const TARGET_EXT = new Set(['.js', '.mjs', '.cjs', '.ts', '.css', '.html']);
const SKIP_DIRS = new Set(['node_modules', 'vendor', 'dist', 'build', '.git', '_audit']);
const ROOT = process.cwd();

// First-party docs must not tell customers Aegis itself is MIT or free for
// commercial use. These are the exact claim shapes that were found in module
// READMEs/reports; third-party MIT facts (NOTICE, DEPENDENCY_AUDIT, vendor) do
// not use these phrases and are excluded by directory/skip rules.
const MIT_CLAIM_PATTERNS = [
  /\*\*MIT License\*\*/,
  /MIT — kommerzielle/,
  /free for any use/i,
  /Any use is permitted, commercial included/i,
];

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

// ── MIT-claim gate over first-party markdown docs ────────────────────────────
const mdFiles = [];
walk(ROOT, mdFiles, new Set(['.md']));
const mitClaimProblems = [];
for (const f of mdFiles) {
  const rel = f.replace(ROOT + '/', '');
  const text = readFileSync(f, 'utf8');
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const hit = MIT_CLAIM_PATTERNS.find((re) => re.test(lines[i]));
    if (hit) mitClaimProblems.push({ f: rel, line: i + 1, pattern: String(hit) });
  }
}

function spdxLiteral(ext) {
  if (ext === '.html') return `<!-- ${SPDX_LINE} -->`;
  if (ext === '.css') return `/* ${SPDX_LINE} */`;
  return `// ${SPDX_LINE}`;
}

// First-party files that are intentionally not under the BSL (e.g. test fixtures
// that must stay MIT/Apache to be valid test inputs) can be listed here as repo
// relative paths to exclude from the gate.
const EXEMPT = new Set([
  // e.g. 'modules/x/test/fixtures/sample.js',
]);

const scoped = files.filter((f) => !EXEMPT.has(f.replace(ROOT + '/', '')));

// ── LICENSE-file gate: a module shipping its own MIT/Apache LICENSE overrides
// the repo-root BSL in the eyes of a customer. Check every first-party LICENSE
// file itself, not just source headers. Third-party vendor LICENSE files (under
// any `vendor/` or `node_modules/`) are intentionally NOT checked — they must
// keep their upstream license and upstream copyright.
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
  const isBsl = t.includes('BUSL-1.1') || t.includes('Business Source License');
  const isMit = /MIT License/.test(t) || /Permission is hereby granted, free of charge/.test(t);
  if (!isBsl || isMit) licenseProblems.push({ f: lf, isBsl, isMit });
}

const problems = [];
for (const f of scoped) {
  const text = readFileSync(f, 'utf8');
  const head = text.split('\n').slice(0, 6).join('\n');
  const hasCopy = head.includes(COPYRIGHT);
  const hasSpdx = head.includes(SPDX);
  if (!hasCopy || !hasSpdx) problems.push({ f, hasCopy, hasSpdx });
}

const fix = process.argv.includes('--fix');
if (fix) {
  let fixed = 0;
  for (const { f, hasCopy, hasSpdx } of problems) {
    if (hasCopy && !hasSpdx) {
      const text = readFileSync(f, 'utf8');
      const lines = text.split('\n');
      const ext = extname(f);
      // Find the copyright line index (first line containing the copyright string).
      const cIdx = lines.findIndex((l) => l.includes(COPYRIGHT));
      if (cIdx === -1) continue; // copyright missing — verify-headers owns that
      lines.splice(cIdx + 1, 0, spdxLiteral(ext));
      writeFileSync(f, lines.join('\n'));
      fixed++;
    }
  }
  console.log(`[licensing] injected SPDX into ${fixed} file(s).`);
  if (fixed > 0) {
    // re-evaluate
    let still = 0;
    for (const { f, hasCopy, hasSpdx } of problems) {
      if (!hasCopy) continue; // not our job here
      const t = readFileSync(f, 'utf8');
      if (!t.split('\n').slice(0, 6).join('\n').includes(SPDX)) {
        console.log('  STILL MISSING SPDX:', f.replace(ROOT + '/', ''));
        still++;
      }
    }
    console.log(still === 0 ? '[licensing] ALL COVERED' : `[licensing] ${still} still missing`);
    const licensedOk = licenseProblems.length === 0;
    const docsOk = mitClaimProblems.length === 0;
    if (!docsOk) {
      console.log(`[licensing] FAIL — ${mitClaimProblems.length} first-party doc MIT claim(s):`);
      for (const { f, line, pattern } of mitClaimProblems) console.log(`  - ${f}:${line} (${pattern})`);
    }
    if (!licensedOk) {
      console.log(`[licensing] FAIL — ${licenseProblems.length} first-party LICENSE file(s) not BSL-compliant:`);
      for (const { f, isBsl, isMit } of licenseProblems) {
        const why = [];
        if (!isBsl) why.push('missing BUSL-1.1');
        if (isMit) why.push('contains MIT text');
        console.log('  -', f.replace(ROOT + '/', ''), `(${why.join(' + ')})`);
      }
    }
    process.exit(still === 0 && licensedOk && docsOk ? 0 : 1);
  }
  process.exit(licenseProblems.length === 0 && mitClaimProblems.length === 0 ? 0 : 1);
}

if (problems.length === 0 && licenseProblems.length === 0 && mitClaimProblems.length === 0) {
  console.log(`[licensing] PASS — ${scoped.length} first-party source files carry copyright + ${SPDX}; ${licenseFiles.length} first-party LICENSE files are BSL; ${mdFiles.length} docs free of MIT claims (third-party vendor LICENSEs untouched).`);
  process.exit(0);
}
if (mitClaimProblems.length) {
  console.log(`[licensing] FAIL — ${mitClaimProblems.length} first-party doc MIT claim(s) conflicting with BSL:`);
  for (const { f, line, pattern } of mitClaimProblems) console.log(`  - ${f}:${line} (${pattern})`);
}
if (licenseProblems.length) {
  console.log(`[licensing] FAIL — ${licenseProblems.length} first-party LICENSE file(s) not BSL-compliant:`);
  for (const { f, isBsl, isMit } of licenseProblems) {
    const why = [];
    if (!isBsl) why.push('missing BUSL-1.1');
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
process.exit(1);
