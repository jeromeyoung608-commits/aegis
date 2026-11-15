// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
// aegis-shell/src/context.js — the single, shared Context for the Aegis workbench.
//
// The submodules (Topology, REDAKTOR, P2P, SignedDelivery, Vault, AuditTrail) are
// independent projects that never import one another. Under aegis-shell they
// cooperate only through the `aegis` postMessage channel, so the glue that turns
// a topology click into a sealed, audited artifact lives HERE in one explicit
// Context object.
//
// The EventBus (bus.js) carries the *events*; this Context carries the *state*
// those events mutate. Keeping the seven-step flow in one object makes every
// handoff auditable instead of a spray of ad-hoc postMessage calls.
//
// The `artifact` / `pendingArtifact` pair is the deliberate sender-side retained
// copy: large transfers may stream straight to disk on the receiver (no complete
// Blob exists there), so verification uses the bytes the sender actually signed.

/** Numeric stages of the seven-step commercial closed loop. */
export const FLOW_STAGES = Object.freeze({
  TOPOLOGY: 1,
  REDACT: 2,
  SIGN: 3,
  P2P_SEND: 4,
  VERIFY: 5,
  ARCHIVE: 6,
  AUDIT: 7,
});

export const AegisContext = {
  // The topology node the operator clicked (from `topology:node-selected`).
  selectedNode: null, // { index, x, y }

  // The device contract currently loaded into REDAKTOR for that node.
  // { name, node, source: 'synthetic' | 'uploaded' }
  document: null,

  // Progress through the 7-stage closed loop (0 = idle, 7 = audit complete).
  flowStage: 0,

  // Transfer bookkeeping for the two in-shell P2P peers.
  transfer: { sent: false, received: false },

  // Human-readable trace of the last handoff (mirrored to the on-screen log).
  lastEvent: '',

  // ── Signature chain ───────────────────────────────────────────────────────
  // SHA-256 digest of the redacted PDF, as a hex string.
  hash: null,
  // Base64 ECDSA P-256 signature over the raw digest.
  signature: null,
  // Base64 SPKI public key of the signer.
  publicKey: null,
  // Complete signed artifact (PDF bytes + JSON trailer), as a Uint8Array.
  artifact: null,
  // Semantic alias of `artifact`, retained on the sender for verification.
  pendingArtifact: null,

  // ── Terminal verdicts ─────────────────────────────────────────────────────
  // True only when `verifyArtifact()` reports a passing verdict.
  verified: false,
  // Vault record id, or null while the artifact is not sealed yet.
  sealed: null,
};

/** Mutators keep the flowStage in sync and update the trace in one place. */
export function selectNode(node) {
  AegisContext.selectedNode = node;
  AegisContext.flowStage = Math.max(AegisContext.flowStage, FLOW_STAGES.TOPOLOGY);
  AegisContext.lastEvent = `node-selected -> node #${node?.index ?? '?'}`;
}

export function setDocument(name, source) {
  AegisContext.document = { name, node: AegisContext.selectedNode, source };
  AegisContext.flowStage = Math.max(AegisContext.flowStage, FLOW_STAGES.REDACT);
  AegisContext.lastEvent = `doc loaded into REDAKTOR -> ${name} (${source})`;
}

/**
 * Record the signing result and retain the exact bytes that were signed.
 * `pendingArtifact` references the same Uint8Array as `artifact`; it exists so
 * the verify stage can state its intent explicitly without copying large files.
 *
 * @param {{hash:string,signature:string,publicKey:string,artifact:Uint8Array}} signing
 */
export function setSigning({ hash, signature, publicKey, artifact }) {
  AegisContext.hash = hash;
  AegisContext.signature = signature;
  AegisContext.publicKey = publicKey;
  AegisContext.artifact = artifact;
  AegisContext.pendingArtifact = artifact;
  AegisContext.verified = false;
  AegisContext.sealed = null;
  AegisContext.flowStage = Math.max(AegisContext.flowStage, FLOW_STAGES.SIGN);
  AegisContext.lastEvent = `artifact signed -> SHA-256 ${String(hash).slice(0, 12)}...`;
}

export function markSent() {
  AegisContext.transfer.sent = true;
  AegisContext.flowStage = Math.max(AegisContext.flowStage, FLOW_STAGES.P2P_SEND);
  AegisContext.lastEvent = 'transfer: sender streamed encrypted chunks';
}

/**
 * The receiver reported completion. This no longer terminates the loop: the
 * flow may continue into verification, archiving and the final audit link.
 *
 * @param {string} [name]
 */
export function markReceived(name) {
  AegisContext.transfer.received = true;
  AegisContext.flowStage = Math.max(AegisContext.flowStage, FLOW_STAGES.VERIFY);
  AegisContext.lastEvent = `transfer: peer received & decrypted ${name ?? 'file'}`;
}

/** Record a verification verdict. Only `ok === true` unlocks the archive action. */
export function markVerified(ok, reason = '') {
  AegisContext.verified = Boolean(ok);
  if (ok) {
    AegisContext.flowStage = Math.max(AegisContext.flowStage, FLOW_STAGES.ARCHIVE);
  }
  AegisContext.lastEvent = ok
    ? `signature verified -> ${reason}`
    : `signature rejected -> ${reason}`;
}

/** Record a successful OPFS seal. */
export function markSealed(recordId) {
  AegisContext.sealed = recordId;
  AegisContext.flowStage = Math.max(AegisContext.flowStage, FLOW_STAGES.AUDIT);
  AegisContext.lastEvent = `artifact sealed in vault -> ${recordId}`;
}

/** Clear per-run state so a fresh topology click starts a clean seven-step loop. */
export function resetFlow() {
  AegisContext.selectedNode = null;
  AegisContext.document = null;
  AegisContext.flowStage = 0;
  AegisContext.transfer = { sent: false, received: false };
  AegisContext.lastEvent = '';
  AegisContext.hash = null;
  AegisContext.signature = null;
  AegisContext.publicKey = null;
  AegisContext.artifact = null;
  AegisContext.pendingArtifact = null;
  AegisContext.verified = false;
  AegisContext.sealed = null;
}
