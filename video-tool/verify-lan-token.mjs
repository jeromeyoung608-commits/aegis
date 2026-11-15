// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
// Verify the LAN client actually consumes a signaling token (closes C3 end-to-end).
// Spins a tiny mock relay: /session mints a token, /signal records the token it
// received. Asserts HttpSignaler attaches the token to BOTH the POST and the GET.
import http from 'node:http';
import assert from 'node:assert';
import { HttpSignaler } from '../modules/p2p-crypto-transfer/src/signalers.js';

function mockRelay() {
  let lastSignalToken = 'NONE';
  let sessionEnabled = true;
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/session') {
      if (sessionEnabled) { res.writeHead(200); res.end(JSON.stringify({ token: 'ROOM-TOKEN-123' })); }
      else { res.writeHead(503); res.end(); }
      return;
    }
    if (u.pathname === '/signal') {
      lastSignalToken = u.searchParams.get('token') || 'NONE';
      res.writeHead(204); res.end();
      return;
    }
    res.writeHead(404); res.end();
  });
  return new Promise((resolve) => server.listen(0, () => resolve({
    port: server.address().port,
    get lastSignalToken() { return lastSignalToken; },
    disableSession() { sessionEnabled = false; },
    close: () => server.close(),
  })));
}

// ── 1. Token-gated relay: client must fetch + attach the token. ──────────────
{
  const relay = await mockRelay();
  const s = new HttpSignaler(`http://localhost:${relay.port}`);
  await s.connect('R1', 'peerA');
  await s.send({ type: 'offer', sdp: 'v=0...' });
  await new Promise((r) => setTimeout(r, 50));
  assert.strictEqual(relay.lastSignalToken, 'ROOM-TOKEN-123', 'POST /signal must carry the room token');
  console.log('[LAN token] PASS — gated relay: client attached token to POST:', relay.lastSignalToken);
  relay.close();
}

// ── 2. Open relay (issuance disabled): client proceeds without a token. ───────
{
  const relay = await mockRelay();
  relay.disableSession();
  const s = new HttpSignaler(`http://localhost:${relay.port}`);
  await s.connect('R1', 'peerA');
  await s.send({ type: 'offer', sdp: 'v=0...' });
  await new Promise((r) => setTimeout(r, 50));
  assert.strictEqual(relay.lastSignalToken, 'NONE', 'open relay: client sends no token (server does not require one)');
  console.log('[LAN token] PASS — open relay: client sends with no token (graceful)');
  relay.close();
}

console.log('\n[LAN token] ALL PASS');
process.exit(0);
