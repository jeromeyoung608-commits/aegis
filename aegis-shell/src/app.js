// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
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

import { detectLocale, setLocale, translatePhrases, observePhrases } from './i18n.js';

// aegis-shell/src/app.js - orchestration for the Aegis command-center workbench.
//
// This is the ONLY place the independent modules talk to each other. It owns:
//   - the unified EventBus (bus.js) that module outbound events are routed to,
//   - the shared Context (context.js) that records the seven-stage state,
//   - the Adapters (adapters.js, identity.js) that drive the iframes and signing,
//   - the public SDK (sdk.js) that exposes window.AegisSDK to host applications,
//   - the UI state machine + router that lights up the seven-step Stepper.
//
// Seven-stage flow: topology:node-selected -> redaktor:load-doc ->
// redaktor:export-ready -> SHA-256 + ECDSA sign -> P2PAdapter.sendFile ->
// p2p:file-sent -> p2p:file-received -> verifyArtifact(pendingArtifact) ->
// signed:verified -> vault.seal -> vault:sealed -> audit:append.
// Every cross-module byte stays in the browser; the server stays blind.

import { EventBus } from './bus.js';
import {
  AegisContext, FLOW_STAGES, selectNode, setDocument, markSent, markReceived,
  setSigning, markVerified, markSealed, resetFlow,
} from './context.js';
import { TopologyAdapter, REDAKTORAdapter, P2PAdapter } from './adapters.js';
import { IdentityAdapter } from './identity.js';
import { installAegisSDK } from './sdk.js';
import { createVault } from '/modules/encrypted-archive/src/vault.js';
import { openOpfsStore } from '/modules/encrypted-archive/src/store.js';
import { AuditTrail, shortHash, createTsaAnchorProvider } from '/modules/audit-timeline/src/trail.js';
import { chainStatus, renderTimeline } from '/modules/audit-timeline/src/timeline.js';
import { parseArtifact } from '/modules/e2e-signed-delivery/src/sdk/pdf.js';

const bus = new EventBus();

// The room-host secret arrives once via the invite link's fragment
// (#issuer=<secret>). Keep it in sessionStorage, then strip it from the visible
// URL so it never survives in history, screenshots or copy-paste.
if (location.hash.startsWith('#issuer=')) {
  try {
    sessionStorage.setItem('aegis.issuer', decodeURIComponent(location.hash.slice(8)));
  } catch { /* private mode: leave it unset, /session will answer 401/403 */ }
  history.replaceState(null, '', location.pathname + location.search);
}

// Publish window.AegisSDK as soon as the bus exists, so a host application can
// subscribe before the first topology click and observe the entire closed loop.
installAegisSDK(bus);

