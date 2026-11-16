// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * ========================================================================
 * blind-relay — Zero-Knowledge WebSocket Relay (Node)
 * ========================================================================
 *
 * A dependency-free relay for cross-device Aegis sync. It is deliberately
 * BLIND:
 *   - It performs the WebSocket handshake and routes JSON envelopes between
 *     peers in the same room.
 *   - Admission is gated by an injected `verifyToken` (pair it with token-gate):
 *     a peer must present a valid, room-bound ECDSA token before it is let in.
 *   - It NEVER decrypts a payload. The `data` envelope it forwards is expected
 *     to already be end-to-end encrypted by the clients; the relay only ever
 *     stores/logs the *ciphertext* it saw on the wire. That log is exposed
 *     (getObserved) so an auditor can prove the server learned nothing.
 *
 * The relay has no document logic, no database, and no knowledge of room
 * membership beyond the live socket set. This is the "server-blind" guarantee.
 */
import http from 'node:http';
import { encodeFrame, parseFrames, acceptKey } from './ws-lite.js';

export function createRelay({ verifyToken, onObserve } = {}) {
  const observed = []; // every raw wire string the relay ever saw
  const rooms = new Map(); // room -> Set<conn>
  const conns = new Set(); // every live connection (for forced teardown)
  let server = null;

  // Resource ceilings. A blind relay is still a relay: without caps one client
  // can exhaust file descriptors, memory (observed[]) or parse time.
  const MAX_CONNECTIONS = 500;
  const MAX_FRAME_BYTES = 256 * 1024;   // one envelope of ciphertext
  const MAX_OBSERVED = 10_000;          // audit ring, not an unbounded array

  function observe(raw) {
    observed.push(raw);
    // Ring: keep the newest MAX_OBSERVED entries so a long-running relay cannot
    // silently grow to gigabytes of "proof" strings.
    if (observed.length > MAX_OBSERVED) observed.splice(0, observed.length - MAX_OBSERVED);
    if (onObserve) onObserve(raw);
  }

  function deny(conn) {
    try {
      conn.socket.write(encodeFrame(Buffer.from(JSON.stringify({ type: 'denied' })), { opcode: 0x8 }));
    } catch {
      /* ignore */
    }
    conn.socket.end();
  }

  function removeConn(conn) {
    if (conn.room && rooms.has(conn.room)) {
      rooms.get(conn.room).delete(conn);
    }
  }

  async function handleData(conn, d) {
    conn.buf = Buffer.concat([conn.buf, d]);
    if (conn.buf.length > MAX_FRAME_BYTES) { deny(conn); return; } // oversized / slow drip
    const { frames, rest } = parseFrames(conn.buf, { masked: true });
    conn.buf = rest;
    for (const f of frames) {
      if (f.opcode === 0x8) {
        conn.socket.end();
        return;
      }
      if (f.opcode !== 0x1) continue; // only JSON text envelopes
      if (f.payload.length > MAX_FRAME_BYTES) { deny(conn); return; }
      const text = f.payload.toString('utf8');
      observe(text); // <-- the server's only knowledge: the wire string
      let msg;
      try {
        msg = JSON.parse(text);
      } catch {
        continue;
      }
      if (!conn.authed) {
        if (msg.type !== 'hello') {
          deny(conn);
          return;
        }
        const decision = verifyToken
          ? await Promise.resolve(verifyToken(msg.token, msg.room))
          : { ok: true, room: msg.room };
        if (!decision || !decision.ok) {
          deny(conn);
          return;
        }
        conn.authed = true;
        conn.room = decision.room || msg.room;
        if (!rooms.has(conn.room)) rooms.set(conn.room, new Set());
        rooms.get(conn.room).add(conn);
        conn.socket.write(
          encodeFrame(Buffer.from(JSON.stringify({ type: 'welcome', room: conn.room })), { mask: false })
        );
      } else {
        // Blind forward: relay the EXACT bytes to every other peer in the room.
        // The relay does not parse or decrypt `msg` beyond the room routing key.
        const peers = rooms.get(conn.room);
        if (!peers) return;
        for (const peer of peers) {
          if (peer === conn) continue; // never echo to sender
          peer.socket.write(encodeFrame(f.payload, { mask: false }));
        }
      }
    }
  }

  server = http.createServer();
  server.on('upgrade', (req, socket) => {
    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.destroy();
      return;
    }
    // Refuse the handshake once the connection ceiling is reached, rather than
    // accepting sockets until the process runs out of descriptors.
    if (conns.size >= MAX_CONNECTIONS) {
      socket.write('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${acceptKey(key)}\r\n\r\n`
    );
    const conn = { socket, room: null, authed: false, buf: Buffer.alloc(0) };
    conns.add(conn);
    socket.on('data', (d) => {
      handleData(conn, d).catch(() => deny(conn));
    });
    socket.on('close', () => {
      conns.delete(conn);
      removeConn(conn);
    });
    socket.on('error', () => {
      conns.delete(conn);
      removeConn(conn);
    });
  });

  return {
    server,
    /** Start listening. port=0 picks a free port. Resolves when listening. */
    listen(port = 0, host = '127.0.0.1') {
      return new Promise((resolve) => server.listen(port, host, () => resolve()));
    },
    address() {
      return server.address();
    },
    /** Everything the relay saw on the wire (ciphertext only, by design). */
    getObserved() {
      return observed.slice();
    },
    close() {
      for (const c of conns) {
        try {
          c.socket.destroy();
        } catch {
          /* ignore */
        }
      }
      conns.clear();
      return new Promise((resolve) => server.close(() => resolve()));
    },
  };
}

/* --------------------------- CLI entry point ---------------------------- */
// `node src/relay.js --port 8081` starts a relay that trusts token-gate tokens.
// When run directly, we lazily import token-gate so the relay stays usable
// without it (token-agnostic) for embedding scenarios.
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.argv.find((a) => a.startsWith('--port='))?.split('=')[1] || 8081);
  const rootPubB64 = process.env.AEGIS_ROOT_PUB;
  // An open relay accepts anyone's ciphertext into any room. That is a lab-only
  // posture, so it must be asked for explicitly instead of being the default.
  if (!rootPubB64 && process.env.AEGIS_ALLOW_OPEN_RELAY !== '1') {
    console.error('[blind-relay] refusing to start: set AEGIS_ROOT_PUB (token-gate public key),');
    console.error('              or AEGIS_ALLOW_OPEN_RELAY=1 to run an unauthenticated lab relay.');
    process.exit(1);
  }
  const relay = createRelay({
    verifyToken: rootPubB64
      ? async (token, room) => {
          const { importPublicKey, verifyToken: vt } = await import('../../token-gate/src/token-gate.js');
          return vt(await importPublicKey(rootPubB64), token, { room });
        }
      : undefined,
  });
  relay.listen(port).then(() => {
    console.log(`[blind-relay] listening on ws://127.0.0.1:${port}  (token-gate: ${rootPubB64 ? 'on' : 'off'})`);
  });
}
