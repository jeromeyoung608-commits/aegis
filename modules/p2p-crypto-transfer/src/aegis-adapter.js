// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
// src/aegis-adapter.js — Aegis integration seam for the P2P transfer module.
//
// Runs inside each P2P iframe. The Aegis shell addresses a specific iframe by
// `frameId` and can (1) `p2p:configure` it (room / shared key / role) and
// auto-connect, and (2) `p2p:send-file` a Blob that is encrypted and streamed over
// the data channel. Incoming files are reported upstream as `p2p:file-received`;
// the shell decides whether to hand them to REDAKTOR or download them directly.

function post(type, payload) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ channel: 'aegis', type, ...payload }, location.origin);
  }
}

window.addEventListener('message', (e) => {
  const m = e.data;
  if (!m || m.channel !== 'aegis') return;
  // Allow the FIRST configure through even though __AEGIS_FRAME_ID is not yet
  // set — it is assigned BY this very handler. The old guard
  // `m.frameId !== (window.__AEGIS_FRAME_ID || '')` compared against '' and
  // dropped the bootstrap message, so peers were never configured.
  if (m.frameId && window.__AEGIS_FRAME_ID && m.frameId !== window.__AEGIS_FRAME_ID) return;

  if (m.type === 'p2p:configure') {
    window.__AEGIS_FRAME_ID = m.frameId;
    window.__AEGIS.connect({
      mode: m.mode || 'local',
      room: m.room,
      pass: m.pass,
      isInitiator: !!m.isInitiator,
    });
  } else if (m.type === 'p2p:send-file') {
    const file = m.file instanceof Blob
      ? new File([m.file], m.name || 'redacted.pdf', { type: m.file.type || 'application/pdf' })
      : m.file;
    if (file) window.__AEGIS.send(file);
  }
});

// Announce readiness so the shell can wire this frame.
post('p2p:frame-ready', { frameId: window.__AEGIS_FRAME_ID });