function auditStorage() {
  try {
    const probe = '__aegis_audit_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

const trail = new AuditTrail({ storage: auditStorage() });
const trailReady = trail.load();
// Optional RFC 3161 trusted-timestamp anchor. Set window.AEGIS_TSA_URL (or
// localStorage 'aegis-tsa-url') to a TSA gateway to make the audit trail
// defensible against "edited locally" disputes. Without it the chain is still
// tamper-evident locally but cannot be remotely attested.
const TSA_URL = (typeof window !== 'undefined') && (window.AEGIS_TSA_URL || localStorage.getItem('aegis-tsa-url') || null);
if (TSA_URL) trail.setAnchorProvider(createTsaAnchorProvider(TSA_URL));

/**
 * Append one audit link and publish it on the bus. Publishing `audit:append`
 * here, rather than at each call site, guarantees that every step of the
 * seven-step loop is observable by an external AegisSDK subscriber.
 * An audit failure must never interrupt the business flow.
 *
 * @param {string} event Human-readable audit event name.
 * @param {object} [options] Extra payload fields (actor, detail, fingerprint).
 * @returns {Promise<object|null>} The appended chain entry, or null on failure.
 */
async function audit(event, options = {}) {
  try {
    await trailReady;
    const entry = await trail.append({ actor: 'Engineer-A', event, ...options });
    bus.emit('audit:append', entry);
    return entry;
  } catch (error) {
    console.error('[aegis] audit append failed:', error);
    return null;
  }
}

const frames = {
  'f-topo': document.getElementById('f-topo'),
  'f-doc': document.getElementById('f-doc'),
  'f-p2p-send': document.getElementById('f-p2p-send'),
  'f-p2p-recv': document.getElementById('f-p2p-recv'),
};

const topology = new TopologyAdapter(bus);
const redaktor = new REDAKTORAdapter(bus, frames['f-doc']);
const p2p = new P2PAdapter(bus, frames['f-p2p-send'], frames['f-p2p-recv']);

// The shell owns the signer identity. Every primitive is imported read-only
// from the submodules; no cryptographic logic is reimplemented in the shell.
const identity = new IdentityAdapter();
const identityReady = identity.ready;

// Per-load room keeps two open command-center tabs from stealing each other's
// WebRTC offer over the shared BroadcastChannel.
const ROOM = 'aegis-demo-' + Math.random().toString(36).slice(2, 8);
const PASS = 'aegis-demo-room';
const p2pReady = new Set();

/* ── postMessage -> EventBus bridge (single point of translation) ───────────── */
const MESSAGE_TYPES = /^(p2p:|redaktor:|signed:|identity:|vault:|topology:)/;
function frameIdForSource(source) {
  for (const [id, el] of Object.entries(frames)) {
    if (el.contentWindow === source) return id;
  }
  return null;
}
window.addEventListener('message', (e) => {
  // Never trust a message just because it says channel:'aegis'. Anything that is
  // not one of our own frames on our own origin is dropped before it can drive
  // the state machine (a foreign window could otherwise fake signed:verified).
  if (e.origin !== location.origin) return;
  if (e.source === window) return;
  const m = e.data;
  if (!m || m.channel !== 'aegis') return;
  if (typeof m.type !== 'string' || !MESSAGE_TYPES.test(m.type)) return;
  const from = frameIdForSource(e.source);
  if (!from) return;
  bus.emit(m.type, { ...m, from });
});

/* ── UI helpers ──────────────────────────────────────────────────────────── */
const $ = (s) => document.querySelector(s);
const logEl = document.getElementById('log');
function log(text) { logEl.textContent = `› ${text}`; }
function setStage(n, state) {
  const el = document.querySelector(`.step[data-step="${n}"]`);
  if (!el) return;
  el.classList.remove('active', 'done');
  if (state) el.classList.add(state);
}

// Highest stage rendered so far. Peer events (file-sent / file-received) can
// arrive out of order, so the stepper must never walk backwards.
let uiStage = 0;

/** Light every stage before `stage` green and mark `stage` as active. */
function advanceTo(stage) {
  if (stage <= uiStage) return;
  uiStage = stage;
  for (let n = 1; n <= FLOW_STAGES.AUDIT; n++) {
    setStage(n, n < stage ? 'done' : (n === stage ? 'active' : null));
  }
  route(stage);
}

/** Turn all seven stages green once the sealed artifact's audit link is written. */
function completeAll() {
  uiStage = FLOW_STAGES.AUDIT;
  for (let n = 1; n <= FLOW_STAGES.AUDIT; n++) setStage(n, 'done');
  route(FLOW_STAGES.AUDIT);
}

/** Clear the stepper at the start of a new run. */
function resetStepper() {
  uiStage = 0;
  for (let n = 1; n <= FLOW_STAGES.AUDIT; n++) setStage(n, null);
  route(0);
}

// Unified router: the body's data-stage drives which sidebar surface is emphasised.
function route(stage) {
  document.body.dataset.stage = String(stage);
  AegisContext.flowStage = stage;
}

/* ── Role-based views ─────────────────────────────────────────────────────
   One command-center surface, five roles. body[data-role] + the `read-only`
   flag choose which cards show and which actions are enabled.
   operator : full surface (default)        recipient: receive / verify / archive only
   auditor  : vault + audit, read-only      admin: full surface + deploy config panel
   external : verify / audit read-only (outside parties). */
const ROLE_READONLY = new Set(['auditor', 'external']);
function applyRole(role) {
  if (!role) role = 'operator';
  document.body.dataset.role = role;
  document.body.classList.toggle('read-only', ROLE_READONLY.has(role));
  const sel = document.getElementById('roleSwitch');
  if (sel) sel.value = role;
  const ar = document.getElementById('adminRole');
  if (ar) ar.value = role;
  const panel = document.getElementById('adminPanel');
  if (panel) panel.hidden = role !== 'admin';
  log(`View switched to role: ${role}.`);
}
const roleSwitch = document.getElementById('roleSwitch');
if (roleSwitch) roleSwitch.addEventListener('change', () => applyRole(roleSwitch.value));
const adminRoleSel = document.getElementById('adminRole');
if (adminRoleSel) adminRoleSel.addEventListener('change', () => applyRole(adminRoleSel.value));
(function initRole() {
  const q = new URLSearchParams(location.search).get('role');
  let saved = null;
  try { saved = localStorage.getItem('aegis-role'); } catch { /* ignore */ }
  applyRole(q || saved || 'operator');
})();
function setPeer(id, text, cls) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
  const dot = document.getElementById('dot' + id.slice(-1).toUpperCase());
  if (dot) { dot.className = 'dot' + (cls ? ' ' + cls : ''); }
}
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/* ── The node's ASSOCIATED document (synthetic until a real loader lands) ────
// Stamped with the node id/coords so it is provably the *corresponding* contract. */
function contractForNode(node) {
  const id = node?.index ?? 0;
  const where = node ? `(${Math.round(node.x)}, ${Math.round(node.y)})` : '';
  return new Promise((resolve) => {
    const c = document.createElement('canvas');
    c.width = 960; c.height = 1280;
    const x = c.getContext('2d');
    x.fillStyle = '#f4efe2'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#111'; x.textBaseline = 'top';
    x.font = 'bold 34px serif';
    x.fillText(`Wartungsvertrag — Maschine N${id} ${where}`, 60, 60);
    x.font = '22px serif';
    const lines = [
      '', 'Auftraggeber:',
      '  Hans Mueller', '  Oberstrasse 12, 10117 Berlin', '  Telefon: +49 30 1234567',
      '  E-Mail: hans.mueller@example.de', '',
      'Finanzdaten (vertraulich):',
      '  IBAN: DE89 3704 0044 0532 0130 00', '  Steuer-ID: 12 345 678 901',
      '  Versichertennummer: A1234567890', '  Betrag: 4.250,00 EUR', '',
      'Wartungstechniker (extern):',
      '  Liu Wei, Personalausweis N12345678', '  Bankverbindung: Konto 9876543210', '',
      `Datum: 09.11.2026   Aktenzeichen: AZ-2026-${String(id).padStart(4, '0')}`,
      '', `Quellknoten: #${id} ${where}  (Topologie -> REDAKTOR Kontext)`,
    ];
    lines.forEach((t, i) => x.fillText(t, 60, 130 + i * 40));
    c.toBlob((b) => resolve(new File([b], `Wartungsvertrag-N${id}.png`, { type: 'image/png' })), 'image/png');
  });
}

/* ── Closed-loop wiring (the seven-step state machine) ─────────────────────
   Stages: 1 Topology -> 2 Redact -> 3 Sign -> 4 P2P Send -> 5 Verify ->
            6 Archive -> 7 Audit.
   The shell owns every handoff. The signed artifact is retained on the sender
   (`pendingArtifact`) because a large transfer may stream straight to disk on
   the receiver and produce no in-memory Blob there. Verification therefore
   uses the exact bytes the sender signed. */

// Receiver-side in-memory copy, when the P2P sink was memory-backed.
let lastReceivedBlob = null;
// Artifact eligible for archiving; set only after a passing verification.
let lastVerified = null;

/* ── Shell-side "Sign & Send to Peer" CTA ───────────────────────────────────
   REDAKTOR's right rail (Rules/Findings/Export) becomes a slide-out drawer
   below 980px, while this sidebar is fixed at 460px, so the in-iframe export
   button cannot be reached from the workbench. This CTA lives in the shell and
   drives the same adapter seam: REDAKTORAdapter.exportToParent() posts
   `redaktor:export`, the module answers with `redaktor:export-ready`
   { name, blob }, and the existing bus handler below runs
   hashOf -> signHash -> assembleArtifact -> p2p.sendFile. The event is emitted
   exactly once per click and no module file is touched. */
const btnSignSend = document.getElementById('btnSignSend');
const scanStateEl = document.getElementById('scanState');
const scanDotEl = document.getElementById('scanDot');
const SIGN_SEND_LABEL = '<span aria-hidden="true">\u25B6</span> Sign &amp; Send to Peer';

let signSendBusy = false;
let signSendConsumed = false;
let signSendKnownDocs = new Set();

/** docIds already present before the current run started. */
function knownDocIds() {
  try {
    const pages = frames['f-doc']?.contentWindow?.REDAKTOR?.state?.pages || [];
    return new Set(pages.map((p) => p.docId));
  } catch {
    return new Set();
  }
}

/** Read REDAKTOR's scan state through the same-origin iframe, read-only. */
function scanSnapshot() {
  try {
    const win = frames['f-doc']?.contentWindow;
    const api = win?.REDAKTOR;
    if (!api?.state) {
      return { ready: false, pages: 0, hits: 0, label: 'REDAKTOR is loading...' };
    }
    const pages = Array.isArray(api.state.pages) ? api.state.pages : [];
    const doc = win.document;
    const statusText = doc.getElementById('statusText')?.textContent?.trim() || '';
    const hits = Number(doc.getElementById('hitTabCount')?.textContent) || 0;
    if (!pages.length) {
      return { ready: false, pages: 0, hits, label: 'No document - click a topology node' };
    }
    // Only a document loaded after the last reset can unlock the CTA, so an
    // already-scanned page cannot light it up early on a second run.
    const fresh = pages.filter((p) => !signSendKnownDocs.has(p.docId));
    if (!fresh.length) {
      return { ready: false, pages: pages.length, hits, label: 'Waiting for the new document...' };
    }
    // page.status is 'idle' -> 'ocr' -> 'done' | 'error'. The OCR queue is
    // settled only once every page has left the first two states.
    const pending = pages.filter((p) => p.status === 'idle' || p.status === 'ocr');
    const settled = pending.length === 0 || /ocr engine failed/i.test(statusText);
    if (!settled) {
      return { ready: false, pages: pages.length, hits, label: `Scanning ${fresh.length} new page(s)...` };
    }
    return {
      ready: true, pages: pages.length, hits,
      label: `Scan complete - ${hits} redaction${hits === 1 ? '' : 's'}`,
    };
  } catch {
    return { ready: false, pages: 0, hits: 0, label: 'REDAKTOR is loading...' };
  }
}

function paintSignSend() {
  if (signSendBusy) return;
  if (signSendConsumed) {
    scanStateEl.textContent = 'Signed & sent - archive below';
    scanDotEl.className = 'scan-dot ready';
    btnSignSend.disabled = true;
    btnSignSend.classList.remove('is-ready');
    return;
  }
  const s = scanSnapshot();
  scanStateEl.textContent = s.label;
  scanDotEl.className = 'scan-dot' + (s.ready ? ' ready' : (s.pages ? ' busy' : ''));
  const enabled = s.ready;
  btnSignSend.disabled = !enabled;
  btnSignSend.classList.toggle('is-ready', enabled);
}

function resetSignSend() {
  signSendBusy = false;
  signSendConsumed = false;
  signSendKnownDocs = knownDocIds();
  btnSignSend.disabled = true;
  btnSignSend.classList.remove('is-ready', 'is-busy');
  btnSignSend.innerHTML = SIGN_SEND_LABEL;
  paintSignSend();
}

btnSignSend.addEventListener('click', async () => {
  if (btnSignSend.disabled || signSendBusy) return;
  signSendBusy = true;
  signSendConsumed = true;
  btnSignSend.disabled = true;
  btnSignSend.setAttribute('aria-busy', 'true');
  btnSignSend.classList.remove('is-ready');
  btnSignSend.classList.add('is-busy');
  btnSignSend.textContent = 'Signing & sending...';
  scanStateEl.textContent = 'Building destructive PDF...';

  try {
    // The module's Blob arrives on the bus as `redaktor:export-ready`. That
    // handler owns hashing, signing, packing, the P2P send, and the
    // advanceTo(SIGN) / advanceTo(P2P_SEND) Stepper updates.
    const { name } = await Promise.race([
      redaktor.exportToParent(),
      new Promise((_, reject) => setTimeout(
        () => reject(new Error('REDAKTOR did not answer within 30s')), 30_000
      )),
    ]);
    log(`Redacted PDF ${name} received - hashing, signing and sending.`);
    // The status line already says what happened; the button only needs to
    // report its own state. Repeating the whole sentence in both places made
    // the CTA read as a duplicate.
    btnSignSend.textContent = 'Signed';
    btnSignSend.disabled = true;
  } catch (error) {
    signSendConsumed = false;
    scanStateEl.textContent = `Export failed: ${error.message}`;
    btnSignSend.innerHTML = SIGN_SEND_LABEL;
    log(`Sign & Send failed: ${error.message}`);
  } finally {
    signSendBusy = false;
    btnSignSend.classList.remove('is-busy');
    btnSignSend.setAttribute('aria-busy', 'false');
    paintSignSend();
  }
});

// Poll instead of patching the module: 350ms is imperceptible and the watcher
// also picks up documents injected through AegisSDK.injectFile().
setInterval(paintSignSend, 350);
paintSignSend();

/* Single document intake seam. Both the topology handoff below and
   AegisSDK.injectFile() emit `redaktor:load-doc`, so external files enter the
   same audited seven-stage loop as node-selected documents. */
bus.on('redaktor:load-doc', ({ file, name, source = 'shell' }) => {
  if (!file) return;
  resetSignSend();
  const label = name || file.name || 'injected-document';
  setDocument(label, source);
  redaktor.loadFile(file, label);
  log(`Loaded ${label} into REDAKTOR (source: ${source}).`);
  audit('Document loaded into REDAKTOR', { detail: `${label} - source ${source}` });
});

// 1) Topology -> node click. Reset the run and load THAT node's contract into REDAKTOR.
bus.on('topology:node-selected', ({ nodeId, x, y }) => {
  const node = { index: nodeId, x, y };
  resetSignSend();
  resetFlow();
  resetStepper();
  selectNode(node);
  advanceTo(FLOW_STAGES.REDACT);
  lastVerified = null;
  lastReceivedBlob = null;
  const archiveButton = document.getElementById('btnArchive');
  archiveButton.hidden = true;
  archiveButton.disabled = true;
  document.getElementById('signedState').textContent = 'No verified artifact yet.';
  document.getElementById('recvDecision').hidden = true;
  log(`Node #${nodeId} selected - loading its associated maintenance contract into REDAKTOR.`);
  audit('Topology node selected', { detail: `Node #${nodeId} at (${Math.round(x)}, ${Math.round(y)})` });
  contractForNode(node).then((file) => {
    bus.emit('redaktor:load-doc', { file, name: file.name, source: 'synthetic' });
  });
});

// 2) REDAKTOR finished redaction -> hash, sign, pack, retain, then stream.
bus.on('redaktor:export-ready', async ({ name, blob }) => {
  try {
    await identityReady;
    const pdfBytes = new Uint8Array(await blob.arrayBuffer());
    const hash = await identity.hashOf(pdfBytes);
    const signing = await identity.signHash(hash);
    const artifact = identity.assembleArtifact(
      pdfBytes, signing.hash, signing.signature, signing.publicKey
    );

    setSigning({
      hash: signing.hash,
      signature: signing.signature,
      publicKey: signing.publicKey,
      artifact,
    });

    advanceTo(FLOW_STAGES.SIGN);
    log(`Redacted PDF ${name} hashed and signed - SHA-256 ${signing.hash.slice(0, 12)}...`);
    audit('Destructive PDF produced', { detail: `${name} - text layer removed` });
    audit('Document hash signed', { detail: `${name} - SHA-256 ${signing.hash.slice(0, 12)}...` });

    bus.emit('identity:signed', {
      hash: signing.hash,
      signature: signing.signature,
      publicKey: signing.publicKey,
      name,
      bytes: artifact.byteLength,
    });

    // The exact signed bytes travel over the AES-GCM channel. The sender keeps
    // `pendingArtifact` as the verification basis for the receiving stage.
    p2p.sendFile(new File([artifact], name, { type: 'application/pdf' }), name);
  } catch (error) {
    log(`Signing failed: ${error.message}`);
    audit('Signing failed', { detail: error.message });
  }
});

// 3) Signing complete -> step 3 green, P2P send active.
bus.on('identity:signed', ({ hash, name }) => {
  advanceTo(FLOW_STAGES.P2P_SEND);
  audit('Signed artifact handed to transport', {
    detail: `${name} - SHA-256 ${String(hash).slice(0, 12)}...`,
  });
});

// 4) Sender finished streaming the encrypted chunks.
bus.on('p2p:file-sent', () => {
  markSent();
  advanceTo(FLOW_STAGES.VERIFY);
  log('Sender handed the encrypted stream to the data channel.');
  audit('Delivered over encrypted P2P', { detail: 'Peer A -> Boss-B - AES-GCM data channel' });
});

// 5) Receiver reported completion -> verify the sender-side retained artifact.
bus.on('p2p:file-received', async ({ name, blob }) => {
  markReceived(name);
  lastReceivedBlob = blob || null;
  advanceTo(FLOW_STAGES.VERIFY);
  audit('Delivery decrypted', { actor: 'Boss-B', detail: name || 'signed-artifact.pdf' });

  const card = document.getElementById('recvDecision');
  document.getElementById('recvName').textContent = name || 'signed-artifact.pdf';
  card.hidden = false;
  card.dataset.hasBlob = blob ? '1' : '0';

  // Make the no-copy state visible instead of a sidebar log line nobody reads:
  // without an in-memory blob neither decision button can do anything.
  for (const btnId of ['btnRedactAgain', 'btnDownload']) {
    const btn = document.getElementById(btnId);
    btn.disabled = !blob;
    btn.title = blob
      ? ''
      : 'The file was streamed straight to disk - no in-memory copy to hand to REDAKTOR or download.';
  }

  const pending = AegisContext.pendingArtifact;
  const archiveButton = document.getElementById('btnArchive');
  if (!pending) {
    archiveButton.hidden = true;
    archiveButton.disabled = true;
    log('No signed artifact is retained on the sender - verification skipped.');
    audit('Verification skipped', { detail: 'sender-side retained artifact is missing' });
    return;
  }

  try {
    const result = await identity.verifyArtifact(pending);
    markVerified(result.ok, result.reason);

    if (!result.ok) {
      archiveButton.hidden = true;
      archiveButton.disabled = true;
      document.getElementById('signedState').textContent = 'Rejected: ' + result.reason;
      log(`Signed delivery rejected: ${result.reason}`);
      audit('Verification rejected', { actor: 'Boss-B', detail: result.reason });
      bus.emit('signed:rejected', { reason: result.reason, name });
      return;
    }

    const basis = blob
      ? 'sender-retained-copy (receiver also holds an in-memory copy)'
      : 'sender-retained-copy (receiver wrote to disk)';
    log(blob
      ? 'Receiver produced an in-memory copy; verified successfully against the sender-side copy.'
      : 'Receiver streamed straight to disk; verified successfully against the sender-side copy.');

    bus.emit('signed:verified', {
      ok: true,
      reason: result.reason,
      hash: result.hash || AegisContext.hash,
      hashMatch: result.hashMatch,
      trust: result.trust || 'self-asserted',
      signers: result.signers,
      name: name || 'signed-artifact.pdf',
      artifact: new Blob([pending], { type: 'application/pdf' }),
      basis,
    });
  } catch (error) {
    markVerified(false, error.message);
    archiveButton.hidden = true;
    archiveButton.disabled = true;
    log(`Verification failed: ${error.message}`);
    audit('Verification failed', { detail: error.message });
  }
});

// 6) Verified -> step 5 green, archive active, unlock the vault action.
bus.on('signed:verified', (payload) => {
  advanceTo(FLOW_STAGES.ARCHIVE);
  lastVerified = {
    blob: payload.artifact,
    name: payload.name,
    metadata: {
      kind: 'aegis.signed-artifact',
      source: 'aegis-shell-identity-adapter',
      documentSha256: payload.hash || AegisContext.hash,
      signers: (payload.signers || []).map((s) => ({ id: s.id, ok: Boolean(s.ok) })),
      verdict: 'verified',
      reason: payload.reason,
      verificationBasis: payload.basis,
      verifiedAt: new Date().toISOString(),
    },
  };

  const btn = document.getElementById('btnArchive');
  btn.hidden = false;
  btn.disabled = false;
  // Say exactly what was proven. The signature is valid, and the key that made it
  // is the key embedded in the file — which identifies nobody on its own.
  const trustNote = payload.trust === 'pinned' ? 'Signer pinned' : 'Signer self-asserted';
  document.getElementById('signedState').textContent =
    `Integrity OK · ${trustNote} · ${lastVerified.metadata.signers.length} signer(s) · SHA-256 ${String(payload.hash || '').slice(0, 12)}...`;
  log(`Signature verified. Archive to Vault is available (${payload.basis}).`);
  const valid = lastVerified.metadata.signers.filter((s) => s.ok).length;
  audit('Verification passed', {
    actor: 'Boss-B',
    detail: `${valid}/${lastVerified.metadata.signers.length} signatures valid - ${payload.basis}`,
  });
});

bus.on('p2p:error', ({ message }) => log(`P2P error: ${message}`));

// Live connection-state reflection: the P2P frames report every WebRTC state
// change, so the peer rows show the real link instead of a stale "connecting...".
bus.on('p2p:status', ({ from, state }) => {
  if (!from || !from.startsWith('f-p2p')) return;
  const map = {
    connected: ['connected', 'ok'],
    connecting: ['connecting...', 'warn'],
    disconnected: ['disconnected', 'err'],
    failed: ['failed', 'err'],
  };
  const [text, cls] = map[state] || [state, 'warn'];
  setPeer(from === 'f-p2p-send' ? 'peerA' : 'peerB', text, cls);
});

// Wire the two in-shell P2P peers once both report ready, then connect them locally.
function markP2PReady(from) {
  if (!from || !from.startsWith('f-p2p') || p2pReady.has(from)) return;
  p2pReady.add(from);
  const which = from === 'f-p2p-send' ? 'A (sender)' : 'B (receiver)';
  setPeer(from === 'f-p2p-send' ? 'peerA' : 'peerB', `ready · ${which}`, 'warn');
  if (p2pReady.size === 2) {
    p2p.connect(ROOM, { pass: PASS, mode: 'local' });
    setPeer('peerA', 'connecting...', 'warn');
    setPeer('peerB', 'connecting...', 'warn');
    log('Both P2P peers ready - connecting locally via BroadcastChannel.');
  }
}
bus.on('p2p:frame-ready', ({ from }) => markP2PReady(from));

// The sender iframe is declared first in the HTML and can finish loading before
// app.js installs its message listener, so its `p2p:frame-ready` postMessage is
// lost deterministically (Peer A stayed "idle" forever). Treat a completed
// iframe load as the same readiness signal; markP2PReady is idempotent.
for (const id of ['f-p2p-send', 'f-p2p-recv']) {
  const el = frames[id];
  if (!el) continue;
  el.addEventListener('load', () => markP2PReady(id));
  try {
    if (el.contentDocument?.readyState === 'complete') markP2PReady(id);
  } catch {
    // A cross-origin frame cannot be inspected; its postMessage still works.
  }
}

// Reflect live peer connection state (the P2P module logs status to its own frame; we
// surface a coarse indicator here by watching the data-channel lifecycle events).
bus.on('p2p:file-sent', () => { setPeer('peerA', 'connected · sent', 'ok'); });
bus.on('p2p:file-received', () => { setPeer('peerB', 'connected · received', 'ok'); });

/* ── Reveal the hidden P2P transfer screens (demo/inspection aid) ───────────
   Peer A and Peer B run in iframes that are `hidden` by default so the command
   center stays clean. The top-bar toggle makes them visible (bottom corners)
   so a reviewer/demo can SEE the encrypted transfer happening on both ends.
   Toggling display only — never reloads the iframes — so the live WebRTC link
   is preserved. */
const btnRevealP2P = document.getElementById('btnRevealP2P');
function setRevealP2P(on) {
  document.body.classList.toggle('show-p2p', on);
  for (const id of ['f-p2p-send', 'f-p2p-recv', 'peekLabelA', 'peekLabelB']) {
    const el = document.getElementById(id);
    if (el) { if (on) el.removeAttribute('hidden'); else el.setAttribute('hidden', ''); }
  }
  if (btnRevealP2P) {
    btnRevealP2P.classList.toggle('active', on);
    btnRevealP2P.textContent = on ? 'Hide transfer' : 'Show transfer';
  }
  log(on ? 'Revealed Peer A / Peer B transfer screens.' : 'Hid the transfer screens.');
}
if (btnRevealP2P) {
  btnRevealP2P.addEventListener('click', () =>
    setRevealP2P(!document.body.classList.contains('show-p2p')));
}

/* ── Load a real local document into REDAKTOR (extension point: real files) ──
   The closed loop auto-loads a synthetic contract for the demo, but operators can
   also redact their OWN documents. This emits the same `redaktor:load-doc` seam the
   topology handoff uses, so the file enters the identical audited seven-stage flow. */
const btnLoadDoc = document.getElementById('btnLoadDoc');
if (btnLoadDoc) {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/pdf,image/png,image/jpeg';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    bus.emit('redaktor:load-doc', { file, name: file.name, source: 'local' });
    fileInput.value = '';
  });
  btnLoadDoc.addEventListener('click', () => fileInput.click());
}

