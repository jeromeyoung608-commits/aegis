#!/usr/bin/env node
// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
/**
 * Single-module delivery gate (MDS-1).
 *
 * Answers "can this folder be lifted out of the repository and sold on its own?"
 * — structure, README chapters, metadata, dependency posture, executable tests
 * and the evidence document. It does NOT answer "does it work?"; that is
 * `behaviour-gate.mjs` (shell) and `demo-e2e.mjs` (per node).
 *
 *   node scripts/verify-module.mjs <moduleDir> [--tests] [--json]
 *
 * Exit code 0 only when every MUST rule passes.
 *
 * © 2026 Jerome Young — EdgeVision-AI.
 */
import { readdirSync, existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execSync } from 'node:child_process';

const dir = process.argv[2];
if (!dir || !existsSync(dir)) {
  console.error('usage: verify-module.mjs <moduleDir> [--tests] [--json]');
  process.exit(2);
}
const RUN = process.argv.includes('--tests');
const JSONOUT = process.argv.includes('--json');
const R = [];
const add = (id, level, ok, detail) => R.push({ id, level, ok, detail });

const has = (p) => existsSync(join(dir, p));
const size = (p) => {
  try { return statSync(join(dir, p)).size; } catch { return 0; }
};
const text = (p) => {
  try { return readFileSync(join(dir, p), 'utf8'); } catch { return ''; }
};

/* ---------- G1 structure ---------- */
add('G1.1', 'MUST', has('LICENSE'), 'LICENSE missing');
add('G1.2', 'MUST', has('README.md'), 'README.md missing');
add('G1.3', 'MUST', has('package.json'), 'package.json missing');
add('G1.4', 'MUST', has('CHANGELOG.md'), 'CHANGELOG.md missing (required by MDS-1 §1)');
add('G1.5', 'MUST', has('src'), 'src/ missing');
add('G1.6', 'MUST', has('.gitignore'), '.gitignore missing');
const demoOk = has('demo') || has('demo.html') || has('index.html');
add('G1.7', 'MUST', demoOk, 'no standalone entry point (demo/, demo.html or index.html)');
add('G1.8', 'MUST', has('TEST_REPORT.md'), 'TEST_REPORT.md missing — a buyer needs evidence, not a promise');
add('G1.9', 'MUST', has('LICENSE') && size('LICENSE') > 500, 'LICENSE present but too short to be a real grant');

/* ---------- G3 metadata ---------- */
let pkg = {};
if (has('package.json')) {
  try { pkg = JSON.parse(text('package.json')); }
  catch { add('G3.0', 'MUST', false, 'package.json is not valid JSON'); }
}
const dep = (obj) => Object.keys(obj || {});
add('G3.1', 'MUST', !!pkg.name, 'name missing');
add('G3.2', 'MUST', /^\d+\.\d+\.\d+/.test(pkg.version || ''), 'version is not semver');
add('G3.3', 'MUST', pkg.type === 'module', 'type must be "module"');
add('G3.4', 'MUST', !!(pkg.scripts || {}).start, 'scripts.start missing');
add('G3.5', 'MUST', !!(pkg.scripts || {}).test, 'scripts.test missing (MDS-1 §4)');
add('G3.6', 'MUST', !!(pkg.scripts || {}).verify, 'scripts.verify missing (the standard must be executable)');
add('G3.7', 'SHOULD', !!pkg.license, 'license field missing');
add('G3.8', 'INFO', true, `dependencies=${dep(pkg.dependencies).length}`);
add('G3.9', 'MUST', dep(pkg.dependencies).length === 0, 'runtime dependencies declared; this project ships zero npm packages');

