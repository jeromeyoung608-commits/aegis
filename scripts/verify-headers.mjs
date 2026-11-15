// scripts/verify-headers.mjs
// Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
//
// Watermark gate: every shipped source file must carry the Aegis copyright line
// near the top. Vendored third-party code (pdf.js, tesseract, …) is intentionally
// excluded — those files keep their own upstream license.
//
//   node scripts/verify-headers.mjs          # report + exit non-zero on misses
//   node scripts/verify-headers.mjs --fix    # also prepend the missing header
//
// Wire this into `npm test` so coverage can never silently regress below 100%.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const COPYRIGHT = 'Copyright (c) 2026 Jerome Young (Yang Jie)';
const TARGET_EXT = new Set(['.js', '.mjs', '.cjs', '.ts', '.css', '.html']);
const SKIP_DIRS = new Set(['node_modules', 'vendor', 'dist', 'build', '.git']);
const ROOT = process.cwd();

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      // vendor dirs anywhere are third-party — skip entirely
      if (name === 'vendor') continue;
      walk(p, out);
    } else if (TARGET_EXT.has(extname(name))) {
      out.push(p);
    }
  }
}

const files = [];
walk(ROOT, files);

function headerFor(ext, firstLine) {
  if (firstLine.startsWith('#!')) {
    // keep a shebang on line 1, header on line 2
    return null; // handled in fix by inserting after shebang
  }
  if (ext === '.html') return `<!-- Aegis - ${COPYRIGHT} -->\n`;
  if (ext === '.css') return `/* Aegis - ${COPYRIGHT} */\n`;
  return `// Aegis - ${COPYRIGHT}\n`;
}

const missing = [];
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  const head = text.split('\n').slice(0, 3).join('\n');
  if (!head.includes(COPYRIGHT)) missing.push(f);
}

const fix = process.argv.includes('--fix');
if (fix) {
  let fixed = 0;
  for (const f of missing) {
    const text = readFileSync(f, 'utf8');
    const ext = extname(f);
    // Drop any pre-existing copyright line(s) wherever they sit, then place one at top.
    const kept = text.split('\n').filter((l) => !l.includes(COPYRIGHT));
    const joined = kept.join('\n');
    const lines = joined.split('\n');
    const shebang = lines[0] && lines[0].startsWith('#!') ? lines[0] + '\n' : '';
    const rest = shebang ? lines.slice(1).join('\n') : joined;
    const hdr = ext === '.html'
      ? `<!-- Aegis - ${COPYRIGHT} -->\n`
      : ext === '.css'
        ? `/* Aegis - ${COPYRIGHT} */\n`
        : `// Aegis - ${COPYRIGHT}\n`;
    writeFileSync(f, shebang + hdr + rest);
    fixed++;
  }
  console.log(`[headers] fixed ${fixed} file(s).`);
  // re-verify
  let stillMissing = 0;
  for (const f of missing) {
    const t = readFileSync(f, 'utf8');
    if (!t.split('\n').slice(0, 3).join('\n').includes(COPYRIGHT)) {
      console.log('  STILL MISSING:', f);
      stillMissing++;
    }
  }
  console.log(stillMissing === 0 ? '[headers] ALL COVERED' : `[headers] ${stillMissing} still missing`);
  process.exit(stillMissing === 0 ? 0 : 1);
}

if (missing.length === 0) {
  console.log(`[headers] PASS — ${files.length} source files, 100% carry the copyright line.`);
  process.exit(0);
}
console.log(`[headers] FAIL — ${missing.length} of ${files.length} files missing the copyright line:`);
for (const f of missing) console.log('  -', f.replace(ROOT + '/', ''));
process.exit(1);
