// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
// Aegis/scripts/test-p4p5.mjs — end-to-end regression for Phase 4 (relay + escrow)
// and Phase 5 (revocation). Boots server.js on a throwaway port, exercises the
// new endpoints, then shuts it down. Run: node scripts/test-p4p5.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
// Deterministic: start from a clean embedded store (revocation/escrow are persisted).
for (const f of ['aegis.db', 'aegis.db-wal', 'aegis.db-shm']) {
  try { fs.rmSync(path.join(ROOT, 'data', f), { force: true }); } catch {}
}
const PORT = 8098;
const BASE = `http://localhost:${PORT}`;

let pass = 0, fail = 0;
const check = (n, c, x) => { if (c) { pass++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n + (x ? ' — ' + x : '')); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const secret = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'local.json'), 'utf8')).issuerSecret;
const auth = { Authorization: 'Bearer ' + secret };
const get = (p, h = {}) => fetch(BASE + p, { headers: h });
const post = (p, body, h = {}) => fetch(BASE + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...h }, body: JSON.stringify(body) });
const del = (p, h = {}) => fetch(BASE + p, { method: 'DELETE', headers: h });

const server = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
process.on('exit', () => { try { server.kill(); } catch {} });

try {
  await sleep(2500);

  // 1) session token (also checks rtc/escrowPolicy surfaced)
  const sRes = await get('/session?room=R1', auth);
  const s = await sRes.json();
  check('session issues token', sRes.ok && !!s.token);
  check('session surfaces rtc/escrowPolicy fields', 'rtc' in s && 'escrowPolicy' in s);
  const tok = s.token;

  // 2) relay POST then GET (server-blind data relay)
  const rp = await post(`/relay?room=R1&from=A&token=${tok}`, { data: 'ciphertext-base64', seq: 1 });
  check('relay POST accepted', rp.ok);
  const rg = await get(`/relay?room=R1&from=B&token=${tok}`);
  const rm = await rg.json();
  check('relay GET delivers peer message', rg.ok && rm.msg && rm.msg.data === 'ciphertext-base64' && rm.msg.seq === 1, JSON.stringify(rm));

  // 3) relay without token → 401
  const r401 = await get(`/relay?room=R1&from=B&token=wrong`);
  check('relay rejects bad token (401)', r401.status === 401);

  // 4) revocation lifecycle
  const rvAdd = await post('/admin/revoke', { fingerprint: 'ab:cd', reason: 'test' }, auth);
  check('revoke add (operator)', rvAdd.ok);
  const rvList = await (await get('/admin/revoke', auth)).json();
  check('revocation listed', rvList.revocations.some((r) => r.fingerprint === 'ab:cd'));
  const sRev = await get('/session?room=R2&keyFingerprint=ab:cd', auth);
  check('session denied when key revoked (403)', sRev.status === 403);
  const rvDel = await del('/admin/revoke?fp=ab:cd', auth);
  check('revoke remove (operator)', rvDel.ok);
  const sOk = await get('/session?room=R2&keyFingerprint=ab:cd', auth);
  check('session allowed after revoke removed', sOk.ok);

  // operator-only: revoke list without auth → 401
  const rvNoAuth = await get('/admin/revoke');
  check('revoke list requires operator (401)', rvNoAuth.status === 401);

  // 5) escrow deposit (peer token) + retrieve (peer) + operator admin
  const eDep = await post('/escrow', { room: 'R1', token: tok, fingerprint: 'peer:fp', envelope: 'sealed-blob' });
  check('escrow deposit (room token)', eDep.ok);
  const eGet = await (await get(`/escrow?room=R1&token=${tok}`)).json();
  check('escrow peer retrieve', eGet.envelopes.some((e) => e.envelope === 'sealed-blob'));
  const eAdmin = await (await get('/escrow/admin', auth)).json();
  check('escrow operator admin list', Array.isArray(eAdmin.envelopes));
  const eNoAuth = await get('/escrow/admin');
  check('escrow admin requires operator (401)', eNoAuth.status === 401);

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
} catch (e) {
  console.error('TEST ERROR', e);
  fail++;
} finally {
  server.kill();
}
process.exit(fail ? 1 : 0);
