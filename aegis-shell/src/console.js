// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
// Aegis/aegis-shell/src/console.js — Operator Console logic (Phase 6).
// Talks to the server's operator endpoints (auth, audit, revocation, escrow, TSA
// verify). The session token is held in memory + sessionStorage; no secret leaves
// the browser except as a Bearer header to this same origin.
import { detectLocale, setLocale, getT } from './i18n.js';

const TOKEN_KEY = 'aegis_console_token';

const $ = (id) => document.getElementById(id);
function getToken() { return sessionStorage.getItem(TOKEN_KEY); }
function setToken(t) { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); }

async function api(path, { method = 'GET', body } = {}) {
  const headers = {};
  const t = getToken();
  if (t) headers.Authorization = 'Bearer ' + t;
  if (body !== undefined) { headers['Content-Type'] = 'application/json'; }
  const res = await fetch(path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  // Clone BEFORE consuming the body: some callers (e.g. CSV export) read the raw
  // stream via res.text() after this helper has already parsed JSON. Without the
  // clone, the second read throws "body stream already read" (M-01).
  const clone = res.clone();
  let data = null;
  try { data = await res.json(); } catch { /* 204 / csv */ }
  return { ok: res.ok, status: res.status, data, res: clone };
}

function showLogin(err) {
  $('console').hidden = true; $('loginCard').hidden = false;
  $('loginMsg').textContent = err || '';
}

async function showConsole() {
  const me = await api('/auth/me');
  if (!me.ok) { setToken(null); return showLogin(); }
  $('loginCard').hidden = true; $('console').hidden = false;
  $('who').textContent = 'signed in: ' + (me.data.username || 'operator');
  $('btnLogout').hidden = false;
  loadAudit(); loadRevocations(); loadSys(); loadBrandLogo();
}

async function login() {
  const r = await api('/auth/login', { method: 'POST', body: { username: $('username').value, password: $('password').value } });
  if (!r.ok) { $('loginMsg').textContent = (r.data && r.data.error) || 'login failed'; return; }
  setToken(r.data.token);
  $('password').value = '';
  showConsole();
}

async function logout() {
  await api('/auth/logout', { method: 'POST' });
  setToken(null);
  showLogin();
}

function showOffline() {
  const el = $('netStatus');
  if (el) { el.hidden = false; el.textContent = '⚠ connection lost — is the server up?'; }
}

function switchTab(name) {
  const ns = $('netStatus'); if (ns) ns.hidden = true;
  document.querySelectorAll('[data-panel]').forEach((s) => { s.hidden = name !== s.getAttribute('data-panel'); });
  // Wrap each panel loader so a dropped connection (fetch rejects) is caught here
  // instead of surfacing as an "Uncaught (in promise) Failed to fetch" in the console.
  const safe = (fn) => {
    try {
      const p = fn();
      if (p && typeof p.catch === 'function') p.catch(() => showOffline());
    } catch { showOffline(); }
  };
  if (name === 'audit') safe(loadAudit);
  if (name === 'revoke') safe(loadRevocations);
  if (name === 'escrow') safe(() => loadEscrow($('escrowRoom').value.trim()));
  if (name === 'sys') safe(loadSys);
  if (name === 'compliance') safe(loadCompliance);
  if (name === 'subjects') { safe(loadDsar); safe(loadDpia); }
  if (name === 'setup') renderSetup();
  if (name === 'sessions') safe(loadSessions);
  if (name === 'config') safe(loadConfigPanel);
}

async function loadAudit() {
  const r = await api('/audit?limit=200');
  const log = $('auditLog');
  if (!r.ok) { log.textContent = '— ' + ((r.data && r.data.error) || r.status); return; }
  const evs = (r.data && r.data.events) || [];
  log.textContent = evs.map((e) =>
    `${new Date(e.ts).toISOString()}  ${e.kind}  ${e.subject || ''}  ${e.detail || ''}`.trimEnd(),
  ).join('\n') || '(no events)';
}

async function exportAuditCsv() {
  const r = await api('/audit/export');
  if (!r.ok) { alert('export failed'); return; }
  const text = await r.res.text();
  const blob = new Blob([text], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'aegis-audit.csv'; a.click();
  URL.revokeObjectURL(a.href);
}

async function loadRevocations() {
  const r = await api('/admin/revoke');
  const tb = $('revTable').querySelector('tbody');
  if (!r.ok) { tb.innerHTML = `<tr><td colspan="4" class="faint">— ${((r.data && r.data.error) || r.status)}</td></tr>`; return; }
  const rows = (r.data && r.data.revocations) || [];
  tb.innerHTML = rows.length ? rows.map((x) => `
    <tr><td class="mono">${x.fingerprint}</td><td>${x.reason || ''}</td>
      <td class="faint">${new Date(x.revoked_ts).toISOString()}</td>
      <td><button class="btn small danger" data-del="${x.fingerprint}">remove</button></td></tr>`).join('')
    : '<tr><td colspan="4" class="faint">no active revocations</td></tr>';
  tb.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    await api('/admin/revoke?fp=' + encodeURIComponent(b.getAttribute('data-del')), { method: 'DELETE' });
    loadRevocations();
  }));
}

