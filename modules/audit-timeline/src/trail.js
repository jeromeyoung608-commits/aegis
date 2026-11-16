// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * ========================================================================
 * Aegis — Tamper-Evident Hash-Chained Audit Trail
 *
 * Licensed under the Apache License, Version 2.0 (SPDX: Apache-2.0). You may
 * not use this file except in compliance with the License. A copy ships as
 * LICENSE at the repository root; see http://www.apache.org/licenses/LICENSE-2.0
 * ========================================================================
 */

// Append-only audit trail built on the sync-canvas HashChain.
//
// Each link stores a human-readable event plus the timestamp, actor and optional
// key fingerprint. The link hash is:
//
//     hash[i] = SHA-256( hash[i-1] + "|" + canonical(payload) )
//
// Editing, deleting or reordering any link invalidates every later hash, which is
// what makes the trail tamper-evident. The trail can be backed by localStorage so
// the timeline survives a reload; pass no storage for an in-memory session log.

import { HashChain, GENESIS } from './hash-chain.js';

// Storage accessors that never throw (quota / private mode / disabled storage).
function safeGet(storage, key) { try { return storage.getItem(key); } catch { return null; } }
function safeSet(storage, key, val) { try { storage.setItem(key, val); } catch { /* quota */ } }
function safeRemove(storage, key) { try { storage.removeItem(key); } catch { /* ignore */ } }
function safeParse(raw) { try { return JSON.parse(raw); } catch { return null; } }

export const TRAIL_SCHEMA = 'aegis.audit.v1';
export const TRAIL_KEY = 'aegis.audit.trail.v1';

/** Local wall-clock time as HH:MM:SS. */
export function formatClock(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--:--:--';
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
}

/** Short, uppercase display form of a hex digest. */
export function shortHash(hash, width = 8) {
  if (typeof hash !== 'string' || hash.length === 0) return '';
  return hash.slice(0, width).toUpperCase();
}

export class AuditTrail {
  /**
   * @param {object} [options]
   * @param {{getItem:Function,setItem:Function,removeItem:Function}|null} [options.storage]
   * @param {() => Date} [options.now]
   * @param {string} [options.key]
   */
  constructor({ storage = null, now = () => new Date(), key = TRAIL_KEY } = {}) {
    this.storage = storage;
    this.now = now;
    this.key = key;
    this.chain = new HashChain();
    this.brokenAt = null;
    this.loadError = null;
    this.listeners = new Set();
    this.writeQueue = Promise.resolve();
    // Optional RFC 3161 anchor (injected — keeps this module transport-agnostic).
    this.anchorProvider = null;
    // Last anchored timestamp token, persisted alongside the chain.
    this.tsaAnchor = null;
    // Identity for the cross-tab write lease (see _withLock).
    this.tabId = (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Math.random());
  }

  get entries() {
    return this.chain.entries;
  }

  get head() {
    return this.chain.head;
  }

  /** Register a change listener. Returns an unsubscribe function. */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit() {
    for (const listener of this.listeners) {
      try {
        listener(this);
      } catch (error) {
        // A broken view must never break the chain.
        console.error('[aegis:audit] listener failed:', error);
      }
    }
  }

  // ── Cross-tab concurrency guard ──────────────────────────────────────────
  // The chain is persisted under ONE localStorage key. Two tabs writing at the
  // same time would each save their own in-memory head and clobber the other
  // (last-writer-wins) — the classic audit-corruption bug. A short-lived lease
  // on `<key>.lock` serializes writers across tabs; a stale lease (crashed tab)
  // expires so it can never dead-lock. Inside the lock we re-read the freshest
  // chain, so the appended link always sits on the true current head.
  async _withLock(task) {
    if (!this.storage) return task();
    const lockKey = this.key + '.lock';
    const ttl = 1500;
    const deadline = Date.now() + 2000;
    while (Date.now() < deadline) {
      const raw = safeGet(this.storage, lockKey);
      const cur = raw ? safeParse(raw) : null;
      if (!cur || cur.expires < Date.now() || cur.tab === this.tabId) {
        safeSet(this.storage, lockKey, JSON.stringify({ tab: this.tabId, expires: Date.now() + ttl }));
        try { return await task(); }
        finally { safeRemove(this.storage, lockKey); }
      }
      await new Promise((r) => setTimeout(r, 40));
    }
    throw new Error('audit: could not acquire write lock within 2s (another tab is writing)');
  }

  /** Re-read the freshest persisted chain (and anchor) into memory. */
  _reloadFromStorage() {
    if (!this.storage) return;
    const raw = safeGet(this.storage, this.key);
    if (!raw) { this.chain = new HashChain(); this.tsaAnchor = null; return; }
    try {
      const data = JSON.parse(raw);
      const entries = Array.isArray(data?.entries) ? data.entries : [];
      this.chain = new HashChain();
      this.chain.entries = entries;
      this.chain.index = entries.length;
      this.chain.head = entries.length ? entries[entries.length - 1].hash : GENESIS;
      this.tsaAnchor = data?.tsaAnchor || null;
    } catch {
      // Leave the in-memory chain as-is; load()/verify() already flag corruption.
    }
  }

  /** Restore persisted links and verify the chain before the UI paints it. */
  async load() {
    if (!this.storage) return this;

    let raw = null;
    try {
      raw = this.storage.getItem(this.key);
    } catch (error) {
      this.loadError = 'Audit storage is unavailable: ' + error.message;
      this.emit();
      return this;
    }
    if (!raw) return this;

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      this.loadError = 'Stored audit log is not valid JSON.';
      this.brokenAt = 0;
      this.emit();
      return this;
    }

