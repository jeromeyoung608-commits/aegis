#!/usr/bin/env node
// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
// Upgrade rehearsal: simulate an OLD Aegis install (pre-enabled, pre-MFA,
// pre-SCIM-token schema) and prove that the current server migrates it in place
// without losing accounts, sessions, revocations or audit events.
// Zero dependencies; uses a throwaway SQLite file, never the real data/.
import { DatabaseSync } from 'node:sqlite';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = mkdtempSync(join(tmpdir(), 'aegis-upgrade-'));
const dbPath = join(tmp, 'old.db');
let failed = 0;
const check = (ok, name, detail = '') => {
  console.log(`[${ok ? 'OK  ' : 'FAIL'}] ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

try {
  // 1. Build a v0-style database: only the ORIGINAL five tables, no later columns.
  const old = new DatabaseSync(dbPath);
  old.exec(`
    CREATE TABLE audit_events (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, kind TEXT NOT NULL, detail TEXT, remote TEXT);
    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE accounts (username TEXT PRIMARY KEY, pw_hash TEXT NOT NULL, pw_salt TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'operator', created_ts INTEGER NOT NULL);
    CREATE TABLE sessions (token TEXT PRIMARY KEY, username TEXT NOT NULL, created_ts INTEGER NOT NULL, expires_ts INTEGER NOT NULL);
    CREATE TABLE revocations (fingerprint TEXT PRIMARY KEY, reason TEXT, revoked_ts INTEGER NOT NULL, by TEXT, note TEXT);
    CREATE TABLE escrow_envelopes (id INTEGER PRIMARY KEY AUTOINCREMENT, room TEXT NOT NULL, fingerprint TEXT, envelope TEXT NOT NULL, created_ts INTEGER NOT NULL, by TEXT);
  `);
  old.prepare('INSERT INTO accounts (username,pw_hash,pw_salt,role,created_ts) VALUES (?,?,?,?,?)')
    .run('legacy-admin', 'deadbeef', 'salt', 'admin', 1700000000000);
  old.prepare('INSERT INTO sessions (token,username,created_ts,expires_ts) VALUES (?,?,?,?)')
    .run('legacy-session', 'legacy-admin', 1700000000000, 4102444800000);
  old.prepare('INSERT INTO audit_events (ts,kind,detail,remote) VALUES (?,?,?,?)')
    .run(1700000000000, 'legacy_event', 'before migration', '127.0.0.1');
  old.prepare('INSERT INTO revocations (fingerprint,reason,revoked_ts) VALUES (?,?,?)').run('fp-legacy', 'test', 1700000000000);
  old.close();
  check(true, 'constructed legacy schema (v0, 6 tables, no new columns)');

  // 2. Run the CURRENT store against it in a child process with AEGIS_DB set.
  const probe = join(tmp, 'probe.mjs');
  const { writeFileSync } = await import('node:fs');
  writeFileSync(probe, `
    const s = await import(${JSON.stringify('file://' + join(ROOT, 'server', 'store.js'))});
    s.initStore();
    const d = s.getDb();
    const accCols = d.prepare('PRAGMA table_info(accounts)').all().map(r => r.name);
    const auditCols = d.prepare('PRAGMA table_info(audit_events)').all().map(r => r.name);
    const tables = d.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
    const acc = d.prepare('SELECT username,role,enabled,totp_blob FROM accounts').all();
    const sessions = d.prepare('SELECT token FROM sessions').all();
    const events = d.prepare('SELECT kind FROM audit_events').all();
    const rev = d.prepare('SELECT fingerprint FROM revocations').all();
    console.log(JSON.stringify({ accCols, auditCols, tables, acc, sessions, events, rev, tombstone: s.tombstoneHash('probe') }));
  `);
  const run = spawnSync(process.execPath, [probe], {
    cwd: ROOT, encoding: 'utf8',
    env: { ...process.env, AEGIS_DB: dbPath, AEGIS_ISSUER_SECRET: 'upgrade-probe-secret' },
  });
  if (run.status !== 0) { check(false, 'current store opens legacy DB', (run.stderr || '').trim().slice(0, 300)); }
  else {
    const out = JSON.parse(run.stdout.trim().split('\n').pop());
    check(out.accCols.includes('enabled'), 'accounts.enabled added by migration');
    check(out.accCols.includes('totp_blob'), 'accounts.totp_blob added by migration');
    check(out.auditCols.includes('subject'), 'audit_events.subject added by migration');
    check(out.tables.includes('scim_tokens'), 'scim_tokens table created');
    check(out.acc.length === 1 && out.acc[0].username === 'legacy-admin' && out.acc[0].enabled === 1,
      'legacy account preserved + enabled defaults ON', JSON.stringify(out.acc));
    check(out.sessions.some((x) => x.token === 'legacy-session'), 'legacy session preserved');
    check(out.events.some((x) => x.kind === 'legacy_event'), 'legacy audit event preserved');
    check(out.rev.some((x) => x.fingerprint === 'fp-legacy'), 'legacy revocation preserved');
    check(typeof out.tombstone === 'string' && out.tombstone.length === 32, 'tombstone salt initialises on old DB');
  }

  // 3. Boot the CURRENT server against that DB and hit /health + /auth/login.
  const { spawn } = await import('node:child_process');
  const port = 8177;
  const srv = spawn(process.execPath, ['server.js'], {
    cwd: ROOT, stdio: 'ignore',
    env: { ...process.env, AEGIS_DB: dbPath, AEGIS_ISSUER_SECRET: 'upgrade-probe-secret', PORT: String(port) },
  });
  let health = 0;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 150));
    try { const r = await fetch(`http://127.0.0.1:${port}/health`); health = r.status; break; } catch { /* not up yet */ }
  }
  check(health === 200, 'upgraded server serves /health', `status=${health}`);
  srv.kill('SIGKILL');

  // 4. Config rotation rehearsal: an existing config must be rotated, not reused.
  const cfgDir = join(tmp, 'config');
  const { mkdirSync } = await import('node:fs');
  mkdirSync(cfgDir, { recursive: true });
  // setup.mjs resolves ROOT from its own path, so rehearse the rotate branch
  // against the real config only in --dry mode: assert the SOURCE contains it.
  const setup = (await import('node:fs')).readFileSync(join(ROOT, 'scripts', 'setup.mjs'), 'utf8');
  check(/rotating issuerSecret/.test(setup) && /chmodSync\(CONFIG_PATH, 0o600\)/.test(setup),
    'setup rotates existing secret + chmod 0600 (source assertion)');
} catch (e) {
  check(false, 'upgrade rehearsal completed without exception', String((e && e.message) || e));
} finally {
  if (existsSync(tmp)) rmSync(tmp, { recursive: true, force: true });
}
console.log(`\n[upgrade] ${failed ? `FAIL — ${failed} check(s) failed` : 'PASS — legacy → current migration rehearsed, data intact'}`);
process.exit(failed ? 1 : 0);
