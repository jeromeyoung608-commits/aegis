// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// scripts/verify-headers.mjs
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

const COPYRIGHT = 'Copyright (c) 2026 Yang Jie (Jerome Young)';
// Authorship watermark. It is an attribution marker, not a licence term: Apache-2.0
// already requires the copyright and NOTICE attributions to travel with the code,
// and nothing here adds a restriction on use, modification or redistribution.
const WATERMARK = 'Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0';
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

function headerFor(ext) {
  if (ext === '.html') return `<!-- Aegis - ${COPYRIGHT} -->\n<!-- ${WATERMARK} -->\n`;
  if (ext === '.css') return `/* Aegis - ${COPYRIGHT} */\n/* ${WATERMARK} */\n`;
  return `// Aegis - ${COPYRIGHT}\n// ${WATERMARK}\n`;
}

function commentFor(ext, text) {
  if (ext === '.html') return `<!-- ${text} -->\n`;
  if (ext === '.css') return `/* ${text} */\n`;
  return `// ${text}\n`;
}

const missing = [];
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  const head = text.split('\n').slice(0, 4).join('\n');
  if (!head.includes(COPYRIGHT)) missing.push(f);
}

const fix = process.argv.includes('--fix');
if (fix) {
  let fixed = 0;
  const targets = [...new Set([...missing, ...files.filter((f) => {
    const t = readFileSync(f, 'utf8');
    return !t.split('\n').slice(0, 4).join('\n').includes(WATERMARK);
  })])];
  for (const f of targets) {
    const text = readFileSync(f, 'utf8');
    const ext = extname(f);
    // Drop any pre-existing copyright/watermark line(s) wherever they sit, then
    // place the canonical pair at the top.
    const isHeaderComment = (l) => /^\s*(\/\/|\/\*|<!--|\*)/.test(l) || /^\s*\*\//.test(l);
    const kept = text.split('\n').filter((l) => !(isHeaderComment(l) && (l.includes(COPYRIGHT) || l.includes(WATERMARK))));
    const joined = kept.join('\n');
    const lines = joined.split('\n');
    const shebang = lines[0] && lines[0].startsWith('#!') ? lines[0] + '\n' : '';
    const rest = shebang ? lines.slice(1).join('\n') : joined;
    const hdr = headerFor(ext);
    writeFileSync(f, shebang + hdr + rest);
    fixed++;
  }
  console.log(`[headers] fixed ${fixed} file(s).`);
  // re-verify
  let stillMissing = 0;
  for (const f of targets) {
    const t = readFileSync(f, 'utf8');
    const head = t.split('\n').slice(0, 4).join('\n');
    if (!head.includes(COPYRIGHT) || !head.includes(WATERMARK)) {
      console.log('  STILL MISSING:', f);
      stillMissing++;
    }
  }
  console.log(stillMissing === 0 ? '[headers] ALL COVERED' : `[headers] ${stillMissing} still missing`);
  process.exit(stillMissing === 0 ? 0 : 1);
}

// Watermark coverage: same file set, verified independently so a file can never
// keep the copyright line and silently lose the authorship marker.
const noMark = [];
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  if (!text.split('\n').slice(0, 4).join('\n').includes(WATERMARK)) noMark.push(f);
}

if (missing.length === 0 && noMark.length === 0) {
  console.log(`[headers] PASS — ${files.length} source files, 100% carry copyright + authorship watermark.`);
  process.exit(0);
}
if (missing.length) console.log(`[headers] FAIL — ${missing.length} file(s) missing the copyright line.`);
if (noMark.length) console.log(`[headers] FAIL — ${noMark.length} file(s) missing the watermark line.`);
console.log(`[headers] FAIL — ${missing.length} of ${files.length} files missing the copyright line:`);
for (const f of missing) console.log('  -', f.replace(ROOT + '/', ''));
process.exit(1);
