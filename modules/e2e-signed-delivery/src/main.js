// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * ========================================================================
 * Aegis — Privacy-First Local Data Cleansing Engine
 *
 * Licensed under the Apache License, Version 2.0 (SPDX: Apache-2.0). You may
 * not use this file except in compliance with the License. A copy ships as
 * LICENSE at the repository root; see http://www.apache.org/licenses/LICENSE-2.0
 * ========================================================================
 */

console.log(
  '%c Aegis %c Engine by Jerome Young | Contact: jeromeyoung608@gmail.com ',
  'background: #3fb950; color: #000; font-weight: bold; padding: 4px 8px; border-radius: 4px 0 0 4px;',
  'background: #1a2028; color: #b3bcc8; padding: 4px 8px; border-radius: 0 4px 4px 0;'
);

import { generateKeyPair, exportPublicKey, sha256, sign, toHex } from './sdk/crypto.js';
import { buildPdf, assembleArtifact, verifyArtifact, DELIM } from './sdk/pdf.js';
import { openSender, openReceiver } from './sdk/transport.js';

const $ = (id) => document.getElementById(id);
const PASSPHRASE = 'aegis-signed-demo'; // shared AES-GCM key for this same-machine demo

let privA, pubAb64, privB, pubBb64;
let fpAHex = null, fpBHex = null;
let stampedA = false, stampedB = false;
let sender = null;
// The transport is opened asynchronously during boot. Until it resolves, the
// Finalize button must stay disabled — otherwise a fast double-click reaches
// `sender.sendFile` with sender === null ("Cannot read properties of null").
let senderReady = null;
let transportReady = false;

function log(el, msg, kind = '') {
  const p = document.createElement('div');
  if (kind) p.style.color = kind === 'e' ? 'var(--err)' : kind === 's' ? 'var(--accent)' : '';
  p.textContent = '• ' + msg;
  el.appendChild(p);
  el.scrollTop = el.scrollHeight;
}

async function fingerprint(pubKey) {
  const raw = new Uint8Array(await crypto.subtle.exportKey('spki', pubKey));
  return (await sha256(raw)).hex.slice(0, 12).toUpperCase();
}

// ── Canvas document ──────────────────────────────────────────────────────────
function drawDoc() {
  const c = $('doc');
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#0b1f33';
  ctx.font = 'bold 26px Georgia, serif';
  ctx.fillText('SERVICE AGREEMENT', 40, 54);
  ctx.strokeStyle = '#0b1f33';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(40, 66); ctx.lineTo(c.width - 40, 66); ctx.stroke();
  ctx.font = '15px Georgia, serif';
  ctx.fillStyle = '#1a2a3a';
  const lines = [
    'This Master Services Agreement is entered into by and between',
    'the Parties as of the Effective Date, and governs the delivery',
    'of edge-collaboration software under a zero-trust, offline-first',
    'model. All processing occurs on local devices; no document bytes',
    'leave the premises without explicit, signed authorization.',
    '',
    'Clause 4.1 — Confidentiality. Each Party shall protect the other',
    "Party's material non-public information using reasonable care.",
    '',
    'Clause 7.3 — Audit. Both signatories attest the attached export',
    'contains no recoverable text layer and is tamper-evident.',
  ];
  lines.forEach((t, i) => ctx.fillText(t, 40, 110 + i * 28));
  ctx.font = 'italic 12px Georgia, serif';
  ctx.fillStyle = '#5a6b7a';
  ctx.fillText('(Demo contract — rendered to a high-res image, then sealed & signed.)', 40, c.height - 24);
}

