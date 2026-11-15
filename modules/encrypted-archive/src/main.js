// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
/**
 * ========================================================================
 * Aegis — Local Encrypted Vault (Audit & Archive)
 *
 * Licensed under the MIT License. Any use is permitted, commercial included,
 * with no fee and no permission needed. Attribution is welcome, not required.
 * ========================================================================
 */

console.log(
  '%c AEGIS VAULT %c Engine by Jerome Young | Contact: jeromeyoung608@gmail.com ',
  'background: #d4b06a; color: #171204; font-weight: bold; padding: 4px 8px; border-radius: 4px 0 0 4px;',
  'background: #1a2028; color: #b3bcc8; padding: 4px 8px; border-radius: 0 4px 4px 0;',
);

// src/main.js — UI wiring for the standalone vault page.
//
// The page is also the human-facing browser for the same OPFS folder that
// aegis-shell writes to: OPFS is per-origin, so both surfaces share one vault.

import { createVault } from './vault.js';
import { VAULT_DIR, createMemoryStore, openOpfsStore } from './store.js';

const $ = (id) => document.getElementById(id);

const state = {
  store: null,
  vault: null,
  opfs: false,
  file: null,
  opened: null,
  armedDelete: null,
  armTimer: null,
};

function setMsg(id, text, kind = '') {
  const el = $(id);
  el.textContent = text;
  el.className = 'msg' + (kind ? ' ' + kind : '');
}

function fmt(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
}

/* ── boot ──────────────────────────────────────────────────────────────── */
async function boot() {
  try {
    state.store = await openOpfsStore();
    state.opfs = true;
    $('badgeOpfs').textContent = 'OPFS · aegis-vault';
    $('badgeOpfs').className = 'pill ok';
    $('vaultState').textContent = `Origin Private File System · /${VAULT_DIR}`;
  } catch (error) {
    state.store = createMemoryStore();
    state.opfs = false;
    $('badgeOpfs').textContent = 'OPFS · unavailable (volatile)';
    $('badgeOpfs').className = 'pill err';
    $('vaultState').textContent = 'OPFS unavailable — using a volatile in-memory vault for this session.';
    setMsg('sealMsg', error.message, 'warn');
  }

  state.vault = createVault(state.store);
  await refresh();

  const crossOrigin = performance.getEntriesByType('resource').filter((entry) => {
    try { return new URL(entry.name).origin !== location.origin; } catch { return false; }
  });
  $('badgeNet').textContent = `${crossOrigin.length} network request${crossOrigin.length === 1 ? '' : 's'}`;
}

/* ── file intake ───────────────────────────────────────────────────────── */
function setFile(file) {
  state.file = file || null;
  if (!file) {
    $('fileMeta').textContent = 'No file selected';
    $('btnSeal').disabled = true;
    return;
  }
  $('fileMeta').textContent = `${file.name} · ${fmt(file.size)} · ${file.type || 'application/octet-stream'}`;
  $('btnSeal').disabled = false;
  setMsg('sealMsg', '');
}

$('fileInput').addEventListener('change', (event) => setFile(event.target.files[0]));
const dropZone = $('dropZone');
dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropZone.classList.add('over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('over'));
dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropZone.classList.remove('over');
  if (event.dataTransfer?.files?.length) setFile(event.dataTransfer.files[0]);
});

/* ── seal ──────────────────────────────────────────────────────────────── */
$('btnSeal').addEventListener('click', async () => {
  if (!state.file) return setMsg('sealMsg', 'Choose a file first.', 'err');
  const passphrase = $('sealPass').value;
  if (passphrase.length < 8) return setMsg('sealMsg', 'Passphrase must be at least 8 characters.', 'err');

  let metadata;
  try {
    metadata = JSON.parse($('metadataInput').value || '{}');
  } catch (error) {
    return setMsg('sealMsg', `Metadata is not valid JSON: ${error.message}`, 'err');
  }

  $('btnSeal').disabled = true;
  $('btnSeal').setAttribute('aria-busy', 'true');
  try {
    const bytes = new Uint8Array(await state.file.arrayBuffer());
    const record = await state.vault.seal({
      name: state.file.name,
      type: state.file.type || 'application/octet-stream',
      bytes,
      metadata,
      passphrase,
    });
    $('sealPass').value = '';
    setMsg('sealMsg', `Sealed ${state.file.name} as ${record.id} (${fmt(record.containerSize)}).`, 'ok');
    setFile(null);
    $('fileInput').value = '';
    await refresh();
  } catch (error) {
    setMsg('sealMsg', error.message, 'err');
  } finally {
    $('btnSeal').disabled = !state.file;
    $('btnSeal').setAttribute('aria-busy', 'false');
  }
});

