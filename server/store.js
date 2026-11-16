// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// Aegis/server/store.js — zero-dependency embedded store (node:sqlite, built into Node 22+).
//
// This is the persistence + compliance foundation (Phase 0 → Phase 1). It needs NO
// external database: node:sqlite ships with Node, so a one-click install stays
// one-click. The schema is additive — later phases (identity, revocation) extend
// these tables, they do not replace them.
//
// Two-layer audit design (important):
//   • The in-browser hash chain (modules/audit-timeline) proves event INTEGRITY to
//     the user (tamper-evident, client-side).
//   • THIS server-side log proves the SERVER actually saw and recorded an event,
//     and is what an investigator/regulator subpoenas. It is operator-facing.
//   • GDPR right-to-erasure (Art. 17) is implemented as targeted deletion of a
//     subject's personal-data rows PLUS a retained erasure marker (we must keep
//     evidence that we complied). The immutable record is the erasure action itself.
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DATA_DIR = path.join(ROOT, 'data');
const DB_PATH = process.env.AEGIS_DB || path.join(DATA_DIR, 'aegis.db');

let db = null;

export function initStore() {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS audit_events (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      ts      INTEGER NOT NULL,
      kind    TEXT    NOT NULL,
      subject TEXT,
      detail  TEXT,
      remote  TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_events(ts);
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS accounts (
      username   TEXT PRIMARY KEY,
      pw_hash    TEXT NOT NULL,
      pw_salt   TEXT NOT NULL,
      role       TEXT NOT NULL DEFAULT 'operator',
      created_ts INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      username   TEXT NOT NULL,
      created_ts INTEGER NOT NULL,
      expires_ts INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_exp ON sessions(expires_ts);
    CREATE TABLE IF NOT EXISTS revocations (
      fingerprint TEXT PRIMARY KEY,
      reason      TEXT,
      revoked_ts  INTEGER NOT NULL,
      by          TEXT,
      note        TEXT
    );
    CREATE TABLE IF NOT EXISTS escrow_envelopes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      room        TEXT NOT NULL,
      fingerprint TEXT,
      envelope    TEXT NOT NULL,
      created_ts  INTEGER NOT NULL,
      by          TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_escrow_room ON escrow_envelopes(room);
    CREATE TABLE IF NOT EXISTS scim_tokens (
      token_hash  TEXT PRIMARY KEY,
      created_ts  INTEGER NOT NULL,
      expires_ts  INTEGER NOT NULL,
      label       TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_scim_tokens_exp ON scim_tokens(expires_ts);
    CREATE TABLE IF NOT EXISTS dsar_requests (
      id            TEXT PRIMARY KEY,
      subject_name  TEXT,
      subject_email TEXT,
      request_type  TEXT,
      detail        TEXT,
      status        TEXT NOT NULL DEFAULT 'received',
      created_ts    INTEGER NOT NULL,
      due_ts        INTEGER NOT NULL,
      resolved_ts   INTEGER,
      operator_notes TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_dsar_due ON dsar_requests(due_ts);
  `);
  // Additive migrations — every older release upgrades in place, no data loss.
  // Pre-existing databases (created before the subject column existed) get it added.
  try { db.exec('ALTER TABLE audit_events ADD COLUMN subject TEXT'); } catch { /* already present */ }
  // The subject index depends on the column above; create it only AFTER the
  // migration so legacy DBs (whose audit_events lacks `subject` at boot) don't
  // fail the initial db.exec with "no such column: subject" (D-02 fix).
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_audit_subject ON audit_events(subject)'); } catch { /* already present */ }
  // SCIM / operator deprovisioning needs an enabled flag; default ON for back-compat.
  try { db.exec('ALTER TABLE accounts ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1'); } catch { /* already present */ }
  // MFA (RFC 6238 TOTP): encrypted seed; NULL means MFA not enrolled.
  try { db.exec('ALTER TABLE accounts ADD COLUMN totp_blob TEXT'); } catch { /* already present */ }
  // MFA recovery codes (sealed JSON of salted SHA-256 hashes); one-time, regenerated on re-enroll.
  try { db.exec('ALTER TABLE accounts ADD COLUMN totp_recovery TEXT'); } catch { /* already present */ }
  return db;
}

// ── meta helpers (operator-scoped, never exposed over HTTP) ──────────────────
export function getMeta(key) {
  if (!db) initStore();
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key);
  return row ? row.value : null;
}
export function setMeta(key, value) {
  if (!db) initStore();
  db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, String(value));
}

// ── GDPR tombstones (v7 P2) ──────────────────────────────────────────────────
// Erasure markers must stay provable ("we complied") while NOT keeping the
// erased person's identifier in clear text. A per-install random salt makes the
// digest non-reversible to an outsider; the operator can re-hash a known subject
// via tombstoneHash() to prove a marker belongs to that subject.
function tombstoneSalt() {
  let s = getMeta('tombstone_salt');
  if (!s) { s = crypto.randomBytes(32).toString('hex'); setMeta('tombstone_salt', s); }
  return s;
}
export function tombstoneHash(subject) {
  return crypto.createHash('sha256').update(`${tombstoneSalt()}|${String(subject)}`).digest('hex').slice(0, 32);
}

// ── SCIM token rotation (v7 P2) ──────────────────────────────────────────────
// Only SHA-256 digests are stored — a database leak cannot yield a usable token.
export function addScimTokenHash(hash, ttlMs, label = 'rotated') {
  if (!db) initStore();
  const now = Date.now();
  db.prepare('INSERT OR REPLACE INTO scim_tokens (token_hash, created_ts, expires_ts, label) VALUES (?, ?, ?, ?)')
    .run(hash, now, now + ttlMs, label);
}
export function isActiveScimTokenHash(hash) {
  if (!db) initStore();
  return !!(db.prepare('SELECT 1 AS x FROM scim_tokens WHERE token_hash = ? AND expires_ts > ?').get(hash, Date.now()));
}
export function revokeAllScimTokens() {
  if (!db) initStore();
  const r = db.prepare('DELETE FROM scim_tokens').run();
  return r.changes;
}
export function listScimTokens() {
  if (!db) initStore();
  return db.prepare('SELECT token_hash, created_ts, expires_ts, label FROM scim_tokens ORDER BY created_ts').all();
}

// Append-only operator-facing audit log. `subject` names the data subject (a room,
// an account id, a signer id) so GDPR erasure can target it later.
// Audit forwarding (C7): when set, each recorded event is fire-and-forget POSTed
// to an external SIEM/webhook (operator-configured). Best-effort — failures are
// swallowed so forwarding never blocks the audit write or the request path.
let AUDIT_FORWARD_URL = '';
export function setAuditForwardUrl(u) { AUDIT_FORWARD_URL = u || ''; }

export function recordAudit({ kind, subject = null, detail = null, remote = null }) {
  if (!db) initStore();
  const ts = Date.now();
  db.prepare(
    'INSERT INTO audit_events (ts, kind, subject, detail, remote) VALUES (?, ?, ?, ?, ?)',
  ).run(ts, kind, subject, detail, remote);
  if (AUDIT_FORWARD_URL) {
    const ev = { ts, kind, subject, detail, remote };
    setImmediate(() => {
      fetch(AUDIT_FORWARD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ev),
      }).catch(() => {});
    });
  }
}

// Back-compat convenience used by server.js boot/session logging.
export function recordEvent(kind, opts = {}) {
  recordAudit({ kind, subject: opts.subject ?? null, detail: opts.detail ?? null, remote: opts.remote ?? null });
}

export function getEvents(opts = {}) {
  if (!db) initStore();
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 10_000);
  return db
    .prepare('SELECT id, ts, kind, subject, detail, remote FROM audit_events ORDER BY ts DESC LIMIT ?')
    .all(limit);
}
export function countEvents() {
  if (!db) initStore();
  return db.prepare('SELECT COUNT(*) AS c FROM audit_events').get().c;
}
export function countSessions() {
  if (!db) initStore();
  return db.prepare('SELECT COUNT(*) AS c FROM sessions').get().c;
}

// GDPR Art. 17 — right to erasure. We delete the subject's personal-data rows but
// RETAIN an erasure marker (accountability: we must prove we complied). Erasure
// and retention markers are themselves exempt from later deletion.
//
// B-04 hardening: the operator's OWN security/audit trail (subject = the operator
// account name, or 'system'/null/empty) is tamper-evident accountability and MUST
// NOT be erasable. Otherwise anyone holding the issuer secret could wipe their own
// traces — which the audit reproduced (`POST /audit/erase {"subject":"admin"}`
// dropped 19 of the operator's events). GDPR erasure targets DATA SUBJECTS (rooms,
// signers), never the operator/system accountability log, so protected subjects are
// refused with { refused: true } and a `gdpr_erasure_denied` marker is kept.
export function eraseSubject(subject, reason, by) {
  if (!db) initStore();
  const PROTECTED = new Set(['', 'system', 'operator', 'server', 'aegis']);
  // Tombstones record a salted digest, never the subject's clear identifier.
  // The operator can reproduce it with tombstoneHash(subject) for verification.
  const marker = tombstoneHash(subject);
  if (subject === null || PROTECTED.has(String(subject))) {
    recordAudit({ kind: 'gdpr_erasure_denied', subject: null, detail: `refused erasure of protected subjectHash=${marker} by=${by || 'operator'}` });
    return { deleted: 0, refused: true };
  }
  // A real operator/administrator account name is also the accountability trail.
  const isOperator = db
    .prepare("SELECT 1 FROM accounts WHERE username = ? AND role IN ('operator','admin')")
    .get(subject);
  if (isOperator) {
    recordAudit({ kind: 'gdpr_erasure_denied', subject: null, detail: `refused erasure of operator account subjectHash=${marker} by=${by || 'operator'}` });
    return { deleted: 0, refused: true };
  }
  recordAudit({
    kind: 'gdpr_erasure',
    subject: null,
    detail: `erased subjectHash=${marker} reason=${reason || 'unspecified'} by=${by || 'operator'}`,
    remote: null,
  });
  const r = db.prepare("DELETE FROM audit_events WHERE subject = ? AND kind NOT IN ('gdpr_erasure','retention_purge','gdpr_erasure_denied')").run(subject);
  return { deleted: r.changes };
}

// Data minimization / retention. Deletes events older than `days`, but never the
// erasure/retention markers (those are the compliance evidence we must keep).
export function purgeOldEvents(days) {
  if (!db) initStore();
  const cutoff = Date.now() - Math.max(days, 0) * 86_400_000;
  const r = db.prepare(
    "DELETE FROM audit_events WHERE ts < ? AND kind NOT IN ('gdpr_erasure','retention_purge')",
  ).run(cutoff);
  recordAudit({ kind: 'retention_purge', detail: `purged events older than ${days}d (deleted ${r.changes})` });
  return { deleted: r.changes };
}

export function getDb() {
  return db || initStore();
}

// ── Identity: local accounts (Phase 2) ───────────────────────────────────────
// Passwords are scrypt-hashed with a per-account random salt (node:crypto, no
// external dep). Sessions are server-side rows with a TTL; the token is just a
// 256-bit random id looked up here. OIDC/SAML/LDAP are config-driven in server.js
// and fall back to / do not replace this local store.
function scryptHash(pw, salt) {
  return crypto.scryptSync(String(pw), salt, 64).toString('hex');
}

export function createAccount(username, password, role = 'operator') {
  if (!db) initStore();
  const salt = crypto.randomBytes(16).toString('hex');
  const r = db.prepare(
    'INSERT OR IGNORE INTO accounts (username, pw_hash, pw_salt, role, created_ts, enabled) VALUES (?, ?, ?, ?, ?, 1)',
  ).run(username, scryptHash(password, salt), salt, role, Date.now());
  return r.changes > 0;
}

export function verifyAccount(username, password) {
  if (!db) initStore();
  const row = db.prepare('SELECT pw_hash, pw_salt, enabled FROM accounts WHERE username = ?').get(username);
  // Constant-ish work even for unknown users, to blunt username enumeration timing.
  const hash = row ? row.pw_hash : scryptHash(password, crypto.randomBytes(16).toString('hex'));
  const salt = row ? row.pw_salt : '0'.repeat(32);
  const ok = row && crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(scryptHash(password, salt), 'hex'));
  if (!ok) return false;
  // SCIM deprovisioning sets enabled=0 — a disabled account must fail auth (401)
  // immediately, even with the correct password.
  if (row.enabled === 0) return false;
  return true;
}

export function accountExists(username) {
  if (!db) initStore();
  // No argument → "does any account exist?" (used to decide first-run seeding).
  // With a username → "does THIS account exist?" (used by SCIM create / OIDC JIT).
  if (username === undefined) {
    return (db.prepare('SELECT COUNT(*) AS n FROM accounts').get().n) > 0;
  }
  return !!(db.prepare('SELECT 1 AS x FROM accounts WHERE username = ?').get(username));
}

// Non-secret account metadata only (never pw_hash / pw_salt) — used by the
// Art.20 portability bundle and SCIM list so an operator can export/manage accounts.
export function listAccounts() {
  if (!db) initStore();
  return db.prepare('SELECT username, role, created_ts, enabled FROM accounts ORDER BY created_ts').all();
}

// Single account (non-secret fields) for SCIM read / reconciliation.
export function getAccount(username) {
  if (!db) initStore();
  return db.prepare('SELECT username, role, created_ts, enabled FROM accounts WHERE username = ?').get(username) || null;
}

// SCIM deprovisioning: flip enabled. 0 = login refused (401); 1 = active.
export function setAccountEnabled(username, enabled) {
  if (!db) initStore();
  const r = db.prepare('UPDATE accounts SET enabled = ? WHERE username = ?').run(enabled ? 1 : 0, username);
  return r.changes > 0;
}

// ── MFA (v7 P1) ─────────────────────────────────────────────────────────────
// `totp_blob` is an AES-256-GCM sealed secret, never a plaintext TOTP seed.
export function getTotpBlob(username) {
  if (!db) initStore();
  const row = db.prepare('SELECT totp_blob FROM accounts WHERE username = ?').get(username);
  return row && row.totp_blob ? row.totp_blob : null;
}
export function setTotpBlob(username, blob) {
  if (!db) initStore();
  const r = db.prepare('UPDATE accounts SET totp_blob = ? WHERE username = ?').run(blob, username);
  return r.changes > 0;
}
export function listAccountsWithMfa() {
  if (!db) initStore();
  return db.prepare('SELECT username, role, enabled, totp_blob FROM accounts ORDER BY created_ts').all();
}
// Recovery codes: stored as a sealed JSON array of salted SHA-256 hashes so a DB
// leak never yields usable codes. Consumed codes are removed from the array.
export function getMfaRecoveryBlob(username) {
  if (!db) initStore();
  const row = db.prepare('SELECT totp_recovery FROM accounts WHERE username = ?').get(username);
  return row && row.totp_recovery ? row.totp_recovery : null;
}
export function setMfaRecoveryBlob(username, blob) {
  if (!db) initStore();
  const r = db.prepare('UPDATE accounts SET totp_recovery = ? WHERE username = ?').run(blob, username);
  return r.changes > 0;
}

export function createSession(username, ttlMs = 3_600_000) {
  if (!db) initStore();
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  db.prepare('INSERT INTO sessions (token, username, created_ts, expires_ts) VALUES (?, ?, ?, ?)')
    .run(token, username, now, now + ttlMs);
  return token;
}

export function getSession(token) {
  if (!db) initStore();
  if (!token) return null;
  const row = db.prepare('SELECT username, expires_ts FROM sessions WHERE token = ?').get(token);
  if (!row) return null;
  if (row.expires_ts < Date.now()) { deleteSession(token); return null; }
  return row.username;
}

export function deleteSession(token) {
  if (!db) initStore();
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

// Operator console: list active sessions (token shown only as a 12-hex prefix so a
// token never leaves the server in full) and revoke by that prefix.
export function listSessions() {
  if (!db) initStore();
  return db.prepare(
    'SELECT substr(token,1,12) AS id, username, created_ts, expires_ts FROM sessions ORDER BY created_ts DESC',
  ).all().map((s) => ({ ...s, current: false }));
}
export function deleteSessionById(prefix) {
  if (!db) initStore();
  return db.prepare('DELETE FROM sessions WHERE substr(token,1,12) = ?').run(prefix);
}

export function purgeExpiredSessions() {
  if (!db) initStore();
  db.prepare('DELETE FROM sessions WHERE expires_ts < ?').run(Date.now());
}

// ── Revocation (Phase 5) ──────────────────────────────────────────────────────
// A CRL/OCSP-style local deny-list of signing/transport key fingerprints. Checked
// at session admission so a revoked presenter/signer cannot be admitted. Mirrors
// the spirit of certificate revocation without depending on a public CA.
export function addRevocation(fingerprint, reason = 'unspecified', by = 'operator', note = '') {
  if (!db) initStore();
  const fp = String(fingerprint).toLowerCase();
  db.prepare('INSERT OR REPLACE INTO revocations (fingerprint, reason, revoked_ts, by, note) VALUES (?, ?, ?, ?, ?)')
    .run(fp, reason, Date.now(), by, note);
  recordAudit({ kind: 'revocation_add', subject: fp, detail: `reason=${reason} by=${by}`, remote: null });
  return { fingerprint: fp, revoked: true };
}

export function isRevoked(fingerprint) {
  if (!db) initStore();
  if (!fingerprint) return false;
  const row = db.prepare('SELECT fingerprint FROM revocations WHERE fingerprint = ?').get(String(fingerprint).toLowerCase());
  return !!row;
}

export function listRevocations() {
  if (!db) initStore();
  return db.prepare('SELECT fingerprint, reason, revoked_ts, by, note FROM revocations ORDER BY revoked_ts DESC').all();
}

export function removeRevocation(fingerprint) {
  if (!db) initStore();
  const fp = String(fingerprint).toLowerCase();
  const r = db.prepare('DELETE FROM revocations WHERE fingerprint = ?').run(fp);
  recordAudit({ kind: 'revocation_remove', subject: fp, remote: null });
  return { deleted: r.changes };
}

// ── Key escrow (Phase 4: server-side key-escrow policy) ──────────────────────
// The server is "server-blind" for file bytes, but an operator may require a key
// escrow envelope for compliance/break-glass recovery. The CLIENT seals the
// envelope to the operator's public key (CONFIG.escrow.operatorPubKey) and the
// server only stores + retrieves the opaque blob. It never sees key material.
export function depositEscrow({ room, fingerprint = null, envelope, by = 'peer' }) {
  if (!db) initStore();
  const r = db.prepare(
    'INSERT INTO escrow_envelopes (room, fingerprint, envelope, created_ts, by) VALUES (?, ?, ?, ?, ?)',
  ).run(room, fingerprint ? String(fingerprint).toLowerCase() : null, String(envelope), Date.now(), by);
  recordAudit({ kind: 'escrow_deposit', subject: fingerprint || room, detail: `room=${room} by=${by}`, remote: null });
  return { id: r.lastInsertRowid, ok: true };
}

export function getEscrow(room) {
  if (!db) initStore();
  return db.prepare('SELECT id, room, fingerprint, envelope, created_ts, by FROM escrow_envelopes WHERE room = ? ORDER BY id').all(room);
}

export function listEscrow() {
  if (!db) initStore();
  return db.prepare('SELECT id, room, fingerprint, created_ts, by FROM escrow_envelopes ORDER BY id DESC').all();
}

export function closeStore() {
  if (db) { db.close(); db = null; }
}

// ── DSAR ledger (GDPR Art. 15/12 — one-month / 30-day response deadline) ──────
// A data-subject access request is recorded with a 30-day statutory deadline so
// an operator can evidence timely handling. `due_ts` = created_ts + 30 days.
const DSAR_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export function createDsar({ subjectName, subjectEmail, requestType = 'access', detail = '' }) {
  if (!db) initStore();
  const id = crypto.randomBytes(12).toString('hex');
  const now = Date.now();
  db.prepare(`INSERT INTO dsar_requests
    (id, subject_name, subject_email, request_type, detail, status, created_ts, due_ts, resolved_ts, operator_notes)
    VALUES (?, ?, ?, ?, ?, 'received', ?, ?, NULL, NULL)`)
    .run(id, subjectName || null, subjectEmail || null, requestType, detail, now, now + DSAR_WINDOW_MS);
  return id;
}
export function listDsar() {
  if (!db) initStore();
  const now = Date.now();
  return db.prepare('SELECT * FROM dsar_requests ORDER BY created_ts DESC').all()
    .map((r) => ({ ...r, overdue: r.status !== 'resolved' && r.due_ts < now, dueInDays: Math.ceil((r.due_ts - now) / 86_400_000) }));
}
export function getDsar(id) {
  if (!db) initStore();
  return db.prepare('SELECT * FROM dsar_requests WHERE id = ?').get(id) || null;
}
export function resolveDsar(id, notes = '') {
  if (!db) initStore();
  const r = db.prepare("UPDATE dsar_requests SET status = 'resolved', resolved_ts = ?, operator_notes = ? WHERE id = ?")
    .run(Date.now(), notes, id);
  return r.changes > 0;
}
