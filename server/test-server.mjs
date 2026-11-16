// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * server/test-server.mjs — shared helper for the integration tests that boot
 * the real server.js.
 *
 * Three test files spawn the server: aegis-shell/tests/server-integration.test.mjs
 * (8137), modules/scim/tests/scim.test.mjs (8138, 8150-8152) and
 * modules/oidc/tests/oidc.test.mjs (8141-8142). They used to each carry their
 * own copy of the same fragile pattern:
 *
 *   - resolve as soon as ANY HTTP response came back from /healthz, so a
 *     stray process squatting on the port was mistaken for "the server is up"
 *     and the suite then asserted against a stranger;
 *   - give up after 6-9 seconds, which a busy CI box legitimately exceeds
 *     (server.js boot plus first-run DB/asset initialisation);
 *   - spawn with stdio:'ignore', so when the server did die — EADDRINUSE is a
 *     FATAL exit in server.js — nobody could see why.
 *
 * This helper fails loudly instead: it refuses to start on an occupied port,
 * requires a real 200 from /healthz, surfaces the child's stderr if it exits,
 * and waits long enough for a loaded machine.
 */
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import http from 'node:http';
import net from 'node:net';

const DEFAULT_READY_TIMEOUT_MS = 30_000;
const POLL_MS = 150;

/** True when something is already listening on 127.0.0.1:<port>. */
export function portInUse(port) {
  return new Promise((resolve) => {
    const probe = net.connect({ host: '127.0.0.1', port: Number(port) });
    probe.on('connect', () => { probe.destroy(); resolve(true); });
    probe.on('error', () => resolve(false));
  });
}

/**
 * Boot server.js and resolve once it answers /healthz with 200.
 *
 * @param {object}   o
 * @param {string}   o.cwd            repository root (the dir holding server.js)
 * @param {string|number} o.port      TCP port to bind
 * @param {object}   [o.env]         extra environment for the child
 * @param {string}   [o.dbFile]       AEGIS_DB path; removed before boot
 * @param {number}   [o.readyTimeoutMs]
 * @returns {Promise<{proc: object, port: number, stop: () => void}>}
 */
export async function startServer({
  cwd,
  port,
  env = {},
  dbFile,
  readyTimeoutMs = DEFAULT_READY_TIMEOUT_MS,
}) {
  if (await portInUse(port)) {
    throw new Error(
      `port ${port} is already in use — another process is squatting on it. ` +
      `Find it with: lsof -nP -iTCP:${port} -sTCP:LISTEN  (then kill it) ` +
      `or run this suite on a free port.`
    );
  }
  if (dbFile) { try { rmSync(dbFile); } catch { /* first boot: fine */ } }

  let stderr = '';
  const proc = spawn(process.execPath, ['server.js'], {
    cwd,
    env: {
      ...process.env,
      AEGIS_DB: dbFile || process.env.AEGIS_DB,
      AEGIS_ISSUER_SECRET: 'test-secret',
      ...env,
      PORT: String(port),
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  proc.stderr.on('data', (d) => { stderr += d.toString(); });

  await new Promise((resolve, reject) => {
    const t0 = Date.now();
    const tick = () => {
      if (proc.exitCode !== null) {
        reject(new Error(
          `server.js exited with code ${proc.exitCode} before becoming ready` +
          `${stderr.trim() ? `:\n${stderr.trim()}` : ' (no stderr captured)'}`
        ));
        return;
      }
      const req = http.get(`http://127.0.0.1:${port}/healthz`, (res) => {
        res.resume();
        if (res.statusCode === 200) { resolve(); return; }
        // Something answered, but it is not our server. Keep polling briefly,
        // then fail loudly instead of quietly testing a stranger.
        if (Date.now() - t0 > readyTimeoutMs) {
          reject(new Error(`port ${port} answered /healthz with ${res.statusCode} — it is not the Aegis server`));
        } else setTimeout(tick, POLL_MS);
      });
      req.on('error', () => {
        if (Date.now() - t0 > readyTimeoutMs) {
          reject(new Error(
            `server start timeout on port ${port} (waited ${readyTimeoutMs}ms)` +
            `${stderr.trim() ? `:\n${stderr.trim()}` : ''}`
          ));
        } else setTimeout(tick, POLL_MS);
      });
    };
    tick();
  });

  return {
    proc,
    port: Number(port),
    stop: () => { try { proc.kill('SIGKILL'); } catch { /* already gone */ } },
  };
}
