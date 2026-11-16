// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// server.js — minimal, ZERO-dependency static server for the topology renderer.
//
// The only job beyond serving files is sending the two COOP/COEP headers that put
// the page into "cross-origin isolation". That is what unlocks SharedArrayBuffer
// (the zero-copy bridge between the physics Worker and the GPU main thread). Without
// these headers `typeof SharedArrayBuffer === 'undefined'` and the app refuses to
// start (with a clear message). Opening index.html via file:// will NOT work.
//
// Zero dependencies: node: built-ins only.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wgsl': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  // Cross-origin isolation => SharedArrayBuffer available.
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

  let p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (p === '/') p = '/index.html';
  const filePath = path.join(ROOT, p);
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`WebGPU topology server on http://localhost:${PORT}`);
  console.log('Open it in Chrome/Edge 113+ and allow it a moment to generate the graph.');
  console.log('Tip: COOP/COEP headers are set, so SharedArrayBuffer is enabled.');
});
