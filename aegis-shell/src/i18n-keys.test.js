// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
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
const catalogKeys = new Set(
  [...i18nSrc.matchAll(/'([a-zA-Z0-9_.]+)':\s/g)].map((m) => m[1])
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
  const perLang = {};
  for (const lang of ['en', 'de']) {
    const start = i18nSrc.indexOf('\n  ' + lang + ': {');
    assert.ok(start > -1, 'catalog block missing for ' + lang);
    const body = i18nSrc.slice(start);
    const end = body.slice(1).search(/\n  [a-z]{2}: \{|\n  \};/);
    perLang[lang] = [...body.slice(0, end + 1).matchAll(/'([a-zA-Z0-9_.]+)':\s/g)].map((m) => m[1]);
  }
  const en = perLang.en;
  for (const lang of ['de']) {
    assert.deepEqual(
      en.filter((k) => !perLang[lang].includes(k)),
      [],
      lang + ' missing keys'
    );
    assert.deepEqual(
      perLang[lang].filter((k) => !en.includes(k)),
      [],
      lang + ' has keys not in en'
    );
  }
});