/* ── vault list ────────────────────────────────────────────────────────── */
async function refresh() {
  let entries = [];
  let info = { count: 0, containerBytes: 0 };
  try {
    entries = await state.vault.list();
    info = await state.vault.stats();
  } catch (error) {
    setMsg('vaultMsg', error.message, 'err');
  }

  $('badgeCount').textContent = `${info.count} record${info.count === 1 ? '' : 's'}`;
  const list = $('vaultList');
  list.textContent = '';

  if (!entries.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = state.opfs
      ? 'No sealed records yet. Seal a file to create one.'
      : 'Volatile demo vault is empty.';
    list.appendChild(empty);
  }

  for (const entry of entries) {
    const row = document.createElement('div');
    row.className = 'row-item' + (state.opened?.id === entry.id ? ' active' : '');
    row.dataset.id = entry.id;

    const id = document.createElement('span');
    id.className = 'id';
    id.textContent = entry.id;
    id.title = entry.id;

    const size = document.createElement('span');
    size.className = 'size';
    size.textContent = fmt(entry.containerSize);

    const open = document.createElement('button');
    open.className = 'ghost small';
    open.dataset.act = 'open';
    open.textContent = 'Unlock';

    const del = document.createElement('button');
    del.className = 'ghost small';
    del.dataset.act = 'delete';
    del.textContent = state.armedDelete === entry.id ? 'Confirm?' : 'Delete';

    row.append(id, size, open, del);
    list.appendChild(row);
  }
}

$('btnRefresh').addEventListener('click', async () => {
  const b = $('btnRefresh'); b.setAttribute('aria-busy', 'true');
  try { setMsg('vaultMsg', ''); await refresh(); } finally { b.setAttribute('aria-busy', 'false'); }
});

$('vaultList').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-act]');
  if (!button) return;
  const id = button.closest('.row-item').dataset.id;
  button.setAttribute('aria-busy', 'true');
  try {
    if (button.dataset.act === 'open') { await openRecord(id); return; }

    if (state.armedDelete === id) {
      clearTimeout(state.armTimer);
      state.armedDelete = null;
      try {
        await state.vault.remove(id);
        if (state.opened?.id === id) closeDetail();
        setMsg('vaultMsg', `Deleted ${id}.`, 'warn');
      } catch (error) {
        setMsg('vaultMsg', error.message, 'err');
      }
      await refresh();
      return;
    }

    state.armedDelete = id;
    clearTimeout(state.armTimer);
    state.armTimer = setTimeout(() => { state.armedDelete = null; refresh(); }, 4000);
    await refresh();
  } finally {
    // refresh() rebuilds the row DOM, so this is best-effort on a possibly-detached node.
    button.setAttribute('aria-busy', 'false');
  }
});

/* ── unlock + detail ───────────────────────────────────────────────────── */
async function openRecord(id) {
  const passphrase = $('openPass').value;
  if (passphrase.length < 8) return setMsg('vaultMsg', 'Enter the passphrase (min 8 characters).', 'err');

  try {
    const opened = await state.vault.open(id, passphrase);
    state.opened = opened;
    renderDetail(opened);
    setMsg('vaultMsg', `Unlocked ${id}.`, 'ok');
    await refresh();
  } catch (error) {
    setMsg('vaultMsg', error.message, 'err');
  }
}

function renderDetail(opened) {
  const { metadata, bytes } = opened;
  $('detail').hidden = false;
  $('detailName').textContent = metadata.name || 'artifact.bin';
  $('detailSize').textContent = fmt(bytes.length);

  $('detailMeta').textContent = '';
  const rows = [
    ['record id', opened.id],
    ['media type', metadata.type || 'application/octet-stream'],
    ['sealed at', metadata.sealedAt || '—'],
    ['payload', fmt(bytes.length)],
    ['cipher', opened.header?.alg || 'AES-GCM-256'],
    ['KDF', `${opened.header?.kdf || 'PBKDF2-SHA-256'} · ${opened.header?.iterations ?? '—'} it.`],
  ];
  for (const [key, value] of rows) {
    const dt = document.createElement('dt');
    dt.textContent = key;
    const dd = document.createElement('dd');
    dd.textContent = value;
    $('detailMeta').append(dt, dd);
  }
  $('detailJson').textContent = JSON.stringify(metadata, null, 2);
}

function closeDetail() {
  state.opened = null;
  $('detail').hidden = true;
  $('detailMeta').textContent = '';
  $('detailJson').textContent = '';
  refresh();
}

$('btnCloseDetail').addEventListener('click', closeDetail);

$('btnDownload').addEventListener('click', () => {
  if (!state.opened) return;
  const { metadata, bytes } = state.opened;
  const blob = new Blob([bytes], { type: metadata.type || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = metadata.name || 'artifact.bin';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
});

/* ── debug surface ─────────────────────────────────────────────────────── */
window.__AEGIS_VAULT = {
  seal: (options) => state.vault.seal(options),
  open: (id, passphrase) => state.vault.open(id, passphrase),
  list: () => state.vault.list(),
  stats: () => state.vault.stats(),
};

boot();
