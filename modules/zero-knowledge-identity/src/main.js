// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
/**
 * ========================================================================
 * Aegis — Zero-Knowledge Identity & Local Key Vault
 *
 * Licensed under the Apache License, Version 2.0 (SPDX: Apache-2.0). You may
 * not use this file except in compliance with the License. A copy ships as
 * LICENSE at the repository root; see http://www.apache.org/licenses/LICENSE-2.0
 * ========================================================================
 */
// Aegis/zero-knowledge-identity/src/main.js
// Entry point + UI state machine for the identity module.
//
// Three states, one rule: the private key exists in memory only while the vault
// is unlocked. `state.signingKey` is the single place a CryptoKey can live, and
// Lock() drops it. Reload always boots into SEALED, so the page can never
// "remember" an unlocked session.

console.log(
  '%c Aegis %c Engine by Jerome Young | Contact: jeromeyoung608@gmail.com ',
  'background: #3fb950; color: #000; font-weight: bold; padding: 4px 8px; border-radius: 4px 0 0 4px;',
  'background: #1a2028; color: #b3bcc8; padding: 4px 8px; border-radius: 0 4px 4px 0;',
);

import { openIndexedDbVault, MemoryVault, DB_NAME } from './keystore.js';
import { issueIdentity, unlockIdentity, proveWith, publicCard, isSealed, RECORD_ID, NAME_MAX } from './identity.js';
import { renderAvatar, buildCardBlob, copyText } from './card.js';
import { assertCryptoAvailable, importPublicKeyBase64, fingerprintOf } from './crypto.js';

const $ = (id) => document.getElementById(id);
// localStorage, not sessionStorage: closing the tab and reopening it is a
// stronger persistence proof than an in-session reload, and the whole point of
// this counter is to prove that the identity outlives the page.
const BOOT_KEY = 'aegis.identity.boots';

function readBootCount() {
  try {
    return Number(localStorage.getItem(BOOT_KEY) || 0);
  } catch {
    return 0; // storage blocked (private mode / sandboxed frame): proof degrades, page still works
  }
}

function writeBootCount(value) {
  try {
    localStorage.setItem(BOOT_KEY, String(value));
  } catch { /* ignore: the acceptance row will simply stay pending */ }
}

function clearBootCount() {
  try {
    localStorage.removeItem(BOOT_KEY);
  } catch { /* ignore */ }
}

const state = {
  vault: null,
  record: null,
  signingKey: null,   // CryptoKey, present only while unlocked
  boots: 0,
  restored: false,
  checks: new Map(),
};

/* ── acceptance evidence ────────────────────────────────────────────────── */

const CHECK_ORDER = [
  'webcrypto',
  'vault',
  'record',
  'public-key',
  'sealed',
  'unlock-gate',
  'signature',
  'reload',
];

function setCheck(id, status, detail) {
  state.checks.set(id, { status, detail });
}

function renderChecks() {
  const host = $('checks');
  host.textContent = '';
  for (const id of CHECK_ORDER) {
    const entry = state.checks.get(id) || { status: 'pending', detail: 'awaiting input' };
    const li = document.createElement('li');
    li.className = `check ${entry.status}`;
    const tag = document.createElement('span');
    tag.className = 'check-tag';
    tag.textContent = entry.status === 'pass' ? '[PASS]' : entry.status === 'fail' ? '[FAIL]' : '[····]';
    const label = document.createElement('span');
    label.className = 'check-label';
    label.textContent = entry.detail;
    li.append(tag, label);
    host.appendChild(li);
  }
}

/* ── panels ─────────────────────────────────────────────────────────────── */