/* ── A: expand the embedded REDAKTOR to a full-screen editor ───────────────
   The doc-redactor iframe is the SAME instance that participates in the sign &
   send pipeline, so manual redactions made full-screen stay in the document
   that gets sealed. The wider frame also restores REDAKTOR's full 3-column
   layout (Rules / Custom terms / Export directly reachable) instead of the
   collapsed drawer used in the narrow sidebar. */
const btnExpandRedact = document.getElementById('btnExpandRedact');
if (btnExpandRedact) {
  btnExpandRedact.addEventListener('click', () => {
    document.body.classList.toggle('redact-expanded');
    const on = document.body.classList.contains('redact-expanded');
    btnExpandRedact.title = on ? 'Exit fullscreen' : 'Fullscreen REDAKTOR';
    log(on ? 'REDAKTOR expanded to full screen.' : 'REDAKTOR restored to sidebar.');
  });
}

/* ── Sidebar decision buttons (shell decides what to do with an incoming file) ─ */
document.getElementById('btnRedactAgain').addEventListener('click', async () => {
  const b = document.getElementById('btnRedactAgain');
  b.setAttribute('aria-busy', 'true');
  try {
    const name = document.getElementById('recvName').textContent;
    const blob = lastReceivedBlob;
    if (!blob) { log('That file streamed straight to disk - reopen it from the chosen save location.'); return; }

    // The received bytes are a SIGNED ARTIFACT (PDF document + signature trailer).
    // Strip the trailer back to a plain PDF so the browser's native viewer
    // renders the redacted pages reliably.
    let fileBlob = blob;
    try {
      const parsed = parseArtifact(new Uint8Array(await blob.arrayBuffer()));
      if (parsed && parsed.docBytes && parsed.docBytes.length) {
        fileBlob = new Blob([parsed.docBytes], { type: 'application/pdf' });
      }
    } catch { /* keep the raw artifact if it cannot be split */ }

    // Show the file right here on the page: no download, no reset of the
    // seven-step flow, no detour through the narrow REDAKTOR side panel that
    // hides its preview canvas at sidebar width.
    const modal = document.getElementById('pdfModal');
    const frame = document.getElementById('pdfModalFrame');
    document.getElementById('pdfModalName').textContent = name;
    frame.src = URL.createObjectURL(fileBlob);
    modal.hidden = false;
    log(`Opened ${name} in the in-page viewer.`);
  } finally {
    b.setAttribute('aria-busy', 'false');
  }
});