async function addRevocation() {
  const fp = $('revFp').value.trim();
  if (!fp) { $('revMsg').textContent = 'fingerprint required'; return; }
  const r = await api('/admin/revoke', { method: 'POST', body: { fingerprint: fp, reason: $('revReason').value.trim() } });
  $('revMsg').textContent = r.ok ? 'revoked ✓' : ((r.data && r.data.error) || 'failed');
  if (r.ok) { $('revFp').value = ''; loadRevocations(); }
}

async function loadEscrow(room) {
  const r = await api('/escrow/admin' + (room ? '?room=' + encodeURIComponent(room) : ''));
  const tb = $('escrowTable').querySelector('tbody');
  if (!r.ok) { tb.innerHTML = `<tr><td colspan="4" class="faint">— ${((r.data && r.data.error) || r.status)}</td></tr>`; return; }
  const rows = (r.data && r.data.envelopes) || [];
  tb.innerHTML = rows.length ? rows.map((x) => `
    <tr><td>${x.room}</td><td class="mono">${x.fingerprint || '—'}</td>
      <td>${x.by || ''}</td><td class="faint">${new Date(x.created_ts).toISOString()}</td></tr>`).join('')
    : '<tr><td colspan="4" class="faint">no escrow envelopes</td></tr>';
}

async function tsaVerify() {
  const out = $('tsaOut'); out.hidden = false;
  const r = await api('/adapter/tsa/verify', { method: 'POST', body: { tokenBase64: $('tsaTok').value.trim(), expectedDigest: $('tsaDigest').value.trim() } });
  if (!r.ok) {
    // Surface WHY it failed instead of dumping raw JSON the operator can't act on.
    const hint = r.status === 503
      ? 'TSA adapter is disabled (config tsa.mode = "off"). Enable it with --adapter-tsa on and a tsa-config file.'
      : ((r.data && r.data.error) || 'request failed');
    out.textContent = 'TSA verify unavailable — ' + hint + '\n' + JSON.stringify(r.data, null, 2);
    return;
  }
  const v = r.data;
  const verdict = v.verified === true ? 'VERIFIED ✓' : (v.verified === 'skipped' ? 'SKIPPED' : 'NOT VERIFIED');
  out.textContent = verdict + '\n' + JSON.stringify(v, null, 2);
}

async function loadSys() {
  const me = await api('/auth/me');
  $('sysInfo').textContent = JSON.stringify({
    authenticated: me.ok,
    user: me.data && me.data.username,
    note: 'Operator session is server-side (TTL).',
  }, null, 2);
}

/* ── Compliance: operator-supplied legal facts + document upload (Phase 8) ──────
   The controller identity, DPO, EU rep, SLA mailbox/timezone and governing law are
   REAL legal facts only the deploying controller knows. This panel is their entry
   point: a form that persists to the server, document upload slots, and "download
   filled" generators that substitute the facts into the compliance templates. */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(',')[1] || '');
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}
function setCompMsg(text, isErr) { const el = $('compMsg'); if (el) { el.textContent = text; el.className = isErr ? 'faint err' : 'faint'; } }
function setCompUploadMsg(text, isErr) { const el = $('compUploadMsg'); if (el) { el.textContent = text; el.className = isErr ? 'faint err' : 'faint'; } }

