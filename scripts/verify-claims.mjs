#!/usr/bin/env node
// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// scripts/verify-claims.mjs — AEG-22 regression gate.
//
// Marketing shorthand must not re-enter user-facing copy. Lines that explicitly
// deny the claim (NOT / no / instead / wrong / historical) are allowed, because
// the honest wording baseline requires those denials to be visible.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('..', import.meta.url)));
const BASELINE = 'docs/CLAIMS-WORDING.md';

// Deliberately narrow: real over-claims, not the words themselves.
const FORBIDDEN = [
  { re: /\bforward secrecy\b/i, label: 'forward secrecy (one session key, fresh IVs only)' },
  { re: /\bblind signature\b/i, label: 'blind signature (this is detached hash signing)' },
  { re: /\bblind-sign\b/i, label: 'blind-sign (this is detached hash signing)' },
  { re: /\bblind property\b/i, label: 'blind property (say detached property)' },
  { re: /\bimmutable\b/i, label: 'immutable (hash chains are tamper-evident)' },
  { re: /\bProve\b[^\n]{0,12}\bwho signed it\b/i, label: 'prove who signed it (self-asserted key)' },
  { re: /\bRole views are enforced\b/i, label: 'role views enforced (UI only, not access control)' },
];
// A denial on the same line makes the occurrence an explicit correction.
const DENIAL = /\b(?:not|never|no|instead|wrong|historical|isn't|is not|nor|avoid|forbidden)\b/i;
const SKIP_DIRS = new Set(['node_modules', 'vendor', 'dist', '.git', 'video-tool']);
const SCAN_EXT = new Set(['.md', '.html', '.js', '.mjs', '.json', '.css']);

function walk(dir, acc) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name) && !e.name.startsWith('.')) walk(p, acc);
    } else if (e.isFile() && SCAN_EXT.has(e.name.slice(e.name.lastIndexOf('.')))) {
      acc.push(p);
    }
  }
}

if (!existsSync(join(ROOT, BASELINE))) {
  console.error(`[claims] FAIL — normative wording baseline missing: ${BASELINE}`);
  process.exit(1);
}

const files = [];
for (const top of ['aegis-shell', 'modules', 'adapters', 'docs', 'README.md', 'DELIVERY_REPORT.md']) {
  const p = join(ROOT, top);
  if (!existsSync(p)) continue;
  if (statSync(p).isFile()) files.push(p);
  else walk(p, files);
}

const violations = [];
for (const f of files) {
  const rel = relative(ROOT, f).replace(/\\/g, '/');
  if (rel === BASELINE || rel.endsWith('TEST_REPORT.md')) continue;
  // Translations are exempt: claims wording is judged on the English original,
  // which is the authoritative text; a translation carries its own language.
  if (/\.(de|fr|es)\.md$/.test(rel)) continue;
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (DENIAL.test(line)) return;
    for (const { re, label } of FORBIDDEN) {
      if (re.test(line)) {
        violations.push(`${rel}:${i + 1} — ${label}\n    ${line.trim().slice(0, 140)}`);
      }
    }
  });
}

if (violations.length) {
  console.error(`[claims] FAIL — ${violations.length} over-claim(s) in user-facing copy:`);
  for (const v of violations) console.error('  ' + v);
  process.exit(1);
}
console.log(`[claims] PASS — ${files.length} files scanned; no forbidden claims. Baseline: ${BASELINE}`);
process.exit(0);