function drawSeal(letter, color, x, y) {
  const c = $('doc');
  const ctx = c.getContext('2d');
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(x, y, 38, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, 30, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = 'bold 30px Georgia, serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(letter, x, y);
  ctx.restore();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function refreshStampState() {
  const n = (stampedA ? 1 : 0) + (stampedB ? 1 : 0);
  $('stampState').textContent = `${n} / 2 sealed`;
  $('finalize').disabled = !(stampedA && stampedB) || !transportReady;
}

async function stamp(who) {
  if (who === 'A' && !stampedA) { stampedA = true; drawSeal('A', '#1f6f4a', 180, 380); $('stampA').classList.add('stamped'); }
  if (who === 'B' && !stampedB) { stampedB = true; drawSeal('B', '#1f4f8f', 560, 380); $('stampB').classList.add('stamped'); }
  refreshStampState();
}

// ── Finalize → sign → deliver ─────────────────────────────────────────────────
async function finalize() {
  if (!stampedA || !stampedB) return;
  const fin = $('finalize');
  fin.setAttribute('aria-busy', 'true');
  try {
    if (!transportReady) {
      // Boot is still negotiating; wait for it rather than touching a null sender.
      log($('sendLog'), 'Waiting for the delivery channel to come up…');
      try { await senderReady; } catch { /* fall through to the guard below */ }
      if (!transportReady) { log($('sendLog'), 'Delivery channel unavailable — nothing was sent.', 'e'); return; }
    }
    log($('sendLog'), 'Rendering canvas to PNG…');
    const pngBlob = await new Promise((r) => $('doc').toBlob(r, 'image/png'));
    const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());

    log($('sendLog'), 'Building PDF…');
    const docBytes = await buildPdf(pngBytes, { width: $('doc').width, height: $('doc').height });

    log($('sendLog'), `PDF ${docBytes.length} bytes — computing SHA-256…`);
    const { raw, hex } = await sha256(docBytes);
    log($('sendLog'), `Hash ${hex.slice(0, 16)}… — signing with A & B (ECDSA)…`);
    const sigA = await sign(privA, raw);
    const sigB = await sign(privB, raw);
    const trailer = {
      alg: 'SHA-256',
      hash: hex,
      // Generated-watermark: proves the artifact came from AEGIS (Jerome Young),
      // not a re-badged fork. Travels inside the signature trailer.
      producer: 'AEGIS v1.0.0 (Jerome Young)',
      signers: [
        { id: 'A', pub: pubAb64, sig: sigA },
        { id: 'B', pub: pubBb64, sig: sigB },
      ],
    };

    // Report the signing moment to the shell before the artifact travels. The
    // audit timeline shows this as its own link, separate from the verdict.
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        channel: 'aegis',
        type: 'signed:sealed',
        hash: hex,
        signers: [
          { id: 'A', fingerprint: fpAHex },
          { id: 'B', fingerprint: fpBHex },
        ],
      }, location.origin);
    }

    let artifact = assembleArtifact(docBytes, trailer);
    if ($('tamper').checked) {
      const text = new TextDecoder().decode(artifact);
      const idx = text.indexOf(DELIM);
      const pos = idx === -1 ? artifact.length - 50 : Math.floor(idx / 2);
      artifact = Uint8Array.from(artifact);
      artifact[pos] ^= 0x01; // flip one byte inside the signed document region
      log($('sendLog'), '⚠ Tampering: flipped 1 document byte before sending.', 'e');
    }

    log($('sendLog'), 'Delivering to boss via p2p-crypto-transfer…');
    await sender.sendFile(new Blob([artifact], { type: 'application/pdf' }));
    log($('sendLog'), 'Sent. Awaiting boss verification…', 's');
  } finally {
    fin.setAttribute('aria-busy', 'false');
  }
}

// ── Boss: receive + verify ───────────────────────────────────────────────────
function showVerdict(res) {
  const ov = $('verifyOverlay');
  ov.className = 'show ' + (res.ok ? 'ok' : 'err');
  $('verdict').className = 'verdict ' + (res.ok ? 'ok' : 'err');
  $('verdict').textContent = res.ok ? 'VERIFIED' : 'VERIFICATION FAILED';
  $('verdictSub').textContent = res.reason;
  $('bossDot').className = 'dot ' + (res.ok ? 'ok' : 'err');
  const sigs = res.signers.map((s) => `Signer ${s.id}: ${s.ok ? 'valid' : 'INVALID'}`).join(' · ');
  $('bossSigInfo').textContent = sigs;
  setTimeout(() => { ov.className = ''; }, 4000);
}

