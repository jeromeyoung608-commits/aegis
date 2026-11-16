// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
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
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PHRASE_CATALOG, PHRASE_KEEP_EN, translateString } from './i18n.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const repo = join(root, '..');

const normalise = (s) => s.replace(/\s+/g, ' ').trim();

// Text nodes of a page, with scripts/styles removed so that code and CSS
// literals never count as user-visible copy.
// Attribute copy: placeholders, tooltips and accessible names are just as
// visible as text nodes, and a German screen reader still reads them aloud.
function attributeStrings(file) {
  const html = readFileSync(file, 'utf8');
  const out = [];
  for (const m of html.matchAll(/(?:placeholder|title|aria-label|alt)="([^"]{2,120})"/g)) {
    const text = normalise(m[1].replace(/&amp;/g, '&').replace(/&nbsp;/g, ' '));
    if (/[A-Za-z]{2}/.test(text)) out.push(text);
  }
  return out;
}

function visibleStrings(file) {
  const html = readFileSync(file, 'utf8')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '');
  const out = [];
  for (const raw of html.matchAll(/>([^<>]+)</g)) {
    const text = normalise(raw[1]
      .replace(/&nbsp;/g, ' ')
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

// Both shells and every module demo page: the operator can open any of them
// from the README, and all of them must follow the language selector.
const PAGES = ['console.html', 'index.html'];
for (const name of readdirSync(join(repo, 'modules'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(repo, 'modules', d.name, 'index.html')))
  .map((d) => d.name)) {
  PAGES.push(`../modules/${name}/index.html`);
}

test('every visible string in every page has a German translation', () => {
  const missing = [];
  for (const page of PAGES) {
    const file = join(root, page);
    for (const text of visibleStrings(file).concat(attributeStrings(file))) {
      if (PHRASE_KEEP_EN.has(text)) continue;
      // Code identifiers, file paths, CLI commands and JSON samples are shown
      // in <code> style and must stay byte-identical in both languages.
      if (/[\/{}]|\.js\b|--port|@example/.test(text)) continue;
      // Counters ("14 redactions", "page 2 of 5") are handled by the template
      // layer, so ask the translator rather than the flat catalogue.
      if (translateString(text, 'de')) continue;
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

// Two owners of the same translator must never run at once. The shells drive
// the translator themselves (they own the selector); i18n-dom.js is for the
// module pages, which have no selector. Loading i18n-dom.js into a shell
// re-applies the boot locale every few seconds and silently undoes a DE switch
// — that bug shipped once and is pinned here.
test('the shells do not load the self-starting runtime', () => {
  for (const page of ['console.html', 'index.html']) {
    const html = readFileSync(join(root, page), 'utf8');
    assert.ok(!html.includes('i18n-dom.js'), `${page} must not include i18n-dom.js`);
  }
});

test('every module page loads the self-starting runtime', () => {
  for (const page of PAGES.filter((p) => p.startsWith('../modules/'))) {
    const html = readFileSync(join(root, page), 'utf8');
    assert.ok(html.includes('i18n-dom.js'), `${page} must include i18n-dom.js`);
  }
});
