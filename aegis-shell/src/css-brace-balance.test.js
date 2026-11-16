// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// Brace-balance test: prevents "rules appended at the end of the file are swallowed
// by an unclosed block".
// Measured 2026-11-15: the `@media (max-width: 980px) {` block in doc-redactor/app.css
// was never closed,
// so the brand focus-ring rule appended at the end only applied at ≤980px while
// 1280px still showed the browser default ring.
// Scans every page stylesheet and requires the { count to equal the } count.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

function findCss(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) findCss(p, out);
    else if (name.endsWith('.css')) out.push(p);
  }
  return out;
}

const roots = [join(root, 'aegis-shell'), join(root, 'modules')].filter(existsSync);
const files = roots.flatMap((r) => findCss(r));

test('every page CSS has balanced braces ( { count === } count )', () => {
  const bad = [];
  for (const f of files) {
    const s = readFileSync(f, 'utf8');
    const open = (s.match(/\{/g) || []).length;
    const close = (s.match(/\}/g) || []).length;
    if (open !== close) bad.push(`${f.slice(root.length + 1)} (${open} { vs ${close} })`);
  }
  assert.deepEqual(bad, [], 'CSS files with unbalanced braces:\n' + bad.join('\n'));
});