function closePdfViewer() {
  const modal = document.getElementById('pdfModal');
  if (modal.hidden) return;
  modal.hidden = true;
  const frame = document.getElementById('pdfModalFrame');
  if (frame.src.startsWith('blob:')) URL.revokeObjectURL(frame.src);
  frame.src = 'about:blank';
}
document.getElementById('pdfModalClose').addEventListener('click', closePdfViewer);
document.getElementById('pdfModalBackdrop').addEventListener('click', closePdfViewer);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closePdfViewer(); });
document.getElementById('btnDownload').addEventListener('click', () => {
  const name = document.getElementById('recvName').textContent;
  if (!lastReceivedBlob) { log('That file was written to disk via showSaveFilePicker; no in-memory copy to download.'); return; }
  downloadBlob(lastReceivedBlob, name);
  log(`Downloaded ${name}.`);
});

/* ── Vault sealed -> final audit link ────────────────────────────────────────
   The archive action is reachable only after `signed:verified`. Sealing emits
   `vault:sealed` for external SDK subscribers and closes the seven-step loop.
   The signature/verification work no longer lives in a hidden signed-delivery
   iframe: IdentityAdapter performs it in the shell, so there is exactly one
   source of signed bytes for the whole loop. */
bus.on('vault:sealed', (record) => {
  advanceTo(FLOW_STAGES.AUDIT);
  log(`Seven-step loop complete: ${record.id} sealed and audited.`);
});

