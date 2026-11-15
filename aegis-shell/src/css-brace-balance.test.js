// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
// 括号平衡测试：防止“追加到文件末尾的规则被未闭合块吞掉”。
// 2026-11-15 实测：doc-redactor/app.css 的 `@media (max-width: 980px) {` 未闭合，
// 导致末尾追加的品牌焦点环规则只在 ≤980px 生效，1280px 下仍是浏览器默认环。
// 扫描全部页面 CSS，要求 { 数量 === } 数量。
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
