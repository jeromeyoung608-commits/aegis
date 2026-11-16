// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// aegis-shell/src/adapters.js — the three module "adapters" that the shell uses to
// drive and observe the independent modules. Each adapter is a thin, typed wrapper
// around an iframe + its `postMessage` bridge, exposing the exact control surface the
// product spec asks for and translating module outbound events onto the shell EventBus.
//
//   TopologyAdapter  — read-only; topology emits `topology:node-selected` (node id).
//   REDAKTORAdapter  — exposes addFiles(fileList) + exportToParent(); emits `redaktor:export-ready`.
//   P2PAdapter       — exposes connect(room) + sendFile(file); emits `p2p:file-received`.
//
// The shell never imports a module directly; it only talks through these adapters on
// the `aegis` postMessage channel, and the rest of the app reacts to the bus events.

function postTo(frameEl, msg) {
  frameEl?.contentWindow?.postMessage({ channel: 'aegis', ...msg }, location.origin);
}

export class TopologyAdapter {
  // Topology is a pure data-source: it only emits `topology:node-selected`, which the
  // shell's central bridge forwards onto the bus. Nothing is sent down to it.
  constructor(bus) { this.bus = bus; }
}

export class REDAKTORAdapter {
  constructor(bus, frameEl) {
    this.bus = bus;
    this.frameEl = frameEl;
    this._exportWaiters = new Set();
    // Resolve any pending exportToParent() promises when the module signals completion.
    bus.on('redaktor:export-ready', ({ name, blob }) => {
      this._exportWaiters.forEach((resolve) => resolve({ name, blob }));
      this._exportWaiters.clear();
    });
  }

  // Automatically load a File/Blob into the redaction intake queue.
  loadFile(file, name) {
    postTo(this.frameEl, { type: 'redaktor:load-doc', file, name: name || file.name });
  }
  addFiles(fileList) {
    for (const f of Array.from(fileList || [])) this.loadFile(f);
  }

  // Ask REDAKTOR to build the destructive PDF. Resolves with { name, blob } once the
  // module emits `redaktor:export-ready` (or use the in-module "Send to Aegis Peer" button).
  exportToParent() {
    postTo(this.frameEl, { type: 'redaktor:export' });
    return new Promise((resolve) => this._exportWaiters.add(resolve));
  }
}

export class P2PAdapter {
  constructor(bus, sendFrame, recvFrame) {
    this.bus = bus;
    this.sendFrame = sendFrame;   // Peer A (initiator)
    this.recvFrame = recvFrame;   // Peer B (receiver)
    this.configured = new Set();
  }

  // Configure both in-shell peers for a room and let them auto-connect (local demo).
  connect(room, { pass, mode = 'local' } = {}) {
    this.room = room; this.pass = pass; this.mode = mode;
    const peers = [
      ['f-p2p-send', this.sendFrame, true],
      ['f-p2p-recv', this.recvFrame, false],
    ];
    for (const [frameId, el, isInitiator] of peers) {
      if (this.configured.has(frameId)) continue;
      this.configured.add(frameId);
      postTo(el, { type: 'p2p:configure', frameId, room, pass, mode, isInitiator });
    }
  }

  // Encrypt + stream a file from Peer A over the data channel.
  sendFile(file, name) {
    postTo(this.sendFrame, { type: 'p2p:send-file', name: name || file.name, file });
  }
}
