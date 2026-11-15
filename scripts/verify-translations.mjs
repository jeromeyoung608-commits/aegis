#!/usr/bin/env node
// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
// scripts/verify-translations.mjs — the German documentation gate.
//
// Policy (docs/LANGUAGES.md): English is authoritative, German ships for the
// customer-facing documents listed below. French and Spanish were removed on
// 2026-11-15 — half machine-generated text is worse than none.
//
// What this gate can assert:
//   1. every listed document has a German counterpart;
//   2. the counterpart carries the "English original / English prevails" banner;
//   3. commands and tables survived (code-fence and legal-table parity);
//   4. the text is broadly German (function-word floor) — a coarse check that
//      cannot judge style; a human reads every new translation;
//   5. no .fr.md / .es.md reappears anywhere, and the UI catalog is en+de only.
//
// It cannot judge style. Read any new translation before shipping it.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// [English document, German counterpart, summary allowed?]
const DOCS = [
  ['README.md', 'README.de.md', true],
  ['SECURITY.md', 'SECURITY.de.md', false],
  ['PRICING.md', 'PRICING.de.md', false],
  ['COMMERCIAL-LICENSE.md', 'COMMERCIAL-LICENSE.de.md', false],
  ['EULA.md', 'EULA.de.md', false],
  ['TRADEMARK.md', 'TRADEMARK.de.md', false],
  ['CONTRIBUTING.md', 'CONTRIBUTING.de.md', false],
  ['CODE_OF_CONDUCT.md', 'CODE_OF_CONDUCT.de.md', false],
  ['docs/LICENSING.md', 'docs/LICENSING.de.md', false],
  ['docs/LANGUAGES.md', 'docs/LANGUAGES.de.md', false],
  ['docs/legal/ORDER-FORM-TEMPLATE.md', 'docs/legal/ORDER-FORM-TEMPLATE.de.md', false],
  ['docs/legal/DPA-STATEMENT.md', 'docs/legal/DPA-STATEMENT.de.md', false],
  ['docs/legal/LEGAL-INDEX.md', 'docs/legal/LEGAL-INDEX.de.md', false],
  ['docs/compliance/QUICK-START.md', 'docs/compliance/QUICK-START.de.md', false],
  ['docs/compliance/CRA-NIS2.md', 'docs/compliance/CRA-NIS2.de.md', false],
  ['docs/compliance/DATA-RESIDENCY.md', 'docs/compliance/DATA-RESIDENCY.de.md', false],
];

// Documents whose tables must match row for row (contract-shaped).
const TABLE_PARITY = new Set([
  'COMMERCIAL-LICENSE.de.md',
  'docs/legal/ORDER-FORM-TEMPLATE.de.md',
  'docs/legal/DPA-STATEMENT.de.md',
  'docs/legal/LEGAL-INDEX.de.md',
]);

const EN_STOP = ['the', 'and', 'of', 'with', 'for', 'this', 'that', 'is', 'are',
  'in', 'to', 'on', 'by', 'from', 'as', 'be', 'not', 'or', 'any', 'which', 'your',
  'we', 'you', 'it', 'was', 'will', 'have', 'should', 'may', 'must'];
const DE_STOP = ['der', 'die', 'das', 'und', 'ist', 'sind', 'werden', 'wird',
  'nicht', 'bei', 'für', 'mit', 'von', 'auf', 'ein', 'eine', 'einen', 'dem',
  'den', 'des', 'zu', 'im', 'in', 'als', 'kann', 'muss', 'soll', 'nach', 'oder'];

const words = (t) => t.toLowerCase().match(/[a-zäöüß]+/gi) ?? [];
const body = (t) => t.replace(/```[\s\S]*?```/g, '');
const fences = (t) => (t.match(/^```/gm) ?? []).length;
const tableRows = (t) => (t.match(/^\|/gm) ?? []).length;

const problems = [];

for (const [en, de, summaryOK] of DOCS) {
  const enPath = join(ROOT, en);
  const dePath = join(ROOT, de);
  if (!existsSync(enPath)) { problems.push(`${en}: English original missing`); continue; }
  if (!existsSync(dePath)) { problems.push(`${de}: German version missing`); continue; }

  const enSrc = readFileSync(enPath, 'utf8');
  const deSrc = readFileSync(dePath, 'utf8');
  const head = deSrc.split('\n').slice(0, 20).join('\n');

  if (!/English original:/.test(head)) problems.push(`${de}: banner "English original:" missing`);
  if (!/(englische Fassung|gilt der englische Text|englische Text)/.test(head)) {
    problems.push(`${de}: banner does not state that English prevails`);
  }
  if (!summaryOK && fences(enSrc) !== fences(deSrc)) {
    problems.push(`${de}: code fences ${fences(deSrc)} vs English ${fences(enSrc)} (commands must survive)`);
  }
  if (TABLE_PARITY.has(de) && tableRows(enSrc) !== tableRows(deSrc)) {
    problems.push(`${de}: table rows ${tableRows(deSrc)} vs English ${tableRows(enSrc)}`);
  }

  const deWords = words(body(deSrc));
  if (deWords.length < 30) { problems.push(`${de}: too short to be a translation`); continue; }

  const enHits = deWords.filter((w) => EN_STOP.includes(w)).length / deWords.length;
  const deHits = deWords.filter((w) => DE_STOP.includes(w)).length / deWords.length;

  // Coarse only: quoted English terms (licence clauses, product names, CCO
  // titles) make a real German text sit around 2-4 %. Above 6 % it is no longer
  // German. This cannot detect word-by-word substitution — that needs a human
  // reader, and the 2026-11-15 output proved a heuristic will not catch it.
  if (enHits > 0.06) {
    problems.push(`${de}: ${(enHits * 100).toFixed(1)}% English function words — not German`);
  }
  if (deHits < 0.03) {
    problems.push(`${de}: ${(deHits * 100).toFixed(1)}% German function words — looks untranslated`);
  }

  if (!summaryOK) {
    const ratio = deWords.length / Math.max(1, words(body(enSrc)).length);
    if (ratio < 0.7) problems.push(`${de}: only ${(ratio * 100).toFixed(0)}% of the English length — content dropped`);
  }
}

// Removed languages must not come back.
function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === '_audit') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) { yield* walk(p); continue; }
    if (/\.(fr|es)\.md$/.test(name)) yield p;
  }
}
for (const f of walk(ROOT)) problems.push(`${f.slice(ROOT.length + 1)}: French/Spanish was removed on 2026-11-15`);

const i18n = readFileSync(join(ROOT, 'aegis-shell/src/i18n.js'), 'utf8');
if (/^\s{2}(fr|es):\s*\{/m.test(i18n)) problems.push('aegis-shell/src/i18n.js: UI catalog must be en+de only');

if (problems.length) {
  console.error(`[translations] FAIL — ${problems.length} problem(s):`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log(`[translations] PASS — ${DOCS.length} documents, German prose checked, fr/es absent, UI catalog en+de`);
