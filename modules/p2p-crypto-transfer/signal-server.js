// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// signal-server.js — standalone, ZERO-dependency WebRTC signaling relay for the
// p2p-crypto-transfer "lan" mode. The same protocol is also served inline by the
// Aegis workbench (server.js) at /signal; this file lets you deploy P2P transfer
// on its own, without the whole workbench.
//
// Protocol (matches src/signalers.js HttpSignaler):
//   POST /signal?room=R&from=ID   {json sdp/control}  -> store, wake waiters
//   GET  /signal?room=R&from=ID   long-poll -> {msg} of a message whose sender
//                                    id != ID (never echo to self), else 204.
//
// Security: the relay only ever sees room ids, peer ids and SDP/ICE. File bytes
// and the AES key never touch it (they ride the peer-to-peer DataChannel).

import http from 'node:http';

export function createSignalServer({ port = 0 } = {}) {
  const rooms = new Map(); // room -> { messages, cursors, waiters, lastActive }
  let msgSeq = 0;
  const MAX_MSG_BYTES = 1_000_000;

  function getRoom(name) {
    let r = rooms.get(name);
    if (!r) {
      r = { messages: [], cursors: new Map(), waiters: [], lastActive: Date.now() };
      // MUST be written back. Without this every request builds a fresh empty room,
      // so a POSTed offer lands in a throwaway object and the peer's long-poll never
      // sees it — the "B never receives A's offer" failure locked by signaling.test.
      rooms.set(name, r);
    }
    return r;
  }

  function tryDeliver(room, waiter) {
    const cursor = room.cursors.get(waiter.from) || 0;
    // Only deliver messages from a DIFFERENT peer — this is what prevents a peer
    // from receiving (and thus re-processing / self-applying) its own offer/answer.
    const next = room.messages.find((m) => m.from !== waiter.from && m.id > cursor);
    if (!next) return false;
    room.cursors.set(waiter.from, next.id);
    clearTimeout(waiter.timer);
    room.waiters = room.waiters.filter((w) => w !== waiter);
    waiter.res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    waiter.res.end(JSON.stringify({ msg: next.body }));
    return true;
  }

  function handleSignal(req, res, url) {
    const roomName = url.searchParams.get('room');
    const from = url.searchParams.get('from');
    if (!roomName || !from) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'room and from are required' }));
      return;
    }

    if (req.method === 'GET') {
      const room = getRoom(roomName);
      const waiter = { from, res, timer: null };
      if (tryDeliver(room, waiter)) return;
      waiter.timer = setTimeout(() => {
        room.waiters = room.waiters.filter((w) => w !== waiter);
        res.writeHead(204, { 'Cache-Control': 'no-store' });
        res.end();
      }, 20_000);
      room.waiters.push(waiter);
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', (c) => { body += c; if (body.length > MAX_MSG_BYTES) req.destroy(); });
      req.on('end', () => {
        let msg;
        try { msg = JSON.parse(body); } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'invalid json' }));
          return;
        }
        const room = getRoom(roomName);
        room.lastActive = Date.now();
        room.messages.push({ id: ++msgSeq, from, body: msg });
        // Wake every OTHER peer's parked long-poll (never the sender itself).
        room.waiters.filter((w) => w.from !== from).forEach((w) => tryDeliver(room, w));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      });
      return;
    }

    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'method not allowed' }));
  }

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/signal') { handleSignal(req, res, url); return; }
    res.writeHead(404);
    res.end('not found');
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      const { port: bound } = server.address();
      resolve({
        server,
        port: bound,
        // Test- and CI-safe close: clear every parked long-poll timer and socket,
        // otherwise a 20s waiter keeps the Node event loop (and `node --test`) alive
        // after the assertions have already passed.
        close: () => new Promise((res) => {
          for (const room of rooms.values()) {
            for (const w of room.waiters) {
              clearTimeout(w.timer);
              try { w.res.destroy(); } catch {}
            }
            room.waiters.length = 0;
          }
          server.close(() => res());
          try { server.closeAllConnections?.(); } catch {}
        }),
      });
    });
  });
}

// CLI: `node signal-server.js [port]` — defaults to 8787.
if (import.meta.url === `file://${process.argv[1]}`) {
  const p = Number(process.argv[2]) || 8787;
  createSignalServer({ port: p }).then(({ port }) => {
    console.log(`P2P signal server listening on http://localhost:${port}/signal`);
  });
}