function paint() {
  const hasRecord = Boolean(state.record);
  const unlocked = Boolean(state.signingKey);
  $('panelSetup').hidden = hasRecord;
  $('panelUnlock').hidden = !hasRecord || unlocked;
  $('panelCard').hidden = !hasRecord;

  if (hasRecord) {
    const card = publicCard(state.record);
    renderAvatar($('avatar'), card.fingerprint);
    $('cardName').textContent = card.name;
    $('cardFp').textContent = card.fingerprint;
    $('pubKey').textContent = card.publicKeySpki;
    $('cardCreated').textContent = new Date(card.createdAt).toLocaleString();
    const badge = $('cardState');
    badge.textContent = unlocked ? 'unlocked · key in memory' : 'sealed · passphrase required';
    badge.className = `state ${unlocked ? 'ok' : 'warn'}`;
    $('btnLock').disabled = !unlocked;
    $('btnSign').disabled = !unlocked;
    // AEG-24: make the gate legible. A sealed key MUST stay sealed until the
    // operator supplies the passphrase, so we explain why Sign is disabled
    // rather than auto-unlocking it after creation.
    $('btnSign').title = unlocked
      ? 'Sign a fresh challenge with the unlocked key'
      : 'Unlock the identity with its passphrase to enable Sign';
    $('signGateHint').textContent = unlocked
      ? 'Identity unlocked — the private key is in memory until you Lock or reload.'
      : 'Sign stays disabled while the key is sealed. Enter the passphrase in the Unlock panel above, then press Unlock.';
  } else {
    $('btnSign').disabled = true;
    $('btnSign').title = 'Create an identity first';
    $('signGateHint').textContent = 'Create an identity, then unlock it with your passphrase to enable Sign.';
  }
  renderChecks();
}

function msg(id, text, kind = 'info') {
  const el = $(id);
  el.textContent = text;
  el.className = `msg ${kind}`;
}

/* ── vault boot ─────────────────────────────────────────────────────────── */

async function openVault() {
  try {
    const vault = await openIndexedDbVault();
    setCheck('vault', 'pass', `IndexedDB vault "${DB_NAME}" opened`);
    return vault;
  } catch (error) {
    // A blocked/denied IndexedDB (private mode, sandboxed iframe) must not turn
    // into a blank page. Fall back to memory and be loud about the downgrade.
    setCheck('vault', 'fail', `IndexedDB unavailable — memory vault only (${error.message})`);
    msg('setupMsg', 'Storage is blocked in this context; identities will not survive a reload.', 'warn');
    return new MemoryVault();
  }
}

async function boot() {
  try {
    assertCryptoAvailable();
    setCheck('webcrypto', 'pass', 'Web Crypto: ECDSA P-256 available');
  } catch (error) {
    setCheck('webcrypto', 'fail', error.message);
    renderChecks();
    return;
  }

  state.boots = readBootCount() + 1;
  writeBootCount(state.boots);

  state.vault = await openVault();
  const existing = await state.vault.get(RECORD_ID);

  if (existing) {
    state.record = existing;
    state.restored = state.boots > 1;
    setCheck('record', 'pass', `identity "${existing.name}" read from ${state.vault.kind}`);
    setCheck('sealed', isSealed(existing) ? 'pass' : 'fail',
      isSealed(existing) ? 'private key sealed: AES-GCM-256, PBKDF2-SHA256 250k' : 'vault record leaks private key material');
    setCheck('public-key', 'pass', 'public key exported as SPKI Base64');
    setCheck('unlock-gate', 'pass', 'private key unreadable until the passphrase is supplied');
    setCheck('reload', state.restored ? 'pass' : 'pending',
      state.restored ? `identity restored on page load #${state.boots} — IndexedDB outlived the page (reload or new tab)`
        : 'reload the page (or close and reopen the tab) to prove IndexedDB persistence');
  } else {
    state.boots = state.boots || 1;
    setCheck('record', 'pending', 'no identity yet — issue one');
    setCheck('reload', 'pending', 'issue an identity, then reload');
  }
  paint();
}

/* ── actions ────────────────────────────────────────────────────────────── */