    if (data && data.schema && data.schema !== TRAIL_SCHEMA) {
      this.loadError = `Unsupported audit schema: ${data.schema}`;
      this.brokenAt = 0;
      this.emit();
      return this;
    }

    const entries = Array.isArray(data?.entries) ? data.entries : [];
    this.chain.entries = entries;
    this.chain.index = entries.length;
    this.chain.head = entries.length > 0 ? entries[entries.length - 1].hash : GENESIS;
    this.brokenAt = await this.chain.verify();
    this.emit();
    return this;
  }

  /**
   * Append one audit event. Calls are serialized: two UI events that fire in the
   * same tick can never read the same head hash and fork the chain.
   * @param {{actor:string,event:string,detail?:string,fingerprint?:string|null,at?:string}} input
   */
  append(input) {
    const task = this.writeQueue.then(() => this._append(input));
    this.writeQueue = task.then(() => undefined, () => undefined);
    return task;
  }

  async _append({ actor, event, detail = '', fingerprint = null, at = null }) {
    if (!actor) throw new Error('Audit actor is required.');
    if (!event) throw new Error('Audit event is required.');

    const payload = {
      at: at || this.now().toISOString(),
      actor,
      event,
      detail: detail || '',
      fingerprint: fingerprint || null,
    };

    if (!this.storage) {
      const entry = await this.chain.append(payload);
      this.emit();
      return entry;
    }
    // Acquire the cross-tab lease, re-read the freshest chain, then append and
    // persist — so concurrent tabs / instances can never fork or clobber it.
    return this._withLock(async () => {
      this._reloadFromStorage();
      const entry = await this.chain.append(payload);
      this.save();
      this.emit();
      return entry;
    });
  }

  save() {
    if (!this.storage) return;
    try {
      this.storage.setItem(this.key, JSON.stringify({
        schema: TRAIL_SCHEMA,
        entries: this.chain.entries,
      }));
    } catch (error) {
      this.loadError = 'Audit log could not be persisted: ' + error.message;
    }
  }

  /** Recompute every link. Returns the first broken index, or null. */
  async verify() {
    this.brokenAt = await this.chain.verify();
    this.emit();
    return this.brokenAt;
  }

  /** Drop every link and remove the persisted copy. */
  reset() {
    this.chain = new HashChain();
    this.brokenAt = null;
    this.loadError = null;
    try {
      this.storage?.removeItem(this.key);
    } catch {
      // Nothing else to do: the in-memory chain is already empty.
    }
    this.emit();
  }

  /** Exportable, content-free snapshot for a compliance case file. */
  snapshot() {
    return {
      schema: TRAIL_SCHEMA,
      algorithm: 'SHA-256',
      genesis: GENESIS,
      head: this.chain.head,
      links: this.chain.entries.length,
      intact: this.brokenAt === null,
      brokenAt: this.brokenAt,
      tsaAnchor: this.tsaAnchor || null,
      entries: this.chain.entries.map((entry) => ({
        index: entry.index,
        prev: entry.prev,
        hash: entry.hash,
        payload: { ...entry.payload },
      })),
    };
  }

  // ── Trusted-timestamp anchor (RFC 3161, optional) ──────────────────────────
  // The chain is tamper-evident locally, but a local-only log can still be
  // disputed ("you edited / back-dated it on this machine"). Anchoring the chain
  // HEAD to a trusted timestamp from an external TSA makes the trail defensible:
  // the timestamp is an independent, time-attested witness. The provider is
  // injected so this module stays transport-agnostic and unit-testable; a
  // production deploy should route the RFC 3161 DER exchange through a backend
  // (browsers cannot easily build/parse raw ASN.1/CMS).
  setAnchorProvider(fn) { this.anchorProvider = fn; }

  async anchorChainToTSA() {
    if (!this.anchorProvider) {
      throw new Error('No TSA anchor provider configured — call setAnchorProvider() (e.g. createTsaAnchorProvider(url)).');
    }
    const head = this.chain.head;
    const anchor = await this.anchorProvider(head);
    this.tsaAnchor = {
      head,
      token: anchor.token,
      tsa: anchor.tsa || 'unknown',
      at: anchor.at || new Date().toISOString(),
    };
    this.save();
    this.emit();
    return this.tsaAnchor;
  }
}

/**
 * Minimal RFC 3161 anchor client. It POSTs the chain head digest to a TSA
 * gateway and expects `{ token, tsa, at }` back. A real deployment should put a
 * backend proxy in front that performs the RFC 3161 DER TimeStampReq/Resp
 * wrapping (and CMS parsing) — browsers cannot do raw ASN.1/CMS cleanly. This
 * keeps the shell transport-agnostic while making the anchor point real.
 * @param {string} tsaUrl Gateway that accepts POST { digest } and returns a token.
 */
export function createTsaAnchorProvider(tsaUrl) {
  if (!tsaUrl) throw new Error('createTsaAnchorProvider requires a TSA gateway URL.');
  return async (head) => {
    const res = await fetch(tsaUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ digest: head }),
    });
    if (!res.ok) throw new Error(`TSA gateway returned ${res.status}`);
    const data = await res.json();
    return { token: data.token, tsa: data.tsa || tsaUrl, at: data.at };
  };
}
