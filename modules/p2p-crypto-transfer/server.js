// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// server.js — minimal, ZERO-dependency signaling + static file server.
//
// Responsibilities (and ONLY these):
//   1. Relay WebRTC SDP/ICE between the two peers in a room. The server inspects
//      NOTHING about the payload — it just stores messages and forwards any message
//      from a DIFFERENT peer. File bytes and AES keys never touch this process.
//   2. Serve the static client (index.html + /src/*.js).
//
// Security model: the signaling channel is a meeting point, not a trusted party.
// Even a fully compromised signaling server learns only SDP/ICE (IP hints, room
// ids) — never file content, because the file is AES-GCM encrypted in the browser
// with a key derived from a passphrase the server never sees.
//
// Zero dependencies: uses only node: built-ins. Long-polling implements the relay
// so we need no WebSocket library.
//
// HTTPS: WebRTC + crypto.subtle require a secure context. On localhost that is
// automatic. For cross-machine LAN you must serve over HTTPS — drop `key.pem` and
// `cert.pem` next to this file (see README "Generate a self-signed certificate")
// and they will be used.

import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8080;
const ROOM_TTL_MS = 30 * 60 * 1000; // rooms auto-expire after 30 min of idleness
const MAX_MSG_BYTES = 1_000_000;    // reject absurdly large signaling payloads

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

// ---- in-memory signaling store ----------------------------------------------
// room -> { messages: [{id, from, body}], cursors: Map(fromId -> lastDeliveredId),
//          waiters: [{from, res, timer}] }
const rooms = new Map();
let msgSeq = 0;

function getRoom(name) {
  let r = rooms.get(name);
  if (!r) { r = { messages: [], cursors: new Map(), waiters: [] }; rooms.set(name, r); }
  return r;
}

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(body);
}

// Try to hand `waiter` the next undelivered message from a different peer.
function tryDeliver(room, waiter) {
  const cursor = room.cursors.get(waiter.from) || 0;
  const next = room.messages.find((m) => m.from !== waiter.from && m.id > cursor);
  if (!next) return false;
  room.cursors.set(waiter.from, next.id);
  clearTimeout(waiter.timer);
  room.waiters = room.waiters.filter((w) => w !== waiter);
  json(waiter.res, 200, { msg: next.body });
  return true;
}

function handleSignal(req, res, url) {
  const roomName = url.searchParams.get('room');
  const from = url.searchParams.get('from');
  if (!roomName || !from) { json(res, 400, { error: 'room and from are required' }); return; }

  if (req.method === 'GET') {
    const room = getRoom(roomName);
    const waiter = { from, res, timer: null };
    if (tryDeliver(room, waiter)) return; // delivered immediately
    waiter.timer = setTimeout(() => {
      room.waiters = room.waiters.filter((w) => w !== waiter);
      json(res, 204, {}); // long-poll timeout; client re-polls
    }, 20_000);
    room.waiters.push(waiter);
    return;
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', (c) => {
      body += c;
      if (body.length > MAX_MSG_BYTES) req.destroy();
    });
    req.on('end', () => {
      let msg;
      try { msg = JSON.parse(body); } catch { json(res, 400, { error: 'invalid json' }); return; }
      const room = getRoom(roomName);
      room.messages.push({ id: ++msgSeq, from, body: msg });
      // Wake every waiter that is NOT the sender (there is at most one peer).
      room.waiters.filter((w) => w.from !== from).forEach((w) => tryDeliver(room, w));
      json(res, 200, { ok: true });
    });
    return;
  }

  json(res, 405, { error: 'method not allowed' });
}

// ---- static file serving -----------------------------------------------------
function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  if (p === '/') p = '/index.html';
  // Prevent path traversal: resolve and ensure it stays under ROOT.
  const filePath = path.join(ROOT, p);
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/signal') { handleSignal(req, res, url); return; }
  serveStatic(req, res, url);
}

// ---- boot --------------------------------------------------------------------
const keyPath = path.join(ROOT, 'key.pem');
const certPath = path.join(ROOT, 'cert.pem');
let server;
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  server = https.createServer({ key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }, handler);
  console.log('HTTPS signaling server (key.pem + cert.pem detected)');
} else {
  server = http.createServer(handler);
  console.log('HTTP signaling server (no cert found)');
}

// Best-effort room GC so memory does not grow unbounded.
setInterval(() => {
  for (const [name, room] of rooms) {
    if (room.waiters.length === 0 && room.messages.length && Date.now() - (room.lastActive || 0) > ROOM_TTL_MS) {
      rooms.delete(name);
    } else {
      room.lastActive = room.lastActive || Date.now();
    }
  }
}, 60_000).unref();

server.listen(PORT, () => {
  console.log(`Signaling + static server listening on http://localhost:${PORT}`);
  console.log('Open this URL in TWO browser tabs/devices, enter the same room + passphrase.');
});
