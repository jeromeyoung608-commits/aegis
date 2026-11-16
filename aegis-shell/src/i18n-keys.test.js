// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// Cross-check: every i18n key referenced from HTML/JS must exist in all four
// catalogues (en/de).
// The previous check only compared the catalogues against each other and missed
// keys that were referenced from HTML but missing from every catalogue
// (this actually happened on 2026-11-15: compliance.ropa was displayed as a raw key
// in the compliance panel title).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const i18nSrc = readFileSync(join(root, 'src/i18n.js'), 'utf8');
// Only dotted keys belong to the en/de catalogues. The phrase catalogue
// (PHRASE_CATALOG) is keyed by plain English sentences — "Language", "Workbench"
// and so on — and must not be mistaken for a translation key.
const catalogKeys = new Set(
  [...i18nSrc.matchAll(/'([a-zA-Z0-9_]+\.[a-zA-Z0-9_.]+)':\s/g)].map((m) => m[1])
);

function refs(file) {
  const src = readFileSync(file, 'utf8');
  const html = [...src.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]);
  const js = [...src.matchAll(/\bt\(['"]([a-zA-Z0-9_.]+)['"]/g)].map((m) => m[1]);
  return [...html, ...js];
}

test('every referenced i18n key exists in the catalog', () => {
  const files = [join(root, 'console.html'), join(root, 'index.html'), join(root, 'src/console.js')];
  const missing = [];
  for (const f of files) {
    for (const k of refs(f)) if (!catalogKeys.has(k)) missing.push(f + ' -> ' + k);
  }
  assert.deepEqual(missing, [], 'missing i18n keys: ' + missing.join(', '));
});

test('both catalogs expose exactly the same key set', () => {
  // Slice the CATALOGS object only: i18n.js also carries PHRASE_CATALOG
  // (English sentence -> German sentence), whose keys are not translation keys.
  const objStart = i18nSrc.indexOf('const CATALOGS = {');
  const objEnd = i18nSrc.indexOf('\n};', objStart);
  assert.ok(objStart > -1 && objEnd > objStart, 'CATALOGS object not found');
  const objSrc = i18nSrc.slice(objStart, objEnd);
  const perLang = {};
  for (const lang of ['en', 'de']) {
    const start = objSrc.indexOf('\n  ' + lang + ': {');
    assert.ok(start > -1, 'catalog block missing for ' + lang);
    const rest = objSrc.slice(start + 1);
    const end = rest.search(/\n  [a-z]{2}: \{|\n\};/);
    const body = end > -1 ? rest.slice(0, end) : rest;
    perLang[lang] = [...body.matchAll(/'([a-zA-Z0-9_]+\.[a-zA-Z0-9_.]+)':\s/g)].map((m) => m[1]);
  }
  assert.deepEqual(perLang.en.filter((k) => !perLang.de.includes(k)), [], 'de missing keys');
  assert.deepEqual(perLang.de.filter((k) => !perLang.en.includes(k)), [], 'de has keys not in en');
});
