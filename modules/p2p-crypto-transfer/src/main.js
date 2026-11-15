// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
// src/main.js — UI wiring. Connects the DOM to p2p.js + transfer.js.
// Keeps no business logic; purely orchestration + presentation.

import { createSession } from './p2p.js';
import { createTransfer } from './transfer.js';

const $ = (id) => document.getElementById(id);

let transfer = null;   // bound once the DataChannel is ready
let dcOpen = false;    // true only after the DataChannel fires onopen
let started = false;

function log(msg, kind = '') {
  const el = $('log');
  const p = document.createElement('p');
  if (kind) p.className = kind;
  p.textContent = `• ${msg}`;
  el.appendChild(p);
  el.scrollTop = el.scrollHeight;
}

function fmt(bytes) {
  if (!bytes) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`;
}

function setBar(id, ratio) {
  $(id).style.width = `${Math.max(0, Math.min(100, ratio * 100)).toFixed(1)}%`;
}

function setStatus(text, cls = '') {
  $('status').textContent = text;
  $('statusDot').className = 'dot' + (cls ? ' ' + cls : '');
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.className = 'dl';
  a.textContent = `⬇ Download ${name} (${fmt(blob.size)})`;
  $('dl').appendChild(a);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

let pendingFile = null;
let preparedWritable = null; // a FileSystemWritableFileStream the user locked via a gesture

// Programmatic entry point for the Aegis shell: connect with explicit options and,
// optionally, queue a file to send as soon as the data channel opens.
async function start(opts = {}) {
  const mode = opts.mode ?? $('mode').value;
  const room = (opts.room ?? $('room').value).trim();
  const pass = opts.pass ?? $('pass').value;
  const isInitiator = opts.isInitiator ?? true;

  if (started) {
    if (opts.file) sendFile(opts.file);
    return;
  }
  if (!room || !pass) { log('Please enter both room and shared key', 'e'); return; }

  started = true;
  $('mode').value = mode;
  $('room').value = room;
  $('pass').value = pass;
  $('btnCreate').disabled = true;
  $('btnJoin').disabled = true;
  $('btnCreate').setAttribute('aria-busy', 'true');
  $('btnJoin').setAttribute('aria-busy', 'true');
  const modeLabel = mode === 'local' ? 'local demo' : 'LAN';
  const roleLabel = isInitiator ? 'initiator' : 'receiver';
  log(`Connecting to signaling (${modeLabel} / ${roleLabel})…`);

  try {
    await createSession({
      mode, room, isInitiator,
      onStatus: (s) => {
        const map = {
          connected: ['Connected', 'ok'],
          connecting: ['Connecting…', 'warn'],
          disconnected: ['Disconnected', 'err'],
          failed: ['Connection failed', 'err'],
        };
        const [t, c] = map[s] || [s, ''];
        setStatus(t, c);
        // Report every WebRTC state change upstream so the shell's peer rows
        // reflect the real connection instead of a stale "connecting…".
        notifyParent('p2p:status', { state: s });
        if (s === 'connected') { $('btnCreate').setAttribute('aria-busy', 'false'); $('btnJoin').setAttribute('aria-busy', 'false'); log('WebRTC data channel established', 's'); }
        if (s === 'failed') log('Connection failed: check room/network/HTTPS', 'e');
      },
      onChannel: (dc) => {
        dcOpen = false;
        dc.onopen = () => {
          dcOpen = true;
          $('fileInput').disabled = false;
          $('btnSend').disabled = false;
          log('Data channel open — you can now send files', 's');
          if (pendingFile) { transfer.sendFile(pendingFile); pendingFile = null; }
        };
        dc.onclose = () => log('Data channel closed', 'e');
        transfer = createTransfer(dc, pass, {
          onMeta: (m) => log(`Peer started sending: ${m.name} (${fmt(m.size)})`),
          onRecvProgress: (r, e) => setBar('recvBar', r / e),
          onError: (err) => {
            log(`Receive failed: ${err.message}`, 'e');
            notifyParent('p2p:error', { message: err.message });
          },
          onComplete: (sink, m) => {
            const embedded = window.parent !== window;
            if (sink.kind === 'fs') {
              log(`Receive complete: ${m.name} streamed straight to your chosen disk location.`, 's');
            } else {
              log(`Receive complete: ${m.name} (in-memory; small file).`, 's');
              // Standalone page only: the embedded shell owns the Download
              // button, a second automatic download would just be noise.
              if (!embedded) download(sink.blob, m.name);
            }
            // The shell decides what to do with an incoming file (redact again or download).
            notifyParent('p2p:file-received', { name: m.name, size: m.size, blob: sink.kind === 'mem' ? sink.blob : null });
          },
          onSendProgress: (s, t) => setBar('sendBar', s / t),
          onSendState: (st) => {
            if (st === 'paused') log('Receiver is slow — backpressure engaged (paused reading)…', '');
            if (st === 'done') { log('Send complete', 's'); setBar('sendBar', 1); notifyParent('p2p:file-sent', {}); }
          },
        }, {
          getPreparedWritable: () => preparedWritable,
          // Never pop the save picker when running inside the Aegis shell: the
          // shell's decision buttons need the in-memory blob. Standalone page
          // (window.parent === window) keeps the disk-streaming behaviour.
          preferMemory: window.parent !== window,
        });
      },
    });
    log('Joined room — waiting for peer… (have the other side join the same room)');
  } catch (err) {
    log('Init failed: ' + err.message, 'e');
    started = false;
    $('btnCreate').setAttribute('aria-busy', 'false');
    $('btnJoin').setAttribute('aria-busy', 'false');
  }
}

function sendFile(file) {
  // The shell may call send() the instant signing finishes — before the
  // DataChannel has finished opening. Defer to the open-event flush instead of
  // throwing "RTCDataChannel.readyState is not 'open'".
  if (transfer && dcOpen) transfer.sendFile(file);
  else pendingFile = file;
}

function notifyParent(type, payload) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ channel: 'aegis', type, ...payload }, location.origin);
  }
}

// Expose a tiny control surface so the Aegis shell can drive this module.
window.__AEGIS = {
  connect: (o = {}) => start(o),
  send: (file) => sendFile(file),
  isStarted: () => started,
};

$('btnCreate').onclick = () => start({ isInitiator: true });
// NOTE: start(false) here would pass `false` as the opts object, and
// `opts.isInitiator ?? true` would silently evaluate to TRUE — i.e. "Join"
// would boot as an initiator and both peers would wait on each other forever.
$('btnJoin').onclick = () => start({ isInitiator: false });
$('fileInput').onchange = () => { $('btnSend').disabled = !$('fileInput').files.length; };
$('btnSend').onclick = () => {
  const f = $('fileInput').files[0];
  if (f && transfer) transfer.sendFile(f);
};

// "Choose save location": a real user gesture that locks a FileSystemWritableFileStream
// BEFORE the peer sends. This sidesteps the transient-activation requirement at receive
// time and lets arbitrarily large files stream straight to disk (see transfer.js).
$('saveLocBtn').onclick = async () => {
  if (!('showSaveFilePicker' in window)) {
    log('This browser has no disk-streaming API; large files will be rejected.', 'e');
    return;
  }
  try {
    const handle = await window.showSaveFilePicker({ suggestedName: 'received-file' });
    preparedWritable = await handle.createWritable();
    log('Save location locked — incoming files will stream straight to disk.', 's');
  } catch (e) {
    if (e && e.name !== 'AbortError') log('Could not set save location: ' + e.message, 'e');
  }
};