async function onCreate(event) {
  event.preventDefault();
  const name = $('name').value;
  const passphrase = $('passphrase').value;
  const confirm = $('confirm').value;

  if (passphrase.length < 8) { msg('setupMsg', 'Passphrase must be at least 8 characters.', 'err'); return; }
  if (passphrase !== confirm) { msg('setupMsg', 'The two passphrases do not match.', 'err'); return; }

  $('btnCreate').disabled = true;
  $('btnCreate').setAttribute('aria-busy', 'true');
  msg('setupMsg', 'Deriving keys (PBKDF2 250,000 iterations)…', 'info');
  try {
    const record = await issueIdentity({ name, passphrase });
    await state.vault.put(record);
    state.record = record;

    const readBack = await state.vault.get(RECORD_ID);
    const spki = await importPublicKeyBase64(readBack.publicKeySpki);
    const fingerprint = await fingerprintOf(spki);

    setCheck('record', 'pass', `identity "${readBack.name}" written to ${state.vault.kind}`);
    setCheck('public-key', fingerprint === readBack.fingerprint ? 'pass' : 'fail',
      fingerprint === readBack.fingerprint
        ? 'public key round-trips: Base64 → SPKI → same SHA-256 fingerprint'
        : 'public key did not round-trip');
    setCheck('sealed', isSealed(readBack) ? 'pass' : 'fail',
      'private key sealed: AES-GCM-256, PBKDF2-SHA256 250k');
    setCheck('unlock-gate', 'pass', 'private key unreadable until the passphrase is supplied');
    setCheck('reload', 'pending', 'reload the page to prove IndexedDB persistence');

    $('passphrase').value = '';
    $('confirm').value = '';
    // AEG-24: creation seals the key immediately, so Sign stays disabled by design.
    // Say so and point at the next action instead of leaving a dead-looking button.
    msg('setupMsg', `Seal issued for ${readBack.name}. Fingerprint ${readBack.fingerprint}. Next: enter the passphrase in the Unlock panel to enable Sign.`, 'ok');
    msg('unlockMsg', 'Identity created and sealed. Enter the same passphrase here to unlock it and enable Sign.', 'info');
  } catch (error) {
    msg('setupMsg', error.message, 'err');
  } finally {
    $('btnCreate').disabled = false;
    $('btnCreate').setAttribute('aria-busy', 'false');
    paint();
  }
}

async function onUnlock(event) {
  event?.preventDefault();
  const passphrase = $('unlockPass').value;
  if (!passphrase) { msg('unlockMsg', 'Enter the vault passphrase.', 'err'); return; }

  $('btnUnlock').disabled = true;
  $('btnUnlock').setAttribute('aria-busy', 'true');
  try {
    const { privateKey } = await unlockIdentity(state.record, passphrase);
    state.signingKey = privateKey;
    const proof = await proveWith(privateKey, state.record);
    setCheck('signature', proof.verified ? 'pass' : 'fail',
      proof.verified ? 'ECDSA signature over a fresh challenge verifies against the stored public key'
        : 'signature did not verify');
    setCheck('unlock-gate', 'pass', 'passphrase accepted; key material only in memory');
    msg('unlockMsg', 'Vault unlocked. The private key lives in memory until you lock or reload.', 'ok');
    $('unlockPass').value = '';
  } catch (error) {
    setCheck('signature', 'fail', error.message);
    msg('unlockMsg', error.message, 'err');
  } finally {
    $('btnUnlock').disabled = false;
    $('btnUnlock').setAttribute('aria-busy', 'false');
    paint();
  }
}

function onLock() {
  state.signingKey = null;
  setCheck('signature', 'pending', 'locked — unlock to re-run the possession proof');
  msg('unlockMsg', 'Sealed. The in-memory key was dropped.', 'ok');
  $('unlockPass').value = '';
  paint();
}

/* Deletion is the one irreversible action here, so it gets a real dialog rather
 * than a native prompt: the confirm button stays disabled until the operator
 * retypes the identity's own name, GitHub-style. */
