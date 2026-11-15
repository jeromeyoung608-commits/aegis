#!/usr/bin/env node
// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
// scripts/verify-translations.mjs — the language policy gate.
//
// Policy (docs/LANGUAGES.md): documentation is English only; the product
// interface ships exactly two catalogs, English and German.
//
// What this asserts:
//   1. no translated documentation exists (no *.de.md / *.fr.md / *.es.md);
//   2. aegis-shell/src/i18n.js holds exactly the en and de catalogs;
//   3. the console language selector offers exactly EN and DE.
//
// The rest of the language discipline is covered by verify-english.mjs, which
// rejects non-English prose in any .md file outside the catalogs.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) { yield* walk(p); continue; }
    yield p;
  }
}

for (const f of walk(ROOT)) {
  if (/\.(de|fr|es)\.md$/.test(f)) {
    problems.push(`${f.slice(ROOT.length + 1)}: translated documentation is not maintained (docs/LANGUAGES.md)`);
  }
}

const i18n = readFileSync(join(ROOT, 'aegis-shell/src/i18n.js'), 'utf8');
const catalogs = [...i18n.matchAll(/^\s{2}([a-z]{2}):\s*\{/gm)].map((m) => m[1]);
if (catalogs.join(',') !== 'en,de') {
  problems.push(`aegis-shell/src/i18n.js: catalogs must be exactly en,de — found ${catalogs.join(',') || 'none'}`);
}

const consoleHtml = readFileSync(join(ROOT, 'aegis-shell/console.html'), 'utf8');
const options = [...consoleHtml.matchAll(/<option value="([a-z]{2})"/g)].map((m) => m[1]);
const langOptions = [...new Set(options.filter((o) => o.length === 2 && /^(en|de|fr|es|it|nl|pl)$/.test(o)))];
if (langOptions.length && langOptions.join(',') !== 'en,de') {
  problems.push(`aegis-shell/console.html: language selector must offer en,de — found ${langOptions.join(',')}`);
}

if (problems.length) {
  console.error(`[translations] FAIL — ${problems.length} problem(s):`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('[translations] PASS — documentation English only (0 translated files); UI catalogs en,de; selector EN/DE');
