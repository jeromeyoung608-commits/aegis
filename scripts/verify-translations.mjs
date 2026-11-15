#!/usr/bin/env node
// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
// scripts/verify-translations.mjs — four-language documentation gate.
//
// Checks that every English source document has a German, French and Spanish
// translation, that each translation carries the "English prevails" banner, and
// that the translated structure matches the English original exactly (heading
// count, code-fence count, table-row count).
//
// The manifest is rebuilt here instead of read from tmp/ — tmp/ is a scratch
// directory that is removed before the commit, so a gate that depended on it
// would fail on a clean checkout.
//
//   node scripts/verify-translations.mjs
//
// Zero dependencies: node: built-ins only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['de', 'fr', 'es'];
const SKIP_DIRS = new Set(['node_modules', 'vendor', 'dist', 'build', '.git', '_audit', 'tmp']);
// Internal-only material is not published, so it is not translated either.
const INTERNAL = /^(AEGIS_|docs\/AUDIT-)/;

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith('.md')) out.push(path.relative(ROOT, p));
  }
  return out;
}

const all = walk(ROOT, []).sort();
const sources = all.filter((rel) => {
  if (/(^|\/)(LICENSE|NOTICE|CHANGELOG\.md)$/.test(rel)) return false;
  if (/\.(de|fr|es)\.md$/.test(rel)) return false;
  if (INTERNAL.test(rel)) return false;
  return true;
});

const problems = [];
const stats = (text) => {
  const lines = text.split('\n');
  return {
    headings: lines.filter((l) => l.startsWith('#')).length,
    fences: (text.match(/```/g) || []).length,
    tables: lines.filter((l) => l.trim().startsWith('|')).length,
  };
};

for (const rel of sources) {
  const base = rel.replace(/\.md$/, '');
  const srcPath = path.join(ROOT, rel);
  const srcText = fs.readFileSync(srcPath, 'utf8');
  const srcStats = stats(srcText);
  for (const lang of LANGS) {
    const relTr = `${base}.${lang}.md`;
    const trPath = path.join(ROOT, relTr);
    if (!fs.existsSync(trPath)) {
      problems.push(`${relTr} — missing translation`);
      continue;
    }
    const trText = fs.readFileSync(trPath, 'utf8');
    // 1. banner within the first 20 lines
    const head = trText.split('\n').slice(0, 20).join('\n');
    if (!/English text prevails|binding text is the English version/.test(head)) {
      problems.push(`${relTr} — missing "English prevails" banner in the first 20 lines`);
    }
    // 2. structure alignment
    const trStats = stats(trText);
    for (const k of ['headings', 'fences', 'tables']) {
      if (trStats[k] !== srcStats[k]) {
        problems.push(`${relTr} — ${k}: ${trStats[k]} ≠ ${srcStats[k]} (English source)`);
      }
    }
    // 3. forbidden claims
    if (/®/.test(trText)) problems.push(`${relTr} — contains a registered trademark symbol`);
    if (/CE marked/i.test(trText)) problems.push(`${relTr} — contains "CE marked"`);
    // A negated claim ("not certified") is legitimate and mirrors the English
    // source; the negation word is translated, so it must be matched in every
    // target language.
    const negated = /(?:not|never|no|without|nicht|ne pas|kein|ne\b\s*pas|no\b\s+certificad|sin\b\s+certificad)\s+\*?\*?certified/i;
    if (/\bcertified\b/i.test(trText) && !negated.test(trText)) {
      problems.push(`${relTr} — contains an unsupported "certified" claim`);
    }
  }
}

// 4. LICENSE / NOTICE / LICENSES must never be translated
for (const rel of all) {
  if (/\.(de|fr|es)\.md$/.test(rel) && /(^|\/)(LICENSE|NOTICE)$/.test(rel.replace(/\.(de|fr|es)\.md$/, ''))) {
    problems.push(`${rel} — legal licence text must stay English-only`);
  }
  if (rel.startsWith('LICENSES' + path.sep) && /\.(de|fr|es)\.md$/.test(rel)) {
    problems.push(`${rel} — LICENSES/ must stay English-only`);
  }
}

if (problems.length) {
  console.error(`[translations] FAIL — ${problems.length} problem(s):`);
  for (const p of problems.slice(0, 40)) console.error('  - ' + p);
  if (problems.length > 40) console.error(`  ... and ${problems.length - 40} more`);
  process.exit(1);
}
console.log(`[translations] PASS — ${sources.length} source docs, ${sources.length * 3} translations, structure aligned`);
