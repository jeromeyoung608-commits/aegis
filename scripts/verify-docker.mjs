#!/usr/bin/env node
// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
// Docker delivery gate. NEVER reports a successful build unless docker actually
// built and the image served /health. With no daemon it prints BLOCKED and the
// reason; use --strict in CI to make that a hard failure.
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STRICT = process.argv.includes('--strict');
const df = join(ROOT, 'Dockerfile');
let failed = 0;
const check = (ok, name, detail = '') => {
  console.log(`[${ok ? 'OK  ' : 'FAIL'}] ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

if (!existsSync(df)) { console.error('[docker] FAIL — Dockerfile missing'); process.exit(1); }
const text = readFileSync(df, 'utf8');
check(/^FROM node:22-alpine/m.test(text), 'Dockerfile pins Node 22 (node:sqlite requirement)');
check(!/^\s*COPY\s+config\//m.test(text), 'Dockerfile does not COPY config/ (no baked secret)');
check(/mkdir -p \/app\/config/.test(text), 'Dockerfile creates config/ at build time');
check(/^USER node/m.test(text), 'Dockerfile runs as non-root');
check(/^EXPOSE /m.test(text), 'Dockerfile declares a port');
check(/^HEALTHCHECK /m.test(text), 'Dockerfile declares a healthcheck');

const info = spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], { encoding: 'utf8' });
const daemonUp = info.status === 0 && !info.error;
if (!daemonUp) {
  const why = info.error ? info.error.code : (info.stderr || '').trim().split('\n')[0];
  console.log(`[docker] BLOCKED — daemon unavailable (${why || 'not running'}). Image build is UNVERIFIED.`);
  console.log('[docker] Static Dockerfile checks above are valid; the build itself is NOT claimed as passing.');
  console.log('[docker] On a host with Docker: docker build -t aegis:verify . && docker run --rm -p 8099:8099 -e AEGIS_ISSUER_SECRET=test aegis:verify');
  console.log('[docker] Then: node scripts/verify-docker.mjs --build');
  if (STRICT) { console.error('[docker] FAIL — strict mode requires a daemon'); process.exit(1); }
  console.log(`[docker] STATIC PASS / BUILD UNVERIFIED — ${failed ? failed + ' static failure(s)' : '0 static failures'}`);
  process.exit(failed ? 1 : 0);
}

console.log(`[docker] daemon up (${info.stdout.trim()})`);
if (!process.argv.includes('--build')) {
  console.log('[docker] PASS — daemon reachable. Re-run with --build to also build+smoke-test the image.');
  process.exit(failed ? 1 : 0);
}
const build = spawnSync('docker', ['build', '-t', 'aegis:verify', '.'], { cwd: ROOT, encoding: 'utf8' });
check(build.status === 0, 'docker build', build.status === 0 ? 'aegis:verify' : (build.stderr || '').trim().slice(-400));
if (build.status === 0) {
  const run = spawnSync('docker', ['run', '--rm', '-d', '-p', '8178:8099', '-e', 'AEGIS_ISSUER_SECRET=verify-only', '--name', 'aegis-verify', 'aegis:verify'], { cwd: ROOT, encoding: 'utf8' });
  const cid = (run.stdout || '').trim();
  check(run.status === 0 && !!cid, 'docker run', cid.slice(0, 12));
  if (cid) {
    let ok = false;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 250));
      try { const r = await fetch('http://127.0.0.1:8178/health'); if (r.status === 200) { ok = true; break; } } catch { /* starting */ }
    }
    check(ok, 'container /health returns 200');
    spawnSync('docker', ['rm', '-f', 'aegis-verify'], { stdio: 'ignore' });
  }
}
console.log(`\n[docker] ${failed ? `FAIL — ${failed} check(s)` : 'PASS — image built and health-checked'}`);
process.exit(failed ? 1 : 0);