// Stage 7 is driven by the audit stream itself: once the seal link is written
// after archiving, all seven stages turn green.
bus.on('audit:append', () => {
  if (AegisContext.sealed) completeAll();
});

/* ── Local encrypted vault (OPFS) ───────────────────────────────────────────
   The shell owns the vault directly: OPFS is per-origin, so importing the
   archive module's core here and writing from the shell is the same physical
   folder the standalone vault page browses. No Blob ever crosses an iframe
   boundary, and the passphrase stays in this page's memory for one seal. */
let vault = null;

async function refreshVault() {
  if (!vault) return;
  try {
    const stats = await vault.stats();
    const kb = (stats.containerBytes / 1024).toFixed(1);
    document.getElementById('vaultState').textContent =
      `${stats.count} sealed record${stats.count === 1 ? '' : 's'} · ${kb} KB ciphertext · opfs`;
  } catch (error) {
    document.getElementById('vaultState').textContent = 'vault error: ' + error.message;
  }
}

openOpfsStore()
  .then((store) => { vault = createVault(store); return refreshVault(); })
  .catch((error) => {
    document.getElementById('vaultState').textContent = 'OPFS unavailable: ' + error.message;
  });

const archiveDialog = document.getElementById('archiveDialog');

function closeArchiveDialog() {
  if (typeof archiveDialog.close === 'function') archiveDialog.close();
  else archiveDialog.removeAttribute('open');
}