/* ---------- G2 README: twelve required chapters ---------- */
const REQ = [
  ['R1 What it solves', /what it solves|the problem|why this exists|problem it solves/i],
  ['R2 Who buys', /who buys|target users|audience|buyer/i],
  ['R3 Run in 60s', /run in 60|quick start|60 seconds|npm start/i],
  ['R4 Integration', /integration|api|export|contract|embed/i],
  ['R5 Architecture', /architecture|structure|design|how it works/i],
  ['R6 Threat model', /threat|guarantee|trust|out of scope/i],
  ['R7 Known limits', /limit|not supported|unsupported|known issue/i],
  ['R8 Verification', /verification|test|# pass|npm test/i],
  ['R9 Perf', /performance|fps|throughput|benchmark/i],
  ['R10 Deps', /dependenc|vendor|zero dependency|0 external/i],
  ['R11 License', /license|commercial/i],
  ['R12 Changelog', /changelog|change log/i],
];
const readme = text('README.md');
for (const [name, re] of REQ) {
  const hit = re.test(readme);
  add('G2.' + name.split(' ')[0], 'MUST', hit, `README is missing the "${name}" section`);
}
// Evidence discipline: a performance number needs a machine and a date.
const perfEvidence = /(M1|M2|M3|M4|MacBook|GPU|RTX|Apple|Chrome|Safari|2026-|\d{4}-\d{2}-\d{2})/i.test(readme);
add('G2.R9b', 'SHOULD', perfEvidence, 'performance numbers carry no hardware/date provenance (MDS-1 §10)');

/* ---------- G4 dependency posture ---------- */
const walk = (d, acc = []) => {
  for (const e of readdirSync(d)) {
    if (e === 'node_modules' || e === '.git') continue;
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(js|mjs|ts|html)$/.test(e)) acc.push(p);
  }
  return acc;
};
const urls = [];
if (has('src')) {
  for (const f of walk(join(dir, 'src'))) {
    readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
      if (/^\s*\*|^\s*\/\//.test(l)) return; // a comment is not a fetch
      for (const m of l.matchAll(/https?:\/\/[A-Za-z0-9.-]+(?:\.[A-Za-z]{2,})?(?::\d+)?[^\s"'`)]*/g)) {
        const raw = m[0];
        if (/localhost|127\.0\.0\.1/.test(raw)) continue;
        urls.push(`${relative(dir, f)}:${i + 1}`);
      }
    });
  }
}
const declaredSelfContained = /vendor|self-contained|bundled|offline asset/i.test(readme);
add('G4.1', 'MUST', urls.length === 0 || declaredSelfContained,
  `${urls.length} remote URL(s) in src and no vendor/self-hosting statement in README ${urls.slice(0, 3).join(', ')}`);
if (has('vendor')) {
  const man = join(dir, 'vendor/MANIFEST.json');
  add('G4.2', 'MUST', existsSync(man), 'vendor/ exists but there is no MANIFEST.json (MDS-1 §6)');
  if (existsSync(man)) {
    try {
      const m = JSON.parse(readFileSync(man, 'utf8'));
      const arr = Array.isArray(m) ? m : (m.components || m.assets || []);
      for (const a of arr) {
        if (!a.sha256 && Array.isArray(a.files) && a.files.length) a.sha256 = a.files.map((f) => f.sha256).join(',');
        if (!a.upstreamUrl && a.upstream) a.upstreamUrl = a.upstream;
      }
      const bad = arr.filter((a) => !a.name || !a.version || !a.upstreamUrl || !a.sha256 || !a.license);
      add('G4.3', 'MUST', arr.length > 0 && bad.length === 0, `MANIFEST has ${arr.length} entries, ${bad.length} incomplete`);
      const gpl = arr.filter((a) => /GPL/i.test(a.license || ''));
      add('G4.4', 'MUST', gpl.length === 0, `GPL asset(s) ${gpl.map((a) => a.name).join(',')} are not allowed under the project's permissive (MIT) dependency policy (MDS-1 §9)`);
    } catch { add('G4.3', 'MUST', false, 'MANIFEST.json is not valid JSON'); }
  }
} else {
  add('G4.2', 'INFO', true, 'no vendor/ (module ships no third-party bytes)');
}

/* ---------- G5 tests ---------- */
if (has('tests') || has('test')) {
  const tdir = has('tests') ? join(dir, 'tests') : join(dir, 'test');
  const all = readdirSync(tdir);
  const tfiles = all.filter((f) => /\.(test|spec)\.(mjs|js|cjs)$/.test(f));
  add('G5.1', 'MUST', tfiles.length > 0, `${tfiles.length} executable test file(s) in tests/ (found: ${all.slice(0, 4).join(', ')})`);
  if (RUN && tfiles.length > 0) {
    let out = '';
    try {
      out = execSync(`node --test ${tfiles.map((f) => `"${join(tdir, f)}"`).join(' ')} 2>&1`, {
        encoding: 'utf8', timeout: 240000,
      });
    } catch (e) { out = String(e.stdout || e); }
    // Node 20 prints "# tests N"; Node 22's default reporter prints "ℹ tests N".
    const tests = (out.match(/^[#ℹ]\s*tests\s+(\d+)/m) || [])[1];
    const fail = (out.match(/^[#ℹ]\s*fail\s+(\d+)/m) || [])[1];
    add('G5.2', 'MUST', Number(tests) > 0, `node --test reported tests=${tests} (0 means no assertions ran)`);
    add('G5.3', 'MUST', Number(fail) === 0, `${fail} failing test(s)`);
  }
} else {
  add('G5.1', 'MUST', false, 'tests/ directory missing');
}

/* ---------- G6 evidence document ---------- */
const report = text('TEST_REPORT.md');
add('G6.1', 'MUST', size('TEST_REPORT.md') > 800, 'TEST_REPORT.md is missing or too thin to carry evidence');
add('G6.2', 'MUST', /(pass|fail|✓|✗)\s*[\d.]*\s*(\/\s*\d+)?/i.test(report), 'report states no pass/fail outcome');
add('G6.3', 'MUST', /\d+\.\d+\.\d+/.test(report), 'report is not versioned against a release');
add('G6.4', 'MUST', /(20\d{2}-\d{2}-\d{2}|\d{1,2} \w+ 20\d{2})/.test(report), 'report carries no run date');
add('G6.5', 'MUST', /(node |npm |chrome|chromium)/i.test(report), 'report must name the runtime and the browser used');
add('G6.6', 'SHOULD', /(demo|index\.html)/i.test(report), 'report should link the standalone demo it certifies');

/* ---------- output ---------- */
const mustFail = R.filter((r) => r.level === 'MUST' && !r.ok);
const shouldFail = R.filter((r) => r.level === 'SHOULD' && !r.ok);
if (JSONOUT) {
  console.log(JSON.stringify({ dir, pass: mustFail.length === 0, mustFail, shouldFail }, null, 1));
} else {
  console.log(`\n== ${relative(process.cwd(), dir) || dir}`);
  for (const r of R) {
    // On a pass the detail is the *failure* message, so printing it next to a
    // tick reads as the opposite of what happened. Only informative details
    // (measured counts, posture) are echoed on success.
    const shown = r.ok
      ? (/missing|absent|declared|too |must |no [a-z]|not |no vendor|carries no|states no|is not versioned/i.test(r.detail) ? 'ok' : r.detail)
      : r.detail;
    console.log(`${r.ok ? '✓' : '✗'} ${r.id.padEnd(7)} ${shown.slice(0, 110)}`);
  }
  const score = Math.max(0, 100 - mustFail.length * 4 - shouldFail.length * 1);
  const grade = score >= 90 ? 'A · quotable' : score >= 75 ? 'B · portfolio only' : 'C · do not ship';
  console.log(`-- MUST failures ${mustFail.length} · SHOULD gaps ${shouldFail.length} → ${score} · ${grade}`);
}
process.exit(mustFail.length === 0 ? 0 : 1);
