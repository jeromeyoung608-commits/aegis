// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
/**
 * Network guard.
 *
 * Every cross-origin request attempt is rejected before it leaves the tab and
 * is recorded in an audit counter. The page additionally carries a Content
 * Security Policy that forbids foreign origins, so the guarantee holds even if
 * some code path bypasses these wrappers.
 *
 * Allowed: same-origin files of this folder, blob:, data:, file:.
 */

const audit = { external: 0, blocked: 0 };
const listeners = new Set();

function notify() {
  for (const fn of listeners) {
    try {
      fn(audit);
    } catch (err) {
      console.error('[offline-guard]', err);
    }
  }
}

function originOf(rawUrl) {
  try {
    const base = typeof window !== 'undefined' ? window.location.href : 'http://localhost/';
    return new URL(rawUrl, base);
  } catch {
    return null;
  }
}

function isLocal(rawUrl) {
  if (!rawUrl) return true;
  const url = originOf(rawUrl);
  if (!url) return false;
  return (
    url.origin === window.location.origin ||
    url.protocol === 'blob:' ||
    url.protocol === 'data:' ||
    url.protocol === 'file:'
  );
}

function block(rawUrl) {
  audit.external += 1;
  audit.blocked += 1;
  notify();
  console.warn('[offline-guard] blocked cross-origin request:', rawUrl);
}

/* ── fetch ─────────────────────────────────────────────────── */

if (typeof window.fetch === 'function') {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = function guardedFetch(input, init) {
    const rawUrl = typeof input === 'string' ? input : input && input.url;
    if (!isLocal(rawUrl)) {
      block(rawUrl);
      return Promise.reject(new Error('Blocked by REDAKTOR offline guard'));
    }
    return nativeFetch(input, init);
  };
}

/* ── XMLHttpRequest ─────────────────────────────────────────── */

if (window.XMLHttpRequest) {
  const nativeOpen = window.XMLHttpRequest.prototype.open;
  const nativeSend = window.XMLHttpRequest.prototype.send;

  window.XMLHttpRequest.prototype.open = function guardedOpen(method, url, ...rest) {
    this.__redaktorUrl = url;
    return nativeOpen.call(this, method, url, ...rest);
  };

  window.XMLHttpRequest.prototype.send = function guardedSend(body) {
    if (!isLocal(this.__redaktorUrl)) {
      block(this.__redaktorUrl);
      this.abort();
      return;
    }
    return nativeSend.call(this, body);
  };
}

/* ── WebSocket / EventSource ────────────────────────────────── */

if (window.WebSocket) {
  const NativeWebSocket = window.WebSocket;
  const GuardedWebSocket = function (url, protocols) {
    if (!isLocal(url)) {
      block(url);
      throw new DOMException('Blocked by REDAKTOR offline guard', 'SecurityError');
    }
    return protocols === undefined
      ? new NativeWebSocket(url)
      : new NativeWebSocket(url, protocols);
  };
  GuardedWebSocket.prototype = NativeWebSocket.prototype;
  Object.assign(GuardedWebSocket, {
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3
  });
  window.WebSocket = GuardedWebSocket;
}

if (window.EventSource) {
  const NativeEventSource = window.EventSource;
  const GuardedEventSource = function (url, config) {
    if (!isLocal(url)) {
      block(url);
      throw new DOMException('Blocked by REDAKTOR offline guard', 'SecurityError');
    }
    return new NativeEventSource(url, config);
  };
  GuardedEventSource.prototype = NativeEventSource.prototype;
  window.EventSource = GuardedEventSource;
}

/* ── sendBeacon ─────────────────────────────────────────────── */

if (navigator.sendBeacon) {
  const nativeBeacon = navigator.sendBeacon.bind(navigator);
  navigator.sendBeacon = function guardedBeacon(url, data) {
    if (!isLocal(url)) {
      block(url);
      return false;
    }
    return nativeBeacon(url, data);
  };
}

/* ── Public API ─────────────────────────────────────────────── */

export { audit };

export function onAudit(handler) {
  listeners.add(handler);
  handler(audit);
  return () => listeners.delete(handler);
}

/**
 * Deliberately tries to reach the outside world. With the guard and CSP in
 * place this always fails — which is exactly what the UI reports.
 */
export async function probeExternalConnection() {
  try {
    await fetch('https://example.com/redaktor-probe', { mode: 'no-cors', cache: 'no-store' });
    return { blocked: false, audit: { ...audit } };
  } catch {
    return { blocked: true, audit: { ...audit } };
  }
}

window.__REDAKTOR_AUDIT__ = audit;
