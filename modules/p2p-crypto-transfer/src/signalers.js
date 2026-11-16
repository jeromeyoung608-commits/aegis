// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// src/signalers.js — pluggable signaling transports for WebRTC SDP exchange.
//
// A "signaler" is a tiny object with the same shape used by p2p.js:
//   connect(room, myId) -> Promise<void>
//   send(msg)           -> Promise<void>   (relay an SDP/control message to the peer)
//   onMessage(cb)       -> void            (register a handler for peer messages)
//   close()             -> void
//
// Two implementations, both zero-dependency and zero-network-data-leak:
//   • HttpSignaler     — relays via the project's minimal Node signaling server.
//                         The server only ever sees SDP/ICE (no file bytes, no key).
//   • BroadcastSignaler— uses the browser-native BroadcastChannel API. No server
//                         at all; works across tabs on the SAME machine/origin. This
//                         is the "local demo" mode that needs nothing but the browser.

/**
 * Minimal HTTP long-poll signaler.
 * The relay protocol is intentionally dumb: each peer has a unique id, and the
 * server forwards any message from a DIFFERENT peer in the same room. No message
 * content is inspected.
 */
export class HttpSignaler {
  /** @param {string} base empty string => same-origin (recommended). */
  constructor(base = '') {
    this.base = base.replace(/\/$/, '');
    this._handlers = [];
    this._room = null;
    this._myId = null;
    // Room admission token (ECDSA, room-bound). Fetched from /session so the
    // token-gated signaling relay (server.js) admits this peer. The BroadcastChannel
    // "local demo" path never uses this — it has no server at all.
    this._token = null;
  }

  async connect(room, myId) {
    this._room = room;
    this._myId = myId;
    // Mint a room token before any /signal call. If the relay is closed
    // (token-gated) this is REQUIRED; if it is open this is a harmless no-op.
    try {
      // /session is fail-closed: it only mints when the caller proves it is the room
      // host. The secret rides in sessionStorage, seeded once from the invite link's
      // #issuer= fragment (see aegis-shell/src/app.js) — never in a URL query that
      // would end up in access logs.
      let issuer = '';
      try { issuer = sessionStorage.getItem('aegis.issuer') || ''; } catch { /* private mode */ }
      const r = await fetch(`${this.base}/session?room=${encodeURIComponent(room)}`, {
        headers: issuer ? { Authorization: 'Bearer ' + issuer } : {},
      });
      if (r.ok) {
        const data = await r.json();
        this._token = data.token || null;
      } else {
        // 503/401/403 => issuance disabled or we are not the host; proceed without a
        // token and let /signal surface a 401 with a precise reason.
        this._token = null;
      }
    } catch {
      // Network/parse failure: keep the connection attempt alive; /signal will
      // surface a 401 if the relay actually requires a token.
      this._token = null;
    }
  }

  /** Build the signaling URL with the room token attached (when we have one). */
  _url() {
    const q = `room=${encodeURIComponent(this._room)}&from=${encodeURIComponent(this._myId)}`;
    return this._token ? `${this.base}/signal?${q}&token=${encodeURIComponent(this._token)}` : `${this.base}/signal?${q}`;
  }

  async send(msg) {
    await fetch(this._url(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg),
    });
  }

  onMessage(cb) {
    this._handlers.push(cb);
    if (!this._polling) this._poll();
  }

  // Long-poll loop: keep one GET in flight so we receive the peer's SDP ASAP.
  _poll() {
    this._polling = true;
    this._abort = new AbortController();
    const url = this._url();
    fetch(url, { signal: this._abort.signal })
      .then((r) => (r.status === 204 ? null : r.json()))
      .then((data) => {
        if (data && data.msg) this._handlers.forEach((h) => h(data.msg));
      })
      .catch(() => {})
      .finally(() => {
        // Restart only while still polling; close() flips _polling to false so the
        // loop actually terminates instead of keeping the event loop (and the test
        // runner) alive forever.
        if (this._polling) setTimeout(() => this._poll(), 300);
      });
  }

  close() {
    this._polling = false;
    this._handlers = [];
    // Abort the GET that is parked on the server for up to 20s; without this the
    // pending socket outlives close() and `node --test` never exits.
    try { this._abort?.abort(); } catch {}
    this._abort = null;
  }
}

/**
 * Server-less signaler for the same-machine demo. Uses BroadcastChannel, which
 * is a browser-native, origin-scoped, in-browser message bus. Two tabs on the
 * same origin exchange SDP directly — no socket, no server, no network egress.
 */
export class BroadcastSignaler {
  constructor() {
    this._bc = new BroadcastChannel('aether-p2p-xfer');
    this._handlers = [];
  }

  async connect(room, myId) {
    this._room = room;
    this._myId = myId;
    this._bc.onmessage = (e) => {
      const { room: r, from, msg } = e.data || {};
      if (r === this._room && from !== this._myId) {
        this._handlers.forEach((h) => h(msg));
      }
    };
  }

  send(msg) {
    this._bc.postMessage({ room: this._room, from: this._myId, msg });
  }

  onMessage(cb) {
    this._handlers.push(cb);
  }

  close() {
    this._bc.close();
    this._handlers = [];
  }
}
