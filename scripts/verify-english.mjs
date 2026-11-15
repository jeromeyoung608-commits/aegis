#!/usr/bin/env node
// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
// scripts/verify-english.mjs — English-only gate for code and source documents.
//
// WHY: the product ships an English-only codebase (comments, strings, module
// interfaces) and the English documents are the authoritative text. German,
// French and Spanish exist only as `*.de.md` / `*.fr.md` / `*.es.md` files and
// in the console's i18n catalogue. A stray Chinese character in a comment or an
// English document is invisible to every other gate and slowly turns the
// codebase into a mixed-language tree.
//
// Scans: .js/.mjs/.html/.css/.json and the English source .md files.
// Excluded: vendor/**, node_modules/**, aegis-shell/src/i18n.js (the four
// console catalogues) and the translated documents themselves.
//
//   node scripts/verify-english.mjs
//
// Zero dependencies: node: built-ins only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CODE_EXT = new Set(['.js', '.mjs', '.html', '.css', '.json']);
const SKIP_DIRS = new Set(['node_modules', 'vendor', 'dist', 'build', '.git', '_audit', 'tmp']);
// The console's four UI catalogues are the one legitimate place for non-English
// strings — the tests guard their contents.
const CODE_EXEMPT = new Set([path.join('aegis-shell', 'src', 'i18n.js')]);
// Translated documents are non-English by design.
const isTranslation = (rel) => /\.(de|fr|es)\.md$/.test(rel);
// LICENSE, NOTICE and LICENSES/ are English-only by law.
const isLegalEnglish = (rel) => /(^|[/\\])(LICENSE|NOTICE)$/.test(rel) || rel.startsWith('LICENSES' + path.sep);

const CJK = /[\u3000-\u303F\u4E00-\u9FFF\uFF00-\uFFEF]/;

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(path.relative(ROOT, p));
  }
  return out;
}

const problems = [];
let scanned = 0;
for (const rel of walk(ROOT, [])) {
  const ext = path.extname(rel).toLowerCase();
  const isCode = CODE_EXT.has(ext);
  const isMd = ext === '.md';
  if (!isCode && !isMd) continue;
  if (isCode && CODE_EXEMPT.has(rel)) continue;
  if (isMd && (isTranslation(rel) || isLegalEnglish(rel))) continue;
  // Internal-only material is not published and is out of scope for this gate.
  if (/^(AEGIS_|docs\/AUDIT-)/.test(rel)) continue;
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue;
  const text = fs.readFileSync(abs, 'utf8');
  scanned++;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!CJK.test(lines[i])) continue;
    const hit = lines[i].match(CJK);
    problems.push(`${rel}:${i + 1} — non-English character "${hit[0]}" (U+${hit[0].codePointAt(0).toString(16).toUpperCase()})`);
  }
}

if (problems.length) {
  console.error(`[english] FAIL — ${problems.length} non-English character(s) in code or English documents:`);
  for (const p of problems.slice(0, 40)) console.error('  - ' + p);
  if (problems.length > 40) console.error(`  ... and ${problems.length - 40} more`);
  process.exit(1);
}
console.log(`[english] PASS — ${scanned} files, English-only enforced (i18n catalogs and translations excluded)`);