const COMP_FIELDS = [
  ['ctlLegalName', 'controller', 'legalName'], ['ctlAddress', 'controller', 'address'], ['ctlRegNo', 'controller', 'regNo'],
  ['dpoName', 'dpo', 'name'], ['dpoEmail', 'dpo', 'email'], ['dpoAddress', 'dpo', 'address'],
  ['euName', 'euRep', 'name'], ['euAddress', 'euRep', 'address'],
  ['slaMailbox', 'sla', 'mailbox'], ['slaTimezone', 'sla', 'timezone'],
  ['govLaw', '', 'governingLaw'], ['supAuth', '', 'supervisoryAuthority'],
  ['tsaEndpoint', 'tsa', 'endpoint'],
  ['ropaPurpose', 'ropa', 'purpose'], ['ropaRetention', 'ropa', 'retention'],
  ['ropaRecipients', 'ropa', 'recipients'], ['ropaLegalBasis', 'ropa', 'legalBasis'],
];

async function loadCompliance() {
  const r = await api('/api/compliance');
  const cfg = (r.ok && r.data) || {};
  for (const [id, group, key] of COMP_FIELDS) {
    const el = $(id); if (!el) continue;
    const src = group ? (cfg[group] || {}) : cfg;
    el.value = (src[key] != null ? src[key] : '') + '';
  }
  await loadComplianceFiles();
  loadComplianceStatus();
}

// Factory-gate readiness: shows which required legal facts are still missing before
// filled compliance documents may be issued (server returns 409 + X-Aegis-Compliance).
// Human-readable labels for the required legal-fact keys returned by
// GET /api/compliance/status, so the "what's missing" banner reads naturally
// instead of exposing internal dotted keys like `controller.address`.
const COMPLIANCE_LABELS = {
  'controller.legalName': 'Controller legal name',
  'controller.address': 'Controller address',
  'controller.regNo': 'Controller registration number',
  'dpo.email': 'DPO email',
  'sla.mailbox': 'SLA mailbox',
  'sla.timezone': 'SLA timezone',
  'euRep.name': 'EU representative name',
};

async function loadComplianceStatus() {
  const el = $('compStatus'); if (!el) return;
  const t = getT(AEGIS_LOCALE);
  const r = await api('/api/compliance/status');
  if (!r.ok) { el.className = 'banner-ds warn'; el.textContent = t('status.unavailable'); return; }
  if (r.data.ready) {
    el.className = 'banner-ds ok';
    el.textContent = t('compStatusOk');
  } else {
    el.className = 'banner-ds warn';
    el.innerHTML = t('compStatusWarn') + ' <b>' + (r.data.missing || []).map((k) => COMPLIANCE_LABELS[k] || k).join(', ') + '</b>.';
  }
}

async function saveCompliance() {
  const cfg = { controller: {}, dpo: {}, euRep: {}, sla: {}, tsa: {}, ropa: {} };
  for (const [id, group, key] of COMP_FIELDS) {
    const el = $(id); if (!el) continue;
    const v = el.value.trim();
    if (!group) { if (v) cfg[key] = v; }
    else if (v) cfg[group][key] = v;
  }
  const r = await api('/api/compliance', { method: 'PUT', body: cfg });
  setCompMsg(r.ok ? 'Saved ✓' : ((r.data && r.data.error) || 'save failed'), !r.ok);
}

