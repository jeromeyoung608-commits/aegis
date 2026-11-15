// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
/**
 * ========================================================================
 * sync-canvas / aegis-cosign.js — authenticated blind co-signing (integration demo)
 * ========================================================================
 *
 * This is the reference recipe for how sync-canvas (the host) consumes three
 * independent modules:
 *   - token-gate           -> issue/verify room tokens (admission control)
 *   - detached-hash-signer -> blind-sign the document hash; bytes never leave local
 *   - blind-relay/client   -> end-to-end envelope encrypt/decrypt (relay sees ciphertext)
 *
 * Flow (one "authenticated blind co-signing"):
 *   1. The issuer uses token-gate to generate a root key and issue a time-bound
 *      BOARD-1 token.
 *   2. Take a secret document, compute only SHA-256 -> docHash (original stays local).
 *   3. Three executives each sign docHash (detached signing) via detached-hash-signer.
 *   4. Assemble + verify the detached bundle -- it holds only hash + signatures, no original.
 *   5. The bundle is end-to-end encrypted by blind-relay and "passes the relay";
 *      the relay sees only ciphertext.
 *   6. The relay verifies the token with token-gate; a forged token is rejected.
 */

import * as TokenGate from '../../token-gate/src/token-gate.js';
import * as Signer from '../../detached-hash-signer/src/detached-hash-signer.js';
import { makeSymKey, encryptEnvelope, decryptEnvelope } from '../../blind-relay/src/client.js';

const wc = globalThis.crypto;

function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  Object.assign(n, props);
  for (const k of kids) n.append(k);
  return n;
}

export async function runCosignDemo(mount) {
  mount.innerHTML = '';
  const log = el('pre', { className: 'sig' });
  const out = el('div');
  const btn = el('button', { textContent: '▶ Run: authenticated blind co-signing' });
  mount.append(btn, log, out);

  const step = (m) => (log.textContent += m + '\n');

  btn.onclick = async () => {
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    log.textContent = '';
    out.innerHTML = '';
    try {
      // 1) Token-gated admission
      step('① Issuer generates root key and issues a BOARD-1 token …');
      const root = await TokenGate.generateRootKey();
      const rootPub = await TokenGate.importPublicKey(await TokenGate.exportPublicKey(root.publicKey));
      const tok = await TokenGate.issueToken(root.privateKey, { room: 'BOARD-1', ttlMs: 10 * 60 * 1000 });
      const gateOk = (await TokenGate.verifyToken(rootPub, tok, { room: 'BOARD-1' })).ok;
      step(`   token check: ${gateOk ? 'ADMIT' : 'DENY'}`);

      // 2) Blind signing: only hash
      step('② Take a secret document, compute SHA-256 hash only (original stays local)…');
      const secretDoc = 'TOP SECRET: cross-border M&A terms v7 (undisclosed consideration)';
      const docHash = await Signer.sha256Hex(new TextEncoder().encode(secretDoc));
      step(`   docHash = ${docHash}`);

      // 3) Three executives sign docHash (detached signing)
      step('③ Three executives each sign docHash (blind)…');
      const signers = [];
      for (const id of ['CEO', 'CFO', 'Legal']) {
        const kp = await Signer.generateKeyPair();
        const pub = await Signer.exportPublicKey(kp.publicKey);
        const sig = await Signer.signHash(kp.privateKey, docHash);
        signers.push({ id, pub, sig });
        step(`   ${id} signed`);
      }

      // 4) Assemble + verify the detached bundle
      step('④ Assemble the detached signature bundle and verify…');
      const bundle = Signer.makeBundle({ docName: 'deal-v7.pdf', docHash, signers });
      const res = await Signer.verifyBundle(bundle);
      const detached = Signer.isDetached(bundle);
      step(`   verify: ${res.ok ? '✓ all three valid' : '✗ ' + res.reason}; detached: ${detached ? '✓ no original in bundle' : '✗'}`);

      // 5) Pass the blind relay (end-to-end encrypted; relay sees ciphertext only)
      step('⑤ Bundle is end-to-end encrypted and forwarded through the blind relay…');
      const sym = await makeSymKey(wc.getRandomValues(new Uint8Array(32)));
      const env = await encryptEnvelope(sym, { kind: 'cosign', bundle });
      const relaySeen = [env]; // the only thing the relay ever sees
      const decrypted = await decryptEnvelope(sym, relaySeen[0]);
      const blind = !relaySeen.join('\n').includes(secretDoc);
      step(`   does the relay see the original? ${blind ? 'no (server blind spot holds)' : 'yes (LEAK!)'}`);

      // 6) Forged token rejected
      step('⑥ Relay verifies a forged token…');
      const forged = tok.slice(0, -1) + (tok.slice(-1) === 'A' ? 'B' : 'A');
      const bad = (await TokenGate.verifyToken(rootPub, forged, { room: 'BOARD-1' })).ok;
      step(`   forged token: ${bad ? 'ADMIT (anomaly)' : 'DENY (correctly rejected)'}`);

      // Summary
      out.append(
        el('div', {}, el('span', { className: 'tag ok', textContent: 'Token admission' }), document.createTextNode(gateOk ? ' ADMIT' : ' DENY')),
        el('br'),
        el('div', {}, el('span', { className: 'tag ok', textContent: 'Blind / detached' }), document.createTextNode(detached && res.ok ? ' original never leaves local, three valid signs' : ' verification failed')),
        el('br'),
        el('div', {}, el('span', { className: 'tag ok', textContent: 'Zero-knowledge relay' }), document.createTextNode(blind ? ' server sees ciphertext only' : ' leak')),
        el('br'),
        el('div', {}, el('span', { className: 'tag ok', textContent: 'Token anti-forgery' }), document.createTextNode(!bad ? ' forged token rejected' : ' anomaly'))
      );
    } catch (e) {
      step('ERROR: ' + e.message);
    } finally {
      btn.disabled = false;
      btn.setAttribute('aria-busy', 'false');
    }
  };
}

// When imported as a module script by index.html, auto-mount into #cosign.
if (typeof document !== 'undefined') {
  const mount = document.getElementById('cosign');
  if (mount) runCosignDemo(mount);
}
