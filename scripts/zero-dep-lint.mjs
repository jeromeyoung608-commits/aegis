#!/usr/bin/env node
// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// scripts/zero-dep-lint.mjs — CI gate that enforces the Aegis kernel boundary.
//
// The kernel (crypto / hash-chain / audit / signaling / redaction render) MUST
// stay zero-dependency: it may only import platform built-ins (`node:*`) and
// first-party relative modules. Any bare (npm-style) import inside kernel source
// is a hard failure. External services (TSA, cloud storage, desktop shell) live
// behind adapters in `adapters/`, whose `vendor/` subdirectories are deliberately
// skipped here. Additionally, NO scanned file may import INTO a `vendor/`
// directory — that would pull third-party code into the kernel/adapter proper.
// Documented in README §11 "External integrations".
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, resolve, dirname, sep } from 'node:path';

const SKIP_DIRS = new Set(['node_modules', 'vendor', 'dist', 'build', '.git', 'coverage', 'tests', 'test', 'scripts', 'video-tool']);
const EXT = new Set(['.js', '.mjs', '.cjs', '.ts']);

/**
 * Drop comments before scanning. Documentation and commented-out examples
 * legitimately contain `require('x')` / `import … from 'npm'`; matching those
 * made the gate fail on files that are actually clean.
 */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

// Capture: import … from 'X';  import 'X';  export … from 'X';  import('X');  require('X')
const IMPORT_RE =
  /(?:import\s+(?:[^'"]*?\s+from\s+)?|export\s+[^'"]*?\s+from\s+|import\s*\(\s*|require\s*\(\s*)['"]([^'"]+)['"]/g;

const specifierAllowed = (spec) =>
  spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('node:');

// The vendor-leak rule protects the TRUST KERNEL and adapters only. Two modules
// are explicitly declared as vendored in README §11 (each ships its own MANIFEST
// + upstream licences): they legitimately import their own vendor/ assets (pdf.js,
// pdf-lib, tesseract). Exempt exactly those; every other file may not reach into
// any vendor/ directory. Bare (npm) imports remain forbidden everywhere.
const DECLARED_VENDORED = ['modules/doc-redactor/', 'modules/e2e-signed-delivery/'];
const isDeclaredVendored = (rel) => DECLARED_VENDORED.some((p) => rel.startsWith(p));

async function walk(dir, acc) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(p, acc);
    } else if (EXT.has(entry.name.slice(entry.name.lastIndexOf('.')))) {
      acc.push(p);
    }
  }
}

async function main() {
  // Scan the shipping surface only. `.` used to sweep the linter's own comments
  // and video-tool's Playwright helpers, so the gate was permanently red.
  const roots = process.argv.slice(2).length
    ? process.argv.slice(2)
    : ['aegis-shell', 'modules', 'server.js', 'adapters'];
  const files = [];
  for (const r of roots) {
    const s = await stat(r);
    if (s.isFile()) {
      if (EXT.has(r.slice(r.lastIndexOf('.')))) files.push(r);
    } else {
      await walk(r, files);
    }
  }

  const violations = [];
  for (const f of files) {
    const text = stripComments(await readFile(f, 'utf8'));
    let m;
    IMPORT_RE.lastIndex = 0;
    while ((m = IMPORT_RE.exec(text))) {
      const spec = m[1];
      const rel = relative('.', f);
      if (!specifierAllowed(spec)) {
        violations.push({ file: rel, spec, why: 'non-platform (npm/bare) import' });
        continue;
      }
      // A relative import that resolves INTO a vendor/ directory would smuggle
      // third-party code into the kernel/adapter body. Hard-fail it — EXCEPT for
      // the two modules whose vendored assets are declared in README §11.
      if (!isDeclaredVendored(rel) && (spec.startsWith('.') || spec.startsWith('/'))) {
        const target = spec.startsWith('/') ? resolve('.', '.' + spec) : resolve(dirname(f), spec);
        if (target.split(sep).includes('vendor')) {
          violations.push({ file: rel, spec, why: 'import into vendor/ (third-party code must stay isolated)' });
        }
      }
    }
  }

  if (violations.length === 0) {
    console.log(`[zero-dep] PASS — ${files.length} kernel+adapter files scanned; no non-platform imports, no vendor leakage.`);
    process.exit(0);
  }
  console.error('[zero-dep] FAIL — kernel must be zero-dependency:');
  for (const v of violations) console.error(`  ${v.file}  →  ${v.spec}  [${v.why}]`);
  process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