async function loadComplianceFiles() {
  const r = await api('/api/compliance/files');
  const tb = $('compFiles') && $('compFiles').querySelector('tbody');
  if (!tb) return;
  if (!r.ok) { tb.innerHTML = `<tr><td colspan="5" class="faint">— ${((r.data && r.data.error) || r.status)}</td></tr>`; return; }
  const rows = (r.data && r.data.files) || [];
  tb.innerHTML = rows.length ? rows.map((x) => `
    <tr><td>${x.name}</td><td>${x.kind || ''}</td><td>${x.size} B</td>
      <td class="faint">${new Date(x.createdAt).toISOString()}</td>
      <td><button class="btn small" data-dl="${x.id}" data-name="${x.name}">download</button>
      ${x.kind === 'Logo' ? `<button class="btn small" data-logo="${x.id}">use as logo</button>` : ''}
      <button class="btn small danger" data-del="${x.id}">delete</button></td></tr>`).join('')
    : '<tr><td colspan="5" class="faint">no uploaded documents</td></tr>';
  tb.querySelectorAll('[data-dl]').forEach((b) => b.addEventListener('click', () => downloadFile(b.getAttribute('data-dl'), b.getAttribute('data-name'))));
  tb.querySelectorAll('[data-logo]').forEach((b) => b.addEventListener('click', () => setLogo(b.getAttribute('data-logo'))));
  tb.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    await api('/api/compliance/file/' + b.getAttribute('data-del'), { method: 'DELETE' });
    loadComplianceFiles();
  }));
}

async function uploadComplianceDoc() {
  const input = $('compFile');
  const file = input && input.files && input.files[0];
  if (!file) { setCompUploadMsg('choose a file first', true); return; }
  const b64 = await fileToBase64(file);
  const r = await api('/api/compliance/upload', {
    method: 'POST',
    body: { name: file.name, kind: $('compKind').value, mime: file.type || 'application/octet-stream', data: b64 },
  });
  setCompUploadMsg(r.ok ? `Uploaded ${file.name} ✓` : ((r.data && r.data.error) || 'upload failed'), !r.ok);
  if (r.ok) { input.value = ''; await loadComplianceFiles(); }
}

// C10: region preset suggests a supervisory authority when the field is empty.
const REGION_AUTHORITY = {
  DE: 'Berliner Beauftragte für Datenschutz', FR: 'CNIL (France)', UK: 'ICO (United Kingdom)',
  EU: 'Lead EU member-state DPA', US: 'FTC / relevant state Attorney General',
};
function applyRegion() {
  const a = REGION_AUTHORITY[$('ctlRegion').value];
  if (a && !$('supAuth').value.trim()) $('supAuth').value = a;
}

// C11: probe the configured RFC 3161 TSA adapter for reachability.
async function tsaTest() {
  const ep = $('tsaEndpoint').value.trim();
  if (!ep) { $('tsaMsg').textContent = 'enter endpoint first'; return; }
  const r = await api('/adapter/tsa/verify', { method: 'POST', body: { tokenBase64: '', expectedDigest: '' } });
  $('tsaMsg').textContent = r.ok ? 'reachable ✓' : ((r.data && r.data.error) || 'unreachable');
}

// C9: send an incident / breach notification test (Art.33/34) to the configured channel.
async function incidentNotify() {
  const url = $('incidentMsg') && $('incidentUrl').value.trim();
  let target = url;
  if (!target) { const c = await api('/api/config'); target = (c.ok && c.data && c.data.auditForwardUrl) || ''; }
  if (!target) { $('incidentMsg').textContent = 'no notification URL configured'; return; }
  try {
    const r = await fetch(target, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'incident_test', ts: new Date().toISOString() }) });
    $('incidentMsg').textContent = r.ok ? 'sent ✓' : ('HTTP ' + r.status);
  } catch (e) { $('incidentMsg').textContent = 'failed: ' + e.message; }
}
async function dbBackup() {
  const r = await api('/api/admin/db-backup');
  if (!r.ok) { $('dbBackupMsg').textContent = (r.data && r.data.error) || 'failed'; return; }
  const blob = await r.res.blob();
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'aegis-backup.db'; a.click();
  URL.revokeObjectURL(a.href);
  $('dbBackupMsg').textContent = 'downloaded ✓';
}

async function downloadFile(id, name) {
  const r = await api('/api/compliance/file/' + id);
  if (!r.ok) { alert('download failed'); return; }
  const blob = await r.res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name || 'document'; a.click();
  URL.revokeObjectURL(a.href);
}

