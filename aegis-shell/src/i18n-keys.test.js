// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
// 交叉校验：HTML/JS 里引用的每个 i18n key，必须在 en/de/fr/es 四本目录里都存在。
// 之前只比对“目录之间是否互等”，漏掉了 HTML 引用但目录里没有的 key
// （2026-11-15 实际发生过：compliance.ropa 直接以原始 key 显示在合规面板标题上）。
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

test('all four catalogs expose exactly the same key set', () => {
  const perLang = {};
  for (const lang of ['en', 'de', 'fr', 'es']) {
    const start = i18nSrc.indexOf('\n  ' + lang + ': {');
    assert.ok(start > -1, 'catalog block missing for ' + lang);
    const body = i18nSrc.slice(start);
    const end = body.slice(1).search(/\n  [a-z]{2}: \{|\n  \};/);
    perLang[lang] = [...body.slice(0, end + 1).matchAll(/'([a-zA-Z0-9_.]+)':\s/g)].map((m) => m[1]);
  }
  const en = perLang.en;
  for (const lang of ['de', 'fr', 'es']) {
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
