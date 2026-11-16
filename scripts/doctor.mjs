#!/usr/bin/env node
// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// Aegis self-diagnostic (doctor). Zero external dependencies — node: built-ins only.
// Usage: npm run doctor   (set PORT / AEGIS_ISSUER_SECRET to test a real config)
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const PORT = Number(process.env.PORT) || 8099;

const results = [];
const add = (name, ok, detail, level = ok ? 'OK' : 'FAIL') => results.push({ name, ok, detail, level });

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    // Skip deps, build output, VCS, and DEV-ONLY tooling (which may import test
    // deps like Playwright via --no-save). We only vouch for shipped product code.
    if (['node_modules', 'dist', '.git', 'video-tool', 'scripts', 'docs', 'bootstrap', 'delivery', 'tests', 'test'].includes(name)) continue;
    if (name.startsWith('.')) continue;
    const p = path.join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(js|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

// 1. Runtime — node:sqlite requires >= 22; also check the security support line.
const major = Number((process.versions.node || '').split('.')[0] || 0);
add('Node.js >= 22', major >= 22, `node ${process.versions.node}`, major >= 22 ? 'OK' : 'FAIL');
try {
  const b = JSON.parse(readFileSync(path.join(ROOT, 'docs/compliance/NODE-SECURITY-BASELINE.json'), 'utf8'));
  const supported = (b.supportedMajors || []).includes(major);
  const stale = b.reviewedOn && (Date.now() - Date.parse(b.reviewedOn)) / 86_400_000 > (b.maxReviewAgeDays || 90);
  add('Node on supported security line', supported,
    `${supported ? 'supported major ' + major : 'EOL/unsupported major ' + major} (baseline reviewed ${b.reviewedOn})${stale ? ' — advisory review overdue' : ''}`,
    supported && !stale ? 'OK' : 'WARN');
} catch (e) {
  add('Node security baseline readable', false, String((e && e.message) || e));
}

// 2. Required files
for (const f of ['server.js', 'package.json', 'scripts/setup.mjs']) {
  const ok = existsSync(path.join(ROOT, f));
  add(`required file: ${f}`, ok, ok ? 'present' : 'MISSING');
}

// 3. Data directory writable
const dataDir = path.join(ROOT, 'data');
try { mkdirSync(dataDir, { recursive: true }); add('data/ directory writable', true, dataDir); }
catch (e) { add('data/ directory writable', false, String((e && e.message) || e)); }

// 4. Port availability — report, don't hard-fail (a running server legitimately holds it)
await new Promise((resolve) => {
  const s = createServer();
  s.once('error', () => { add(`port ${PORT} available`, false, 'in use — is the server already running?', 'WARN'); resolve(); });
  s.once('listening', () => s.close(() => { add(`port ${PORT} available`, true, 'free'); resolve(); }));
  s.listen(PORT, '0.0.0.0');
});

// 5. Issuer secret
add('AEGIS_ISSUER_SECRET set', !!process.env.AEGIS_ISSUER_SECRET,
  process.env.AEGIS_ISSUER_SECRET ? 'set' : 'not set — setup.mjs will generate one on first run', 'WARN');

// 6. Zero-dependency scan (mirrors the project zero-deps gate; WARN only)
let extImports = 0;
for (const f of walk(ROOT)) {
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^\s*import\b[^'"]*from\s*['"]([^'"]+)['"]|}\s*from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/);
    if (m) {
      const spec = m[1] || m[2];
      if (spec && !spec.startsWith('.') && !spec.startsWith('/') && !spec.startsWith('node:') && spec !== 'playwright') extImports++;
    }
  }
}
add('no external (non-node:) imports', extImports === 0,
  extImports === 0 ? 'clean' : `${extImports} external specifier(s) — run the zero-deps gate`, extImports === 0 ? 'OK' : 'WARN');

// Report
let failed = 0;
for (const c of results) {
  const tag = c.ok ? 'OK  ' : (c.level === 'WARN' ? 'WARN' : 'FAIL');
  console.log(`[${tag}] ${c.name} — ${c.detail}`);
  if (!c.ok && c.level === 'FAIL') failed++;
}
console.log(`\n${results.length} checks, ${failed} failure(s).`);
process.exit(failed ? 1 : 0);
