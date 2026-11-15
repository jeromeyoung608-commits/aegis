// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
// src/js/aegis-adapter.js — Aegis integration seam for the REDAKTOR redaction module.
//
// Runs inside the REDAKTOR iframe. It (1) accepts a `redaktor:load-doc` command from
// the Aegis shell and automatically feeds the File into the intake queue
// (REDAKTOR.addFiles), and (2) accepts `redaktor:export` to trigger the destructive
// PDF build, whose completion is signalled upstream as `redaktor:export-ready`. A
// "Send to Aegis Peer" button is also injected for manual use. No redaction logic
// lives here — only the bridge between the module and the shell's EventBus.

function ready(cb) {
  if (window.REDAKTOR && typeof window.REDAKTOR.addFiles === 'function') cb();
  else setTimeout(() => ready(cb), 50);
}

function injectSendButton() {
  const anchor = document.getElementById('exportBtn');
  if (!anchor || document.getElementById('aegisSendBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'aegisSendBtn';
  btn.className = 'btn';
  btn.style.marginLeft = '8px';
  btn.textContent = '▶ Send to Aegis Peer';
  btn.title = 'Export the destructive redacted PDF and push it to the P2P transfer module';
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Building & sending…';
    try {
      const blob = await window.REDAKTOR.exportToParent();
      if (!blob) btn.textContent = 'Nothing to send';
    } catch (err) {
      console.error('[aegis-adapter] export failed', err);
      btn.textContent = 'Export failed';
    } finally {
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = '▶ Send to Aegis Peer';
      }, 1500);
    }
  });
  anchor.parentNode.insertBefore(btn, anchor.nextSibling);
}

window.addEventListener('message', (e) => {
  const m = e.data;
  if (!m || m.channel !== 'aegis') return;
  if (m.type === 'redaktor:load-doc') {
    // The shell pushes a file (e.g. a node's associated contract); load it automatically.
    ready(() => {
      const file = m.file instanceof Blob
        ? new File([m.file], m.name || 'device-document.png', { type: m.file.type || 'image/png' })
        : m.file;
      if (file) window.REDAKTOR.addFiles([file]);
    });
  } else if (m.type === 'redaktor:export') {
    ready(() => { window.REDAKTOR.exportToParent(); });
  }
});

ready(injectSendButton);