async function downloadFilledDoc(name) {
  const r = await api('/api/compliance/doc/' + name);
  if (!r.ok) { alert('generate failed'); return; }
  const text = await r.res.text();
  const blob = new Blob([text], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `${name}-filled.md`; a.click();
  URL.revokeObjectURL(a.href);
}

// Blank, unfilled template (always available, bypasses the factory gate) so a
// customer can read/print the {{...}} placeholders before filling or signing.
async function downloadBlankDoc(name) {
  const r = await api('/api/compliance/template/' + name);
  if (!r.ok) { alert('template download failed'); return; }
  const text = await r.res.text();
  const blob = new Blob([text], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `${name}-template.md`; a.click();
  URL.revokeObjectURL(a.href);
}

// Mark an uploaded Logo file as the active branding logo (persisted to legal config).
async function setLogo(id) {
  const cur = await api('/api/compliance');
  const cfg = (cur.ok && cur.data) || {};
  cfg.branding = Object.assign({}, cfg.branding, { logoId: id });
  const r = await api('/api/compliance', { method: 'PUT', body: cfg });
  if (r.ok) { await loadComplianceFiles(); loadBrandLogo(); }
}

// Render the configured logo in the console topbar (white-label). No-op if unset.
async function loadBrandLogo() {
  const img = document.getElementById('brandLogo');
  if (!img) return;
  const r = await api('/api/compliance/logo');
  if (r.ok && r.status === 200) {
    const blob = await r.res.blob();
    img.src = URL.createObjectURL(blob); img.hidden = false;
  } else { img.hidden = true; img.removeAttribute('src'); }
}

/* ── Pre-deploy setup checklist (C2) ───────────────────────────────────────────
   Mirrors docs/compliance/CONFIGURE-BEFORE-DEPLOY.md sign-off. State is held in
   this browser (localStorage) and can be exported as a signed-off markdown. */
const SETUP_ITEMS = [
  'Controller legal name + registered address (ROPA)',
  'Company registration number',
  'SLA contact mailbox',
  'Operator timezone',
  'Governing law (DPA)',
  'Lead supervisory authority',
  'DPO details completed or explicitly "not appointed"',
  'EU representative completed or confirmed not required',
  'Signed ROPA / DPA / SLA uploaded',
  '"Download filled" documents reviewed by counsel',
  'AUTH_JWT_SECRET / issuer secret set unique per environment',
  'Image pushed to your own registry; secrets via env/secret, not baked in',
  'Operator accounts created (npm run setup)',
  'TLS / reverse proxy configured',
];
const SETUP_KEY = 'aegis_setup_checklist';
function loadSetupState() { try { return JSON.parse(localStorage.getItem(SETUP_KEY)) || {}; } catch { return {}; } }
function renderSetup() {
  const box = $('setupChecklist'); if (!box) return;
  const state = loadSetupState();
  box.innerHTML = SETUP_ITEMS.map((label, i) =>
    `<label class="check-ds"><input type="checkbox" data-i="${i}" ${state[i] ? 'checked' : ''}/> ${label}</label>`).join('');
  box.querySelectorAll('input[type=checkbox]').forEach((c) => c.addEventListener('change', () => {
    const s = loadSetupState(); s[c.getAttribute('data-i')] = c.checked;
    try { localStorage.setItem(SETUP_KEY, JSON.stringify(s)); } catch {}
  }));
  const done = Object.values(state).filter(Boolean).length;
  $('setupMsg').textContent = `${done}/${SETUP_ITEMS.length} done`;
}
function exportSetup() {
  const state = loadSetupState();
  const lines = ['# Aegis pre-deploy sign-off', '', `Generated: ${new Date().toISOString()}`, ''];
  SETUP_ITEMS.forEach((label, i) => lines.push(`${state[i] ? '[x]' : '[ ]'} ${label}`));
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'aegis-setup-signoff.md'; a.click();
  URL.revokeObjectURL(a.href);
}
function resetSetup() { try { localStorage.removeItem(SETUP_KEY); } catch {} renderSetup(); }

/* ── GDPR data subjects: DSAR export + erasure (C4) ────────────────────────── */
async function dsarExport() {
  const r = await api('/export/bundle');
  if (!r.ok) { alert('export failed'); return; }
  const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'aegis-export-bundle.json'; a.click();
  URL.revokeObjectURL(a.href);
}

// DSAR request ledger (GDPR Art. 15/12): record, list (with 30-day deadline state),
// and resolve data-subject requests. Operator-authenticated against this origin.
async function loadDsar() {
  const tb = $('dsarTable') && $('dsarTable').querySelector('tbody');
  if (!tb) return;
  const t = getT(AEGIS_LOCALE);
  const r = await api('/api/compliance/dsar');
  if (!r.ok) { tb.innerHTML = `<tr><td colspan="6" class="faint">— ${((r.data && r.data.error) || r.status)}</td></tr>`; return; }
  const rows = (r.data && r.data.requests) || [];
  if (!rows.length) { tb.innerHTML = `<tr><td colspan="6" class="faint">${t('dsar.empty')}</td></tr>`; return; }
  tb.innerHTML = rows.map((x) => `
    <tr><td>${x.subject_name || '—'}</td><td>${x.subject_email || '—'}</td>
      <td>${x.request_type}</td>
      <td class="${x.status === 'resolved' ? 'ok' : (x.overdue ? 'warn' : '')}">${x.status}${x.status !== 'resolved' ? ` (${t('dsar.due')} ${x.dueInDays}d)` : ''}</td>
      <td class="faint">${new Date(x.created_ts).toISOString().slice(0, 10)}</td>
      <td>${x.status === 'resolved' ? '✓' : `<button class="btn small" data-resolve="${x.id}">${t('dsar.resolve')}</button>`}</td></tr>`).join('');
  tb.querySelectorAll('[data-resolve]').forEach((b) => b.addEventListener('click', async () => {
    const notes = prompt(t('dsar.resolveNotes') || 'Resolution notes (optional):') || '';
    const rr = await api('/api/compliance/dsar/' + b.getAttribute('data-resolve') + '/resolve', { method: 'POST', body: { notes } });
    $('dsarMsg').textContent = rr.ok ? t('dsar.resolved') : ((rr.data && rr.data.error) || 'failed');
    loadDsar();
  }));
}
async function submitDsar() {
  const body = {
    subjectName: $('dsarName').value.trim(), subjectEmail: $('dsarEmail').value.trim(),
    requestType: $('dsarType').value, detail: $('dsarDetail').value.trim(),
  };
  if (!body.subjectEmail) { $('dsarMsg').textContent = getT(AEGIS_LOCALE)('dsar.needEmail'); return; }
  const r = await api('/api/compliance/dsar', { method: 'POST', body });
  $('dsarMsg').textContent = r.ok ? getT(AEGIS_LOCALE)('dsar.recorded') : ((r.data && r.data.error) || 'failed');
  if (r.ok) { $('dsarName').value = ''; $('dsarEmail').value = ''; $('dsarDetail').value = ''; loadDsar(); }
}
async function loadDpia() {
  const el = $('dpiaStatus'); if (!el) return;
  const t = getT(AEGIS_LOCALE);
  const r = await api('/api/compliance/dpia');
  if (!r.ok) { el.textContent = t('status.unavailable'); return; }
  el.innerHTML = r.data.required
    ? `<b class="warn">${t('dpia.required')}</b>${t('dpia.triggerPrefix')} ${(r.data.reasons || []).join('; ')}`
    : t('dpia.notRequired');
}
async function subjectErase() {
  const subject = $('eraseSubject').value.trim();
  if (!subject) { $('eraseMsg').textContent = 'subject required'; return; }
  const r = await api('/audit/erase', { method: 'POST', body: { subject, reason: $('eraseReason').value.trim(), by: $('eraseBy').value.trim() } });
  if (r.ok) $('eraseMsg').textContent = 'erased · tombstone ' + ((r.data && r.data.tombstone) || '');
  else $('eraseMsg').textContent = (r.data && r.data.error) || 'failed';
}
async function subjectVerifyTombstone() {
  const s = $('tombSubject').value.trim();
  if (!s) { $('tombMsg').textContent = 'subject required'; return; }
  const r = await api('/audit/tombstone?subject=' + encodeURIComponent(s));
  if (r.ok) $('tombMsg').textContent = 'tombstone: ' + ((r.data && r.data.tombstone) || 'none');
  else $('tombMsg').textContent = (r.data && r.data.error) || 'failed';
}

/* ── Operator session management (C5) ─────────────────────────────────────── */
async function loadSessions() {
  const tb = $('sessTable') && $('sessTable').querySelector('tbody');
  if (!tb) return;
  const r = await api('/api/sessions');
  if (!r.ok) { tb.innerHTML = `<tr><td colspan="4" class="faint">— ${((r.data && r.data.error) || r.status)}</td></tr>`; return; }
  const rows = (r.data && r.data.sessions) || [];
  tb.innerHTML = rows.length ? rows.map((s) => `
    <tr><td class="mono">${s.id}</td><td>${s.username}</td><td class="faint">${new Date(s.created_ts).toISOString()}</td>
      <td><button class="btn small danger" data-rev="${s.id}">revoke</button></td></tr>`).join('')
    : '<tr><td colspan="4" class="faint">no active sessions</td></tr>';
  tb.querySelectorAll('[data-rev]').forEach((b) => b.addEventListener('click', async () => {
    await api('/api/sessions/' + b.getAttribute('data-rev'), { method: 'DELETE' });
    loadSessions();
  }));
}

/* ── Operator deploy configuration (C6) ────────────────────────────────────── */
async function loadConfigPanel() {
  const r = await api('/api/config');
  const view = $('cfgView');
  if (!view) return;
  if (!r.ok) { view.textContent = '— ' + ((r.data && r.data.error) || r.status); return; }
  const c = r.data;
  view.textContent = JSON.stringify(c, null, 2);
  $('cfgEscrow').checked = !!c.escrowRequireForAdmit;
  $('cfgMfa').checked = !!c.mfaEnforced;
  $('cfgForward').value = c.auditForwardUrl || '';
}
async function saveConfigPanel() {
  const r = await api('/api/config', { method: 'PUT', body: { 'escrow.requireForAdmit': $('cfgEscrow').checked, 'auth.mfaEnforced': $('cfgMfa').checked, 'audit.forwardUrl': $('cfgForward').value.trim() } });
  $('cfgMsg').textContent = r.ok ? 'saved (applies on restart)' : ((r.data && r.data.error) || 'failed');
  if (r.ok) loadConfigPanel();
}
async function adminResetMfa() {
  const u = $('mfaResetUser').value.trim();
  if (!u) { $('mfaResetMsg').textContent = 'username required'; return; }
  const r = await api('/auth/mfa/reset', { method: 'POST', body: { username: u } });
  $('mfaResetMsg').textContent = r.ok ? ('reset ' + u) : ((r.data && r.data.error) || 'failed');
  $('mfaResetUser').value = '';
}

// wire up
// N-04: every operator action that awaits the server toggles aria-busy on its own
// control so assistive tech (EN 301 549 / WCAG 4.1.2 + 4.1.3) knows a task runs.
function setBusy(id, on) { const el = $(id); if (el) el.setAttribute('aria-busy', on ? 'true' : 'false'); }
function withBusy(id, fn) {
  return async (...args) => {
    setBusy(id, true);
    try { return await fn(...args); } finally { setBusy(id, false); }
  };
}
async function exportAuditBundle() {
  const r = await api('/export/bundle');
  if (!r.ok) { alert('export failed'); return; }
  const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'aegis-export-bundle.json'; a.click();
  URL.revokeObjectURL(a.href);
}
$('btnLogin').addEventListener('click', withBusy('btnLogin', login));
$('btnLogout').addEventListener('click', withBusy('btnLogout', logout));
$('password').addEventListener('keydown', (e) => { if (e.key === 'Enter') withBusy('btnLogin', login)(); });
$('auditRefresh').addEventListener('click', withBusy('auditRefresh', loadAudit));
$('auditJson').addEventListener('click', withBusy('auditJson', exportAuditBundle));
$('auditCsv').addEventListener('click', (e) => { e.preventDefault(); withBusy('auditCsv', exportAuditCsv)(); });
$('revAdd').addEventListener('click', withBusy('revAdd', addRevocation));
$('escrowRefresh').addEventListener('click', withBusy('escrowRefresh', () => loadEscrow($('escrowRoom').value.trim())));
$('tsaVerify').addEventListener('click', withBusy('tsaVerify', tsaVerify));
$('ctlRegion').addEventListener('change', applyRegion);
$('tsaTest').addEventListener('click', tsaTest);
$('incidentBtn').addEventListener('click', incidentNotify);
$('dbBackupBtn').addEventListener('click', dbBackup);
$('compSave').addEventListener('click', withBusy('compSave', saveCompliance));
$('compReload').addEventListener('click', withBusy('compReload', loadCompliance));
$('compUpload').addEventListener('click', withBusy('compUpload', uploadComplianceDoc));
$('docRopa').addEventListener('click', () => downloadFilledDoc('ROPA'));
$('docDpa').addEventListener('click', () => downloadFilledDoc('DPA'));
$('docSla').addEventListener('click', () => downloadFilledDoc('SLA'));
$('docPrivacy').addEventListener('click', () => downloadFilledDoc('PRIVACY-POLICY'));
$('docScc').addEventListener('click', () => downloadFilledDoc('SCC'));
$('docDpia').addEventListener('click', () => downloadFilledDoc('DPIA'));
$('docRopaTpl').addEventListener('click', () => downloadBlankDoc('ROPA'));
$('docDpaTpl').addEventListener('click', () => downloadBlankDoc('DPA'));
$('docSlaTpl').addEventListener('click', () => downloadBlankDoc('SLA'));
$('docPrivacyTpl').addEventListener('click', () => downloadBlankDoc('PRIVACY-POLICY'));
$('docSccTpl').addEventListener('click', () => downloadBlankDoc('SCC'));
$('docDpiaTpl').addEventListener('click', () => downloadBlankDoc('DPIA'));
$('setupExport').addEventListener('click', exportSetup);
$('setupReset').addEventListener('click', resetSetup);
$('dsarExport').addEventListener('click', dsarExport);
$('dsarSubmit').addEventListener('click', withBusy('dsarSubmit', submitDsar));
$('dsarRefresh').addEventListener('click', withBusy('dsarRefresh', loadDsar));
$('dpiaRefresh').addEventListener('click', withBusy('dpiaRefresh', loadDpia));
$('eraseBtn').addEventListener('click', subjectErase);
$('tombBtn').addEventListener('click', subjectVerifyTombstone);
$('cfgSave').addEventListener('click', saveConfigPanel);
$('mfaResetBtn').addEventListener('click', adminResetMfa);
document.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => switchTab(b.getAttribute('data-tab'))));

// Phase 7: i18n — set document language and translate the console chrome.
let AEGIS_LOCALE = setLocale(detectLocale());
document.documentElement.lang = AEGIS_LOCALE;
const brandH1 = document.querySelector('.brand-ds h1');
const brandSub = document.querySelector('.brand-ds .sub');

// Translate every [data-i18n] (textContent) and [data-i18n-placeholder] (placeholder)
// element using the current locale. Missing keys fall back to the key itself.
function applyI18n() {
  const t = getT(AEGIS_LOCALE);
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.getAttribute('data-i18n-placeholder')); });
}
function retranslate() {
  const t = getT(AEGIS_LOCALE);
  if (brandH1) brandH1.textContent = t('console.title');
  if (brandSub) brandSub.textContent = t('console.sub');
  applyI18n();
}

// Language switcher (chrome + compliance panel).
const langSel = document.getElementById('langSel');
if (langSel) {
  langSel.value = AEGIS_LOCALE;
  langSel.addEventListener('change', () => { AEGIS_LOCALE = setLocale(langSel.value); retranslate(); });
}
retranslate();

// boot: restore session if a token is present
(async () => { getToken() ? showConsole() : showLogin(); })();

// Phase 7: register the offline shell service worker (best-effort; never blocks UI).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
}
