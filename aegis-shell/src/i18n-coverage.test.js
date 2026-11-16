// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
//
// Coverage gate for the bilingual interface.
//
// Why this exists: on 2026-11-16 the console shipped with only 54 of its ~180
// visible strings wired through [data-i18n]. Switching the selector to DE
// translated the header ("Language" → "Sprache") and left every tab, panel
// heading, button and hint in English. The key-vs-key test in i18n-keys.test.js
// passed the whole time, because it only compares two catalogues with each
// other — it cannot see text that was never routed through a key at all.
//
// This test reads the two shell pages, extracts every text node, and requires a
// German entry in PHRASE_CATALOG for each one. Anything genuinely untranslatable
// (brand mark, product names, protocol labels, language codes) has to be listed
// in PHRASE_KEEP_EN, so new UI text cannot silently arrive English-only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PHRASE_CATALOG, PHRASE_KEEP_EN } from './i18n.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const normalise = (s) => s.replace(/\s+/g, ' ').trim();

// Text nodes of a page, with scripts/styles removed so that code and CSS
// literals never count as user-visible copy.
function visibleStrings(file) {
  const html = readFileSync(file, 'utf8')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '');
  const out = [];
  for (const raw of html.matchAll(/>([^<>]+)</g)) {
    const text = normalise(raw[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'"));
    if (text.length < 2) continue;
    if (!/[A-Za-z]/.test(text)) continue;
    out.push(text);
  }
  return out;
}

const PAGES = ['console.html', 'index.html'];

test('every visible string in the shells has a German translation', () => {
  const missing = [];
  for (const page of PAGES) {
    const file = join(root, page);
    for (const text of visibleStrings(file)) {
      if (PHRASE_KEEP_EN.has(text)) continue;
      if (PHRASE_CATALOG[text]) continue;
      // Already driven by an explicit [data-i18n] key? Those are checked by
      // i18n-keys.test.js; the phrase layer does not need to know them.
      if (PHRASE_CATALOG[text]) continue;
      missing.push(`${page}: ${JSON.stringify(text)}`);
    }
  }
  assert.deepEqual(missing, [], `untranslated UI strings (${missing.length}):\n` + missing.join('\n'));
});

// Words that are spelled the same in German and English (loanwords and
// standard ISO/GDPR terminology). Listing them explicitly keeps the check
// meaningful: any other identity mapping is a forgotten translation.
const IDENTICAL_ALLOWED = new Set([
  'System', 'Compliance', 'Name', 'Status', 'Room', 'Email', 'Detail',
  'Audit', 'Auditor', 'Admin',
]);

test('catalogue values are German, not the English source echoed back', () => {
  const echoed = Object.entries(PHRASE_CATALOG)
    .filter(([k, v]) => k === v && !IDENTICAL_ALLOWED.has(k) && !PHRASE_KEEP_EN.has(k))
    .map(([k]) => k);
  assert.deepEqual(echoed, [], 'catalogue entries that translate nothing: ' + echoed.join(', '));
});

test('no catalogue entry is empty or whitespace', () => {
  const empty = Object.entries(PHRASE_CATALOG)
    .filter(([, v]) => !String(v).trim())
    .map(([k]) => k);
  assert.deepEqual(empty, [], 'empty translations: ' + empty.join(', '));
});
