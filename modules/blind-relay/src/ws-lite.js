// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
/**
 * ========================================================================
 * ws-lite — minimal zero-dependency WebSocket (RFC 6455) toolkit
 * ========================================================================
 *
 * Two pieces, both dependency-free (Node built-ins only):
 *   1. Frame codec      — encodeFrame / parseFrames / acceptKey
 *   2. Node WS client   — connectWs() for tests and the relay's own tooling
 *
 * We implement just enough of RFC 6455 (text frames, masking, close) to relay
 * JSON envelopes. The browser side uses the native `WebSocket` global via
 * client.js, so this file is the server/test side only.
 */
import { createHash, randomBytes } from 'node:crypto';
import { request } from 'node:http';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/** Compute the Sec-WebSocket-Accept value for a handshake key. */
export function acceptKey(key) {
  return createHash('sha1').update(key + GUID).digest('base64');
}

/** Encode a single WebSocket frame. Server->client is unmasked; client->server masked. */
export function encodeFrame(data, { opcode = 0x1, mask = false, fin = true } = {}) {
  const payload = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  header[0] = (fin ? 0x80 : 0) | (opcode & 0x0f);
  if (mask) {
    header[1] |= 0x80;
    const maskKey = randomBytes(4);
    const masked = Buffer.alloc(len);
    for (let i = 0; i < len; i++) masked[i] = payload[i] ^ maskKey[i & 3];
    return Buffer.concat([header, maskKey, masked]);
  }
  return Buffer.concat([header, payload]);
}

/**
 * Parse as many complete frames as possible from `buffer`.
 * Returns { frames:[{opcode, fin, payload:Buffer}], rest:Buffer }.
 * Honors the per-frame mask bit (set by clients, clear by servers).
 */
export function parseFrames(buffer, _opts = {}) {
  const frames = [];
  let i = 0;
  while (i + 2 <= buffer.length) {
    const b0 = buffer[i];
    const b1 = buffer[i + 1];
    const opcode = b0 & 0x0f;
    const fin = (b0 & 0x80) !== 0;
    let len = b1 & 0x7f;
    let pos = i + 2;
    if (len === 126) {
      if (pos + 2 > buffer.length) break;
      len = buffer.readUInt16BE(pos);
      pos += 2;
    } else if (len === 127) {
      if (pos + 8 > buffer.length) break;
      len = Number(buffer.readBigUInt64BE(pos));
      pos += 8;
    }
    let maskKey = null;
    if (b1 & 0x80) {
      if (pos + 4 > buffer.length) break;
      maskKey = buffer.subarray(pos, pos + 4);
      pos += 4;
    }
    if (pos + len > buffer.length) break;
    let payload = buffer.subarray(pos, pos + len);
    if (maskKey) {
      const out = Buffer.alloc(len);
      for (let k = 0; k < len; k++) out[k] = payload[k] ^ maskKey[k & 3];
      payload = out;
    }
    frames.push({ opcode, fin, payload });
    i = pos + len;
  }
  return { frames, rest: buffer.subarray(i) };
}

/**
 * Node WebSocket client for tests / tooling. Resolves once the handshake
 * completes. The returned connection masks outbound frames (per RFC) and
 * parses inbound (server) frames.
 */
export function connectWs(url, handlers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const key = randomBytes(16).toString('base64');
    const req = request({
      hostname: u.hostname,
      port: u.port || 80,
      path: u.pathname + u.search,
      headers: {
        Connection: 'Upgrade',
        Upgrade: 'websocket',
        'Sec-WebSocket-Key': key,
        'Sec-WebSocket-Version': '13',
      },
    });

    let socket = null;
    let buf = Buffer.alloc(0);

    const conn = {
      send(text) {
        if (socket) socket.write(encodeFrame(Buffer.from(text, 'utf8'), { mask: true }));
      },
      close() {
        if (socket) socket.end();
      },
      get ready() {
        return !!socket;
      },
    };

    function pump() {
      const { frames, rest } = parseFrames(buf, { masked: false });
      buf = rest;
      for (const f of frames) {
        if (f.opcode === 0x8) {
          if (handlers.onClose) handlers.onClose();
          return;
        }
        if (f.opcode === 0x1 || f.opcode === 0x2) {
          if (handlers.onMessage) handlers.onMessage(f.payload.toString('utf8'));
        }
      }
    }

    req.on('upgrade', (_res, sock, head) => {
      socket = sock;
      buf = Buffer.concat([buf, head]);
      pump();
      if (handlers.onOpen) handlers.onOpen(conn);
      resolve(conn);
      socket.on('data', (d) => {
        buf = Buffer.concat([buf, d]);
        pump();
      });
      socket.on('close', () => handlers.onClose && handlers.onClose());
      socket.on('error', (e) => handlers.onError && handlers.onError(e));
    });
    req.on('error', (e) => {
      if (handlers.onError) handlers.onError(e);
      reject(e);
    });
    req.end();
  });
}