document.getElementById('btnArchive').addEventListener('click', () => {
  if (!lastVerified) return log('Verify a signed delivery before archiving.');
  document.getElementById('archiveTarget').textContent = lastVerified.name;
  document.getElementById('archivePass').value = '';
  const msg = document.getElementById('archiveMsg');
  msg.textContent = '';
  msg.className = 'msg';
  if (typeof archiveDialog.showModal === 'function') archiveDialog.showModal();
  else archiveDialog.setAttribute('open', '');
});

document.getElementById('btnArchiveCancel').addEventListener('click', closeArchiveDialog);

document.getElementById('formArchive').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!lastVerified) return closeArchiveDialog();
  const passphrase = document.getElementById('archivePass').value;
  const msg = document.getElementById('archiveMsg');
  const go = document.getElementById('btnArchiveGo');

  if (passphrase.length < 8) {
    msg.textContent = 'Passphrase must be at least 8 characters.';
    msg.className = 'msg err';
    return;
  }
  if (!vault) {
    msg.textContent = 'The local vault is not ready yet - OPFS is still opening.';
    msg.className = 'msg err';
    return;
  }

  msg.textContent = 'Sealing...';
  msg.className = 'msg';
  go.disabled = true;
  go.setAttribute('aria-busy', 'true');
  try {
    const bytes = new Uint8Array(await lastVerified.blob.arrayBuffer());
    const record = await vault.seal({
      name: lastVerified.name,
      type: lastVerified.blob.type || 'application/pdf',
      bytes,
      metadata: lastVerified.metadata,
      passphrase,
    });
    closeArchiveDialog();
    document.getElementById('archivePass').value = '';
    markSealed(record.id);
    log(`Archived to the local vault: ${record.id} (${record.size} B payload -> ${record.containerSize} B sealed, AES-GCM-256).`);
    bus.emit('vault:sealed', record);
    await audit('Sealed in the local vault', {
      detail: `${record.id} - ${record.size} B -> ${record.containerSize} B - AES-GCM-256`,
    });
    await refreshVault();
  } catch (error) {
    msg.textContent = error.message;
    msg.className = 'msg err';
  } finally {
    go.disabled = false;
    go.setAttribute('aria-busy', 'false');
  }
});