async function handleReceived(blob, meta, kind) {
  if (!blob) {
    log($('bossLog'), 'Received straight to disk — verify from the saved file at the boss’s location.', 'e');
    return;
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  log($('bossLog'), `Received ${bytes.length} bytes — verifying signatures…`);
  const res = await verifyArtifact(bytes);
  showVerdict(res);
  log($('bossLog'), res.reason, res.ok ? 's' : 'e');

  // Tell the Aegis shell about the verdict. Only a verified artifact may be
  // archived: the shell keeps the button disabled on failure.
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({
      channel: 'aegis',
      type: 'signed:verified',
      ok: res.ok,
      reason: res.reason,
      hash: res.hash || null,
      hashMatch: res.hashMatch,
      signers: res.signers,
      name: meta?.name || 'signed-artifact.pdf',
      size: bytes.length,
      artifact: blob,
    }, location.origin);
  }
}

// ── Boot ─────────────────────────────────────────────────────────────────────
async function boot() {
  drawDoc();
  const [kpA, kpB] = await Promise.all([generateKeyPair(), generateKeyPair()]);
  privA = kpA.privateKey; privB = kpB.privateKey;
  pubAb64 = await exportPublicKey(kpA.publicKey);
  pubBb64 = await exportPublicKey(kpB.publicKey);
  fpAHex = await fingerprint(kpA.publicKey);
  fpBHex = await fingerprint(kpB.publicKey);
  $('fpA').textContent = 'A key: ' + fpAHex;
  $('fpB').textContent = 'B key: ' + fpBHex;

  // Bind the UI FIRST: the sender/receiver session setup below awaits ICE
  // gathering (up to ~3s against STUN, longer on slow networks). Binding the
  // stamp buttons after those awaits meant a freshly-loaded page ignored
  // clicks — "I press the seal and nothing happens".
  $('stampA').onclick = () => stamp('A');
  $('stampB').onclick = () => stamp('B');
  $('finalize').onclick = finalize;

  try {
    // Open the RECEIVER first so its BroadcastChannel listener is live before the
    // initiator (sender) fires its WebRTC offer — BroadcastChannel has no buffering,
    // a prematurely-sent offer would be lost and the connection would never form.
    await openReceiver({
      passphrase: PASSPHRASE,
      onStatus: (s) => log($('bossLog'), 'boss peer: ' + s),
      onReceived: handleReceived,
      onError: (e) => log($('bossLog'), 'receiver error: ' + e.message, 'e'),
    });
    // Do not await the sender here: on a slow network the offer/ICE step takes
    // seconds and the whole demo frame would look dead. Record the pending
    // promise instead; finalize() and the shell demo both await it.
    senderReady = openSender({
      passphrase: PASSPHRASE,
      onStatus: (s) => log($('sendLog'), 'sender: ' + s),
      onSent: () => log($('sendLog'), 'Boss confirmed receipt.', 's'),
      onError: (e) => log($('sendLog'), 'sender error: ' + e.message, 'e'),
    }).then((s) => {
      sender = s;
      transportReady = true;
      refreshStampState();
      return s;
    });
    log($('bossLog'), 'Boss online — P2P channel open, waiting for delivery.');
  } catch (e) {
    log($('sendLog'), 'Init failed: ' + e.message, 'e');
  }
}

// Allow the Aegis shell to drive one full demo run inside this hidden frame:
// stamp both parties, build + sign the artifact, deliver it, and let the shell
// receive the verification verdict (and then offer the archive action).
let readyPromise = null;
window.addEventListener('message', async (event) => {
  const message = event.data;
  if (!message || message.channel !== 'aegis' || message.type !== 'signed:run-demo') return;
  try {
    if (readyPromise) await readyPromise;
    if (!stampedA) await stamp('A');
    if (!stampedB) await stamp('B');
    await finalize();
  } catch (error) {
    log($('sendLog'), 'Demo run failed: ' + error.message, 'e');
  }
});

readyPromise = boot();
