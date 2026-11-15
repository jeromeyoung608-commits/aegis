// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for blind-relay (zero-knowledge WebSocket relay).
 * Run: node --test   (or: npm test)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  generateRootKey,
  exportPublicKey,
  importPublicKey,
  issueToken,
  verifyToken,
} from '../../token-gate/src/token-gate.js';
import { createRelay } from '../src/relay.js';
import { connectWs } from '../src/ws-lite.js';

const wc = globalThis.crypto;

/* ------------------------------- helpers -------------------------------- */

async function aesEncrypt(sym, obj) {
  const iv = wc.getRandomValues(new Uint8Array(12));
  const ct = await wc.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sym,
    new TextEncoder().encode(JSON.stringify(obj))
  );
  return Buffer.from(iv).toString('base64') + '.' + Buffer.from(ct).toString('base64');
}

async function aesDecrypt(sym, env) {
  const [ivB64, ctB64] = env.split('.');
  const iv = Buffer.from(ivB64, 'base64');
  const ct = Buffer.from(ctB64, 'base64');
  const pt = await wc.subtle.decrypt({ name: 'AES-GCM', iv }, sym, ct);
  return JSON.parse(new TextDecoder().decode(pt));
}

function waitUntil(cond, ms = 2000) {
  return new Promise((res, rej) => {
    const t0 = Date.now();
    const i = setInterval(() => {
      if (cond()) {
        clearInterval(i);
        res();
      } else if (Date.now() - t0 > ms) {
        clearInterval(i);
        rej(new Error('waitUntil timeout'));
      }
    }, 20);
  });
}

function connectAuth(url, token, room, onData) {
  // Resolves only AFTER the relay admits us (welcome). A denied connection
  // rejects, so callers can assert on admission reliably.
  return new Promise((resolve, reject) => {
    const state = { authed: false, conn: null, welcomeRes: null };
    const welcomeP = new Promise((res) => {
      state.welcomeRes = res;
    });
    connectWs(url, {
      onMessage: (m) => {
        let o;
        try {
          o = JSON.parse(m);
        } catch {
          return;
        }
        if (o.type === 'welcome') {
          state.authed = true;
          state.welcomeRes();
          resolve({ conn: state.conn, welcome: welcomeP });
        } else if (o.type === 'data') {
          if (onData) onData(o);
        }
      },
      onClose: () => {
        if (!state.authed) {
          try {
            state.conn && state.conn.close();
          } catch {
            /* ignore */
          }
          reject(new Error('admission denied'));
        }
      },
      onError: reject,
    })
      .then((conn) => {
        state.conn = conn;
        conn.send(JSON.stringify({ type: 'hello', room, token }));
      })
      .catch(reject);
  });
}

async function freshRelay() {
  const root = await generateRootKey();
  const rootPub = await importPublicKey(await exportPublicKey(root.publicKey));
  const relay = createRelay({
    verifyToken: (token, room) => verifyToken(rootPub, token, { room }),
  });
  await relay.listen(0);
  const port = relay.address().port;
  return { relay, root, url: `ws://127.0.0.1:${port}/?room=` };
}

/* -------------------------------- tests --------------------------------- */

test('admits token holders, routes ciphertext, and stays BLIND', async () => {
  const { relay, root, url } = await freshRelay();
  const sym = await wc.subtle.importKey(
    'raw',
    wc.getRandomValues(new Uint8Array(32)),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
  const tokA = await issueToken(root.privateKey, { room: 'R1' });
  const tokB = await issueToken(root.privateKey, { room: 'R1' });

  const a = await connectAuth(url + 'R1', tokA, 'R1');
  await a.welcome;
  const bReceived = [];
  const b = await connectAuth(url + 'R1', tokB, 'R1', (o) => bReceived.push(o));
  await b.welcome;

  const secret = 'SECRET coordinates (12,34) on the board';
  const env = await aesEncrypt(sym, { note: secret });
  a.conn.send(JSON.stringify({ type: 'data', ciphertext: env }));

  await waitUntil(() => bReceived.length > 0);
  assert.equal(bReceived.length, 1);
  const plain = await aesDecrypt(sym, bReceived[0].ciphertext);
  assert.equal(plain.note, secret);

  // THE ZERO-KNOWLEDGE PROOF: the relay's observed wire log has no plaintext.
  const all = relay.getObserved().join('\n');
  assert.ok(!all.includes('SECRET'), 'relay must never see the plaintext');
  assert.ok(!all.includes('coordinates'), 'relay must never see the plaintext');
  // The relay only ever saw the ciphertext envelope + the token (which carries
  // no document bytes).
  assert.ok(all.includes('ciphertext'), 'relay saw only the encrypted envelope');

  a.conn.close();
  b.conn.close();
  await relay.close();
});

test('rejects connections that present no / bad token', async () => {
  const { relay, root, url } = await freshRelay();
  try {
    await assert.rejects(
      connectAuth(url + 'R1', 'not.a.valid.token', 'R1'),
      /admission denied/
    );
  } finally {
    await relay.close();
  }
});

test('rejects a token issued for a different room', async () => {
  const { relay, root, url } = await freshRelay();
  const tokR9 = await issueToken(root.privateKey, { room: 'R9' });
  try {
    await assert.rejects(connectAuth(url + 'R1', tokR9, 'R1'), /admission denied/);
  } finally {
    await relay.close();
  }
});

test('does NOT echo a message back to its sender', async () => {
  const { relay, root, url } = await freshRelay();
  const tokA = await issueToken(root.privateKey, { room: 'R1' });
  const tokB = await issueToken(root.privateKey, { room: 'R1' });
  const aGot = [];
  const a = await connectAuth(url + 'R1', tokA, 'R1', (o) => aGot.push(o));
  await a.welcome;
  const b = await connectAuth(url + 'R1', tokB, 'R1');
  await b.welcome;
  a.conn.send(JSON.stringify({ type: 'data', ciphertext: 'x' }));
  await waitUntil(() => false, 300).catch(() => {}); // let it settle
  assert.equal(aGot.length, 0, 'sender must not receive its own message');
  a.conn.close();
  b.conn.close();
  await relay.close();
});

test('messages do not cross rooms', async () => {
  const { relay, root, url } = await freshRelay();
  const sym = await wc.subtle.importKey(
    'raw',
    wc.getRandomValues(new Uint8Array(32)),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
  const tokR1 = await issueToken(root.privateKey, { room: 'R1' });
  const tokR2 = await issueToken(root.privateKey, { room: 'R2' });
  const a = await connectAuth(url + 'R1', tokR1, 'R1');
  await a.welcome;
  const r2Got = [];
  const c = await connectAuth(url + 'R2', tokR2, 'R2', (o) => r2Got.push(o));
  await c.welcome;
  const env = await aesEncrypt(sym, { note: 'cross-room leak?' });
  a.conn.send(JSON.stringify({ type: 'data', ciphertext: env }));
  await waitUntil(() => false, 300).catch(() => {});
  assert.equal(r2Got.length, 0, 'a message in R1 must not reach R2');
  a.conn.close();
  c.conn.close();
  await relay.close();
});