/* ── Audit timeline (tamper-evident hash chain) ──────────────────────────────────
   The chain lives in localStorage and is shared with the standalone compliance
   page, so a reviewer can reopen the trail after a reload. Every link is
   HMAC-SHA256(deviceKey, prev | canonical(entry)) with a device key, plain SHA-256 for legacy entries; editing one event breaks every later hash. */
const auditStateEl = document.getElementById('auditState');

function paintAudit() {
  renderTimeline(document.getElementById('auditTimeline'), trail, {
    emptyText: 'No audited actions yet. Click a topology node to begin the closed loop.',
  });
  const status = chainStatus(trail);
  auditStateEl.textContent = status.text;
  auditStateEl.className = 'audit-state ' + status.tone;
}

trail.subscribe(paintAudit);
paintAudit();
trailReady.then(paintAudit);

document.getElementById('btnAuditVerify').addEventListener('click', async () => {
  const b = document.getElementById('btnAuditVerify');
  b.setAttribute('aria-busy', 'true');
  try {
    const brokenAt = await trail.verify();
    paintAudit();
    if (brokenAt === null) {
      log(`Audit chain verified: ${trail.entries.length} link(s), head ${shortHash(trail.head, 12)}...`);
    } else {
      log(`Audit chain is broken at link #${brokenAt + 1} — treat everything after it as untrusted.`);
    }
  } finally { b.setAttribute('aria-busy', 'false'); }
});

