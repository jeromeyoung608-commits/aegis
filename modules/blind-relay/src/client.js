// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * ========================================================================
 * blind-relay / client.js — browser-side relay client + E2E envelope crypto
 * ========================================================================
 *
 * Browser-safe (no Node imports). Two responsibilities:
 *   1. connectRelay(url, handlers) — wrap the native WebSocket to talk to a
 *      running blind-relay (or any RFC6455 server). Handles the hello/welcome
 *      handshake and the token gate.
 *   2. End-to-end envelope crypto — encryptEnvelope / decryptEnvelope using
 *      AES-GCM. The relay forwards these envelopes without ever holding the
 *      key, so the "server-blind" property holds end to end.
 */

const wc = globalThis.crypto;

/* --------------------------- relay connection --------------------------- */

/**
 * Connect to a relay room. Sends the `hello` with the room token, waits for
 * `welcome`, then exposes send()/close().
 * @returns Promise<{ send(obj), close(), onMessage }>
 */
export function connectRelay(url, { token, room, onMessage, onClose, onError } = {}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const api = {
      send(obj) {
        ws.send(JSON.stringify(obj));
      },
      close() {
        ws.close();
      },
    };
    ws.addEventListener('open', () => {
      api.send({ type: 'hello', room, token });
    });
    ws.addEventListener('message', (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg.type === 'welcome') {
        resolve(api);
      } else if (msg.type === 'denied') {
        reject(new Error('relay denied admission (bad/expired token)'));
        ws.close();
      } else if (onMessage) {
        onMessage(msg);
      }
    });
    ws.addEventListener('close', () => onClose && onClose());
    ws.addEventListener('error', (e) => onError && onError(e));
  });
}

/* --------------------------- E2E envelope crypto ------------------------ */

/** Import a 32-byte raw shared secret as an AES-GCM key. */
export async function makeSymKey(raw32) {
  return wc.subtle.importKey('raw', raw32, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

function b64(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function unb64(str) {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Encrypt an arbitrary object into a self-contained base64 envelope:
 *   iv (12 bytes) || ciphertext || authTag (appended by AES-GCM).
 * The relay sees ONLY this string.
 */
export async function encryptEnvelope(symKey, obj) {
  const iv = wc.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify(obj));
  const ct = await wc.subtle.encrypt({ name: 'AES-GCM', iv }, symKey, plain);
  return b64(iv) + '.' + b64(new Uint8Array(ct));
}

/** Decrypt an envelope produced by encryptEnvelope. */
export async function decryptEnvelope(symKey, envelope) {
  const [ivB64, ctB64] = envelope.split('.');
  const iv = unb64(ivB64);
  const ct = unb64(ctB64);
  const plain = await wc.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, symKey, ct);
  return JSON.parse(new TextDecoder().decode(plain));
}

/* --------------------------- external contract -------------------------- */

if (typeof window !== 'undefined') {
  window.BlindRelayClient = { connectRelay, makeSymKey, encryptEnvelope, decryptEnvelope };
}
