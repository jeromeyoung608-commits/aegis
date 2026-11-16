// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// Regression tests for token-gate — room-token issue/verify, with a focus on the
// forged-token acceptance bug (base64url padding-bit tampering, 2026-11-14 fix).
// Run: node modules/token-gate/test-token-gate.mjs
import * as TokenGate from './src/token-gate.js';

let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.error('  FAIL — ' + msg); } else console.log('  ok — ' + msg); };

// 1) A legitimately issued token verifies for the right room and is rejected for the wrong room.
{
  const root = await TokenGate.generateRootKey();
  const rootPub = await TokenGate.importPublicKey(await TokenGate.exportPublicKey(root.publicKey));
  const tok = await TokenGate.issueToken(root.privateKey, { room: 'BOARD-1', ttlMs: 10 * 60 * 1000 });
  const good = await TokenGate.verifyToken(rootPub, tok, { room: 'BOARD-1' });
  ok(good.ok === true, 'valid token admits for its room');
  const wrongRoom = await TokenGate.verifyToken(rootPub, tok, { room: 'BOARD-2' });
  ok(wrongRoom.ok === false && wrongRoom.reason === 'wrong-room', 'valid token denied for wrong room');
}

// 2) Forgery by flipping the last base64url char of the signature must ALWAYS be rejected.
//    Before the canonical-form guard this admitted ~21% of flips (padding-bit region).
{
  const root = await TokenGate.generateRootKey();
  const rootPub = await TokenGate.importPublicKey(await TokenGate.exportPublicKey(root.publicKey));
  let admitted = 0;
  for (let i = 0; i < 400; i++) {
    const tok = await TokenGate.issueToken(root.privateKey, { room: 'BOARD-1', ttlMs: 10 * 60 * 1000 });
    const forged = tok.slice(0, -1) + (tok.slice(-1) === 'A' ? 'B' : 'A');
    const r = await TokenGate.verifyToken(rootPub, forged, { room: 'BOARD-1' });
    if (r.ok) admitted++;
  }
  ok(admitted === 0, `single-char tail forge never admitted (admitted=${admitted})`);
}

// 3) General tamper of the signature segment is rejected (canonical guard + bad signature).
{
  const root = await TokenGate.generateRootKey();
  const rootPub = await TokenGate.importPublicKey(await TokenGate.exportPublicKey(root.publicKey));
  const tok = await TokenGate.issueToken(root.privateKey, { room: 'BOARD-1', ttlMs: 10 * 60 * 1000 });
  const parts = tok.split('.');
  const tampered = parts[0] + '.' + parts[1] + '.' + parts[2].slice(0, -2) + 'ZZ';
  const r = await TokenGate.verifyToken(rootPub, tampered, { room: 'BOARD-1' });
  ok(r.ok === false, 'tampered signature rejected');
}

// 4) Expired token is denied.
{
  const root = await TokenGate.generateRootKey();
  const rootPub = await TokenGate.importPublicKey(await TokenGate.exportPublicKey(root.publicKey));
  const tok = await TokenGate.issueToken(root.privateKey, { room: 'BOARD-1', exp: Date.now() - 1000 });
  const r = await TokenGate.verifyToken(rootPub, tok, { room: 'BOARD-1' });
  ok(r.ok === false && r.reason === 'expired', 'expired token denied');
}

console.log(failures === 0 ? '\nTOKEN-GATE TESTS PASS' : `\nTOKEN-GATE TESTS FAILED (${failures})`);
process.exit(failures === 0 ? 0 : 1);