document.getElementById('btnAuditExport').addEventListener('click', () => {
  const payload = {
    ...trail.snapshot(),
    source: 'aegis-shell',
    exportedAt: new Date().toISOString(),
  };
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  downloadBlob(
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
    `aegis-audit-${stamp}.json`
  );
  log(`Exported ${trail.entries.length} audit link(s) as JSON (no document bytes).`);
});

// Anchor the chain HEAD to a trusted timestamp (RFC 3161), making the trail
// remotely attestable. No-op unless a TSA gateway is configured (see TSA_URL).
const btnAuditAnchor = document.getElementById('btnAuditAnchor');
if (btnAuditAnchor) btnAuditAnchor.addEventListener('click', async () => {
  btnAuditAnchor.setAttribute('aria-busy', 'true');
  try {
    if (!trail.anchorProvider) {
      log('TSA anchor not configured. Set window.AEGIS_TSA_URL to a TSA gateway to anchor the chain head to a trusted timestamp.');
      return;
    }
    await trailReady;
    const anchor = await trail.anchorChainToTSA();
    log(`Audit chain head anchored to TSA ${anchor.tsa} at ${anchor.at} (head ${shortHash(anchor.head, 12)}...).`);
  } catch (error) {
    log('TSA anchor failed: ' + error.message);
  } finally {
    btnAuditAnchor.setAttribute('aria-busy', 'false');
  }
});

let auditClearArmed = false;
let auditClearTimer = null;
document.getElementById('btnAuditClear').addEventListener('click', () => {
  const button = document.getElementById('btnAuditClear');
  if (!auditClearArmed) {
    auditClearArmed = true;
    button.textContent = 'Confirm';
    auditClearTimer = setTimeout(() => {
      auditClearArmed = false;
      button.textContent = 'Clear';
    }, 4000);
    return;
  }
  clearTimeout(auditClearTimer);
  auditClearArmed = false;
  button.textContent = 'Clear';
  trail.reset();
  log('Audit trail cleared — the next action starts a fresh genesis link.');
});

resetStepper();
advanceTo(FLOW_STAGES.TOPOLOGY);
log('Aegis command center ready. Click a topology node to start the seven-step closed loop.');

// ── Interface language ───────────────────────────────────────────────────────
// Shares the console's setting (localStorage 'aegis_locale'): switch to German
// once and both surfaces stay German. The phrase translator covers the static
// markup; the observer covers everything the module scripts paint after load.
let WORKBENCH_LOCALE = setLocale(detectLocale());
const langSel = document.getElementById('langSel');
if (langSel) {
  langSel.value = WORKBENCH_LOCALE;
  langSel.addEventListener('change', () => {
    WORKBENCH_LOCALE = setLocale(langSel.value);
    translatePhrases(WORKBENCH_LOCALE);
  });
}
translatePhrases(WORKBENCH_LOCALE);
observePhrases(() => WORKBENCH_LOCALE);
