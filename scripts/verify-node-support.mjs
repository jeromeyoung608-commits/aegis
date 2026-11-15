#!/usr/bin/env node
// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
// Offline Node.js security-line gate. Zero dependencies, no network calls.
// Checks the running Node against a maintainable, reviewable baseline and tells
// the operator exactly where to confirm current advisories. It does NOT claim to
// perform a live CVE lookup — that requires network access and is a human/CI step.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = join(ROOT, 'docs', 'compliance', 'NODE-SECURITY-BASELINE.json');
const STRICT = process.argv.includes('--strict');

function fail(msg) { console.error('[node-support] FAIL — ' + msg); process.exit(1); }
if (!existsSync(BASELINE)) fail(`baseline missing: ${BASELINE}`);

let b;
try { b = JSON.parse(readFileSync(BASELINE, 'utf8')); }
catch (e) { fail('baseline is not valid JSON: ' + e.message); }

const major = Number(process.versions.node.split('.')[0]);
const version = process.versions.node;
const supported = Array.isArray(b.supportedMajors) ? b.supportedMajors : [];
const notes = [];

if (!supported.includes(major)) {
  notes.push(`Node ${major} is NOT on a supported release line (supported: ${supported.join(', ')})`);
}
if (b.minimumVersion && cmp(version, b.minimumVersion) < 0) {
  notes.push(`Node ${version} is below minimum ${b.minimumVersion}`);
}
if (b.eolMajors && b.eolMajors.includes(major)) {
  notes.push(`Node ${major} is end-of-life and receives no security fixes`);
}

console.log(`[node-support] runtime Node ${version}`);
console.log(`[node-support] baseline last reviewed: ${b.reviewedOn || 'unknown'} · supported majors: ${supported.join(', ') || 'none'}`);
console.log(`[node-support] advisory sources (manual / CI-online step):`);
for (const u of b.advisorySources || []) console.log('  · ' + u);

if (notes.length) {
  for (const n of notes) console.error('[node-support] ✗ ' + n);
  fail(`${notes.length} issue(s) — upgrade Node and record the review in NODE-SECURITY-BASELINE.json`);
}
const ageDays = b.reviewedOn ? Math.floor((Date.now() - Date.parse(b.reviewedOn)) / 86_400_000) : null;
if (ageDays !== null && ageDays > (b.maxReviewAgeDays || 90)) {
  console.warn(`[node-support] WARN — baseline was reviewed ${ageDays}d ago (> ${b.maxReviewAgeDays || 90}d); re-check advisories.`);
  if (STRICT) fail('baseline review is stale (strict mode)');
}
console.log(`[node-support] PASS — Node ${version} is on a supported line; no known EOL mismatch.`);
console.log('[node-support] NOTE: this is an offline baseline check, not a live CVE database query.');

function cmp(a, c) {
  const x = String(a).split('.').map(Number), y = String(c).split('.').map(Number);
  for (let i = 0; i < 3; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d > 0 ? 1 : -1; }
  return 0;
}
