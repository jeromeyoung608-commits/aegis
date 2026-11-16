// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * ========================================================================
 * sync-canvas — Distributed State & Real-time Collaboration Engine
 *
 * Licensed under the Apache License, Version 2.0 (SPDX: Apache-2.0). You may
 * not use this file except in compliance with the License. A copy ships as
 * LICENSE at the repository root; see http://www.apache.org/licenses/LICENSE-2.0
 * ========================================================================
 */

/**
 * Composition root.
 *
 * The wiring is deliberately boring: one bus, one transport, one engine. Swap
 * `?ws=ws://host` in and the whole room moves from BroadcastChannel to a real
 * socket without touching the renderer, the interaction layer or the OT code.
 */

console.log(
  '%c sync-canvas %c Engine by Jerome Young | Contact: jeromeyoung608@gmail.com ',
  'background: #3fb950; color: #000; font-weight: bold; padding: 4px 8px; border-radius: 4px 0 0 4px;',
  'background: #1a2028; color: #b3bcc8; padding: 4px 8px; border-radius: 0 4px 4px 0;',
);

import { EventBus } from './utils/EventBus.js';
import { makeSite, makeRoom } from './utils/id.js';
import { SocketProvider } from './engine/SocketProvider.js';
import { SyncEngine } from './engine/SyncEngine.js';
import { Viewport } from './canvas/viewport.js';
/** Seed notes are sample content the operator reads on the canvas. They use the
 *  bridge the shared i18n runtime publishes when the module is opened inside
 *  the suite; a standalone copy has no bridge and keeps its English literals.
 *  No import: the module stays zero-dependency. */
const localize = (text) => globalThis.AEGIS_MODULE_I18N?.translate(text) ?? text;
import { CanvasRenderer } from './canvas/CanvasRenderer.js';
import { Interaction } from './canvas/Interaction.js';
import { Presence } from './ui/Presence.js';
import { TextEditor } from './ui/TextEditor.js';
import { Toolbar } from './ui/Toolbar.js';
import { Inspector } from './ui/Inspector.js';
import * as BoardOT from './engine/BoardOT.js';
import { HashChain, sha256Hex } from './audit/HashChain.js';

function readRoom() {
  const raw = (location.hash || '').replace(/^#/, '').trim().toUpperCase();
  return raw || makeRoom();
}

async function boot() {
  const room = readRoom();
  history.replaceState(null, '', `#${room}`);

  const bus = new EventBus();
  const canvas = document.getElementById('board');
  const layer = document.getElementById('editor-layer');
  const site = makeSite();

  // Per-client signing context for signature stamps. The fingerprint is derived
  // from the site + room (stable for a given tab identity) and the chain records
  // every affixed stamp as Hash(prev + op) for later audit.
  let keyId = 'demo-key';
  try {
    keyId = (await sha256Hex(`${site}:${room}`)).slice(0, 16);
  } catch {
    // crypto.subtle unavailable outside a secure context; use a demo fingerprint
  }
  const stampChain = new HashChain();

  const ws = new URLSearchParams(location.search).get('ws');
  const provider = new SocketProvider({ room, bus, url: ws || null });
  provider.open();

  const engine = new SyncEngine({
    site,
    provider,
    bus,
    now: () => Date.now(),
  });

  const viewport = new Viewport();
  const presence = new Presence({ site, provider, bus });
  const renderer = new CanvasRenderer({
    canvas,
    viewport,
    engine,
    colorFor: (s) => presence.colorFor(s),
    getCursors: () => presence.cursors(),
  });

  new TextEditor({ layer, engine, viewport, renderer, bus });
  const interaction = new Interaction({
    canvas,
    viewport,
    engine,
    renderer,
    bus,
    presence,
    stampService: { chain: stampChain, keyId },
  });
  const toolbar = new Toolbar({
    bus,
    engine,
    viewport,
    renderer,
    canvas,
    presence,
    room,
    transport: provider.transport,
  });
  const inspector = new Inspector({ bus, engine, presence });

  // Surface the local audit chain in the inspector whenever a stamp is affixed.
  bus.on('audit', () => inspector.renderAudit(stampChain));
  inspector.renderAudit(stampChain);

  // ── message routing ──────────────────────────────────────────
  // Presence and the replication layer share one pipe, exactly like they would
  // share a socket. Only the `k` discriminator decides who gets what.
  bus.on('wire', (msg) => {
    if (!msg || typeof msg !== 'object' || typeof msg.k !== 'string') return;
    if (msg.k === 'presence') presence.receive(msg);
    else engine.receive(msg);
  });

  bus.on('peers', ({ sites }) => engine.setPeers(sites));
  bus.on('editing', (id) => presence.setEditing(id));
  bus.on('tool', (t) => {
    canvas.dataset.tool = t;
  });

  // A room of one still needs an election before it may sequence anything.
  engine.setPeers(presence.sites());

  // ── frame loop ───────────────────────────────────────────────
  const frame = () => {
    requestAnimationFrame(frame);
    presence.tick();
    renderer.draw();
  };
  frame();

  window.addEventListener('resize', () => viewport.touch());
  window.addEventListener('pagehide', () => {
    presence.leave();
    provider.close();
  });

  // ── seed ─────────────────────────────────────────────────────
  // Only the sequencer seeds, and only into a room that is still empty. A
  // second tab joining a live room never duplicates the starter board.
  setTimeout(() => {
    if (engine.role !== 'hub' || engine.rev !== 0 || engine.doc.nodes.length !== 0) return;
    seed(engine, viewport, toolbar, canvas);
  }, 900);

  window.__sync = { engine, provider, viewport, presence, interaction, room, site, audit: { chain: stampChain, keyId } };
}

function seed(engine, viewport, toolbar, canvas) {
  const site = engine.site;
  const notes = [
    [96, 132, 'butter', localize('This drawing has been desensitized. Each engineer signs with a stamp.')],
    [360, 92, 'mint', localize('Pick the stamp tool (S) and click to drop your signature — it locks instantly.')],
    [648, 196, 'sky', localize('A locked stamp cannot be moved or deleted by the other engineer.')],
    [246, 372, 'blush', localize('Open a second tab. That stamp replicates over BroadcastChannel in real time.')],
  ];

  const ids = notes.map((_, i) => `${site}-s${i}`);
  let i = 0;
  for (const [x, y, color, text] of notes) {
    engine.local(
      BoardOT.ops.ins(i, {
        id: ids[i],
        kind: 'note',
        x,
        y,
        w: BoardOT.NOTE_W,
        h: BoardOT.NOTE_H,
        color,
        text,
        by: site,
      }),
    );
    i += 1;
  }

  engine.local(
    BoardOT.ops.ins(4, { id: `${site}-l0`, kind: 'link', from: ids[0], to: ids[1], by: site }),
  );
  engine.local(
    BoardOT.ops.ins(5, { id: `${site}-l1`, kind: 'link', from: ids[1], to: ids[2], by: site }),
  );
  engine.local(
    BoardOT.ops.ins(6, { id: `${site}-l2`, kind: 'link', from: ids[1], to: ids[3], by: site }),
  );

  viewport.fit(
    { x: 96, y: 92, w: 648 + BoardOT.NOTE_W - 96, h: 372 + BoardOT.NOTE_H - 92 },
    canvas.clientWidth,
    canvas.clientHeight,
  );
  toolbar.updateZoom();
}

boot();