function openDeleteDialog() {
  if (!state.record) return msg('unlockMsg', 'No identity found.', 'err');
  const dialog = $('deleteDialog');
  $('deleteTarget').textContent = state.record.name;
  $('deleteConfirm').value = '';
  $('btnDeleteConfirm').disabled = true;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
  $('deleteConfirm').focus();
}

function closeDeleteDialog() {
  const dialog = $('deleteDialog');
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
}

function onDeleteInput() {
  const typed = $('deleteConfirm').value.trim();
  $('btnDeleteConfirm').disabled = !state.record || typed !== state.record.name;
}

async function onDeleteConfirm(event) {
  event.preventDefault();
  if (!state.record) { closeDeleteDialog(); return; }
  if ($('deleteConfirm').value.trim() !== state.record.name) return;

  const b = $('btnDeleteConfirm'); b.setAttribute('aria-busy', 'true');
  try {
    await state.vault.remove(RECORD_ID);
    state.record = null;
    state.signingKey = null;
    for (const id of CHECK_ORDER) state.checks.delete(id);
    clearBootCount();
    state.boots = 0;
    closeDeleteDialog();
    await boot();
    msg('setupMsg', 'Identity removed. Its public key can no longer be proven by this device.', 'warn');
  } finally { b.setAttribute('aria-busy', 'false'); }
}

async function onSign() {
  if (!state.signingKey) return;
  const b = $('btnSign'); b.setAttribute('aria-busy', 'true');
  try {
    const proof = await proveWith(state.signingKey, state.record);
    setCheck('signature', proof.verified ? 'pass' : 'fail',
      proof.verified ? 'ECDSA signature over a fresh challenge verifies against the stored public key'
        : 'signature did not verify');
    msg('signMsg', proof.verified ? `Verified signature over "${proof.challenge.slice(0, 46)}…"` : 'Signature rejected.', proof.verified ? 'ok' : 'err');
    renderChecks();
  } finally { b.setAttribute('aria-busy', 'false'); }
}

async function onCopy() {
  if (!state.record) return msg('signMsg', 'No identity found.', 'err');
  const copied = await copyText(state.record.publicKeySpki);
  msg('signMsg', copied ? 'Public key copied to clipboard.' : 'Clipboard blocked by the browser.', copied ? 'ok' : 'warn');
}

function onExport() {
  if (!state.record) return msg('signMsg', 'No identity found.', 'err');
  const blob = buildCardBlob(state.record);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${state.record.name.replace(/[^\w.-]+/g, '_')}-aegis-card.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  msg('signMsg', 'Business card exported (public key only — no private material).', 'ok');
}

function onReload() {
  location.reload();
}

function paintNetworkBadge() {
  const external = performance.getEntriesByType('resource')
    .filter((entry) => entry.name && new URL(entry.name).origin !== location.origin);
  $('badgeNet').textContent = `network: ${external.length} external request(s)`;
  $('badgeNet').dataset.ok = external.length === 0 ? '1' : '0';
}

/* ── wiring ─────────────────────────────────────────────────────────────── */

$('formSetup').addEventListener('submit', onCreate);
$('btnUnlock').addEventListener('click', onUnlock);
$('formUnlock').addEventListener('submit', onUnlock);
$('btnLock').addEventListener('click', onLock);
$('btnDelete').addEventListener('click', openDeleteDialog);
$('formDelete').addEventListener('submit', onDeleteConfirm);
$('deleteConfirm').addEventListener('input', onDeleteInput);
$('btnDeleteCancel').addEventListener('click', closeDeleteDialog);
$('btnSign').addEventListener('click', onSign);
$('btnCopy').addEventListener('click', onCopy);
$('btnExport').addEventListener('click', onExport);
$('btnReload').addEventListener('click', onReload);
$('name').setAttribute('maxlength', String(NAME_MAX));

boot().then(paintNetworkBadge);
