// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
// Aegis/aegis-shell/sw.js — offline shell cache (Phase 7: PWA).
// Caches the operator console + design system so the operator UI loads offline.
// Content is keyed by URL; bump CACHE on deploy. File bytes and keys are NEVER
// cached here — this is only the operator-facing shell assets.
const CACHE = 'aegis-shell-v1';
const SHELL = [
  '/aegis-shell/index.html',
  '/aegis-shell/console.html',
  '/aegis-shell/manifest.webmanifest',
  '/aegis-shell/src/design-system.css',
  '/aegis-shell/src/console.js',
  '/aegis-shell/src/i18n.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;            // never cache mutations
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;  // never proxy cross-origin
  if (SHELL.includes(url.pathname)) {
    e.respondWith(caches.open(CACHE).then(async (c) => (await c.match(req)) || fetch(req)));
  }
});
