// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// src/transfer.js — chunked, encrypted file transfer over an RTCDataChannel.
//
// SEND path:
//   1. Derive an AES-GCM key from the shared passphrase + a random salt.
//   2. Send a JSON `meta` message (filename, size, mime, base64(salt)). The salt
//      is public; the passphrase is NOT sent anywhere.
//   3. Read the File as a stream (File.stream()), slice into CHUNK-sized pieces,
//      encrypt each with a FRESH random IV, frame it as [uint32 seq | 12-byte IV |
//      ciphertext], and dc.send() it.
//   4. Apply a hand-written BACKPRESSURE controller based on dc.bufferedAmount:
//      when the unsent buffer exceeds HIGH, we stop reading from the File stream
//      and await the `bufferedamountlow` event (fired when it drops below LOW).
//      This guarantees the sender never overwhelms the channel / blows up RAM even
//      if the receiver is slow.
//
// RECEIVE path:
//   Incoming messages are dispatched by type. `meta` derives the receive key and
//   opens a SINK; each binary chunk is decrypted (by seq) and streamed into the sink
//   IMMEDIATELY — we never accumulate the whole file in memory. `done` closes the
//   sink. The sink is memory-safe for arbitrarily large files (writes straight to a
//   disk file via the File System Access API, or — as a capped fallback — to memory),
//   so a 4 GB transfer will not OOM the browser.
//
// Framing note: we use uint32 sequence numbers so out-of-order arrival is safe,
// even though DataChannel is ordered+reliable by default.

import {
  deriveKey, encryptChunk, decryptChunk,
  bufToB64, b64ToBuf, SALT_LEN, IV_LEN,
} from './crypto.js';

const CHUNK = 16 * 1024;          // 16 KiB per DataChannel message (safe for all browsers)
const HIGH_WATER = 16 * 1024 * 1024; // 16 MiB: pause reading above this buffer
const LOW_WATER = 1 * 1024 * 1024;   // 1 MiB: resume once drained below this

// ── Receiver sink ────────────────────────────────────────────────────────────
// Write each decrypted chunk to disk the INSTANT it arrives; we never hold the whole
// file in memory, so a 4 GB (or 40 GB) transfer keeps the JS heap at tens of MB.
//
//   • Chromium (primary): showSaveFilePicker() → FileSystemWritableFileStream. True
//     streaming to a user-chosen location; file size is unbounded. DataChannel is
//     reliable + ordered, so we just `await writable.write(decryptedChunk)` in arrival
//     order — no reassembly buffer.
//   • Others / no transient activation: fall back to an in-memory Blob, but ONLY below
//     a hard 1 GiB threshold. Above it we throw a crisp, actionable error instead of
//     OOMing the tab.
//   • A pre-locked writer (from a "Choose save location" button press = real gesture)
//     is used when supplied, bypassing the gesture requirement entirely.

function safeName(name) {
  return (name || 'file').replace(/[\\/:*?"<>|]/g, '_').slice(0, 200);
}

export const MAX_MEM_BYTES = 1 * 1024 * 1024 * 1024; // 1 GiB hard cap for the memory fallback

export async function createSink(name, size, opts = {}) {
  // 1) A writer the user already locked via a gesture (best path — no picker at recv time).
  const prepared = opts.getPreparedWritable ? opts.getPreparedWritable() : null;
  if (prepared) {
    return { kind: 'fs', write: (pt) => prepared.write(pt), close: () => prepared.close() };
  }

  // 2) Chromium: ask the user where to save, then stream straight to that file.
  // Embedded shells pass preferMemory: an automated receive has no real picker
  // interaction, yet the click that started the transfer keeps the transient
  // activation alive just long enough for the picker to appear. If it gets
  // saved, the receiver hands the shell blob=null and every decision button
  // (Open in REDAKTOR / Download) silently degrades to a log line.
  if (!opts.preferMemory && 'showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({ suggestedName: safeName(name) });
      const w = await handle.createWritable();
      return { kind: 'fs', write: (pt) => w.write(pt), close: () => w.close() };
    } catch (e) {
      // SecurityError (no transient activation) or AbortError (picker dismissed /
      // automation intercepted the chooser): drop to the memory fallback so the
      // transfer still completes instead of being silently aborted. The >1 GB guard
      // below still rejects files we genuinely cannot hold in memory.
    }
  }

  // 3) Fallback: memory only, with a hard ceiling so we fail loudly instead of OOMing.
  if (size > MAX_MEM_BYTES) {
    throw new Error(
      'Browser does not support disk streaming, file exceeds memory limit. ' +
      'Please use Chrome/Edge for files > 1GB.'
    );
  }
  const parts = [];
  return {
    kind: 'mem',
    async write(pt) { parts.push(pt); },
    async close() { this.blob = new Blob(parts, { type: 'application/octet-stream' }); },
  };
}

/**
 * Bind a transfer controller to an RTCDataChannel.
 * @param {RTCDataChannel} dc
 * @param {string} passphrase shared secret (must match the peer's)
 * @param {object} handlers
 * @param {(meta:object)=>void} handlers.onMeta
 * @param {(recv:number,total:number,meta:object)=>void} handlers.onRecvProgress
 * @param {(sink:object,meta:object)=>void} handlers.onComplete  sink.kind is 'fs' (disk) or 'mem' (blob)
 * @param {(sent:number,size:number)=>void} handlers.onSendProgress
 * @param {(state:string)=>void} handlers.onSendState  'sending'|'paused'|'done'
 * @param {(err:Error)=>void} handlers.onError  sink-open failure (e.g. >1GB on a non-streaming browser)
 * @param {object} [opts]
 * @param {()=>FileSystemWritableFileStream|null} [opts.getPreparedWritable] pre-locked writer (gesture)
 */
export function createTransfer(dc, passphrase, handlers = {}, opts = {}) {
  dc.binaryType = 'arraybuffer';
  let recv = null;        // active inbound file state (set only once key+sink are ready)
  let armed = false;      // becomes true after meta is fully initialized
  let mailbox = [];       // messages buffered while meta init is in flight

  // Decrypt + sink a single binary chunk. Each chunk's work is chained onto the
  // previous one (r.writing) so writes land in arrival order AND finishRecv's
  // await of the final r.writing transitively waits for every chunk — otherwise a
  // fast-last / slow-earlier ordering would let close() snapshot the Blob before
  // earlier writes pushed, silently dropping bytes (and scrambling content).
  function processChunk(data) {
    const r = recv;
    if (!r) return;
    // IMPORTANT: take an OWNED copy of the payload immediately. With
    // binaryType='arraybuffer', the browser is allowed to reuse the underlying
    // ArrayBuffer for the next message, so any view (or the decrypt below, which
    // runs asynchronously) that keeps pointing at `data` can read another
    // packet's bytes — scrambling content while lengths still match. `.slice()`
    // allocates a fresh buffer we fully control.
    const buf = new Uint8Array(data).slice();
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const seqRx = dv.getUint32(0, false); // seq (reserved for ordering / retransmit)
    const iv = buf.subarray(4, 4 + IV_LEN);
    const ct = buf.subarray(4 + IV_LEN);
    // Chain each chunk's decrypt+write onto the previous one so writes land in
    // arrival order AND finishRecv's await of the final r.writing transitively
    // waits for every chunk. Without this, a fast-last / slow-earlier ordering
    // lets close() snapshot the Blob before earlier writes pushed, silently
    // dropping bytes (and scrambling content when reordered).
    const prev = r.writing || Promise.resolve();
    r.writing = prev.then(async () => {
      try {
        const pt = await decryptChunk(r.key, iv, ct);
        await r.sink.write(pt);
        r.received++;
        handlers.onRecvProgress?.(r.received, r.expected, r.meta);
      } catch (err) {
        // Authentication failure => wrong passphrase or tampering. Surface it.
        handlers.onRecvProgress?.(r.received, r.expected, { ...r.meta, _error: err.message });
      }
    });
  }

  function finishRecv() {
    const r = recv;
    if (!r) return;
    recv = null;
    armed = false;
    (async () => {
      // Wait for any in-flight chunk write to land in the sink before closing it,
      // otherwise the closed Blob would capture an empty `parts` array.
      try { await r.writing; } catch { /* error already surfaced via onRecvProgress */ }
      try { await r.sink.close(); } catch { /* ignore */ }
      handlers.onComplete?.(r.sink, r.meta);
    })();
  }

  dc.onmessage = (e) => {
    const { data } = e;

    // The meta message starts initialization, so it must be handled immediately
    // (even before `armed`). Everything else is buffered until init completes.
    if (typeof data === 'string') {
      let msg;
      try { msg = JSON.parse(data); } catch { return; }
      if (msg.type === 'meta') {
        if (armed) return;
        const salt = b64ToBuf(msg.salt);
        handlers.onMeta?.(msg);
        (async () => {
          try {
            const key = await deriveKey(passphrase, salt);
            const sink = await createSink(msg.name, msg.size, opts);
            recv = { meta: msg, key, sink, received: 0, expected: Math.ceil(msg.size / CHUNK) };
            armed = true;
            const q = mailbox;
            mailbox = [];
            for (const m of q) dc.onmessage({ data: m });
          } catch (err) {
            handlers.onError?.(err); // e.g. >1 GB on a browser without disk streaming
            armed = true;
            mailbox = [];
          }
        })();
        return;
      }
    }

    if (!armed) { mailbox.push(data); return; }

    if (typeof data === 'string') {
      const msg = JSON.parse(data);
      if (msg.type === 'done') { if (recv) finishRecv(); }
      return;
    }
    // Binary message => one encrypted chunk. Reliable + ordered DataChannel means
    // each decrypted chunk lands in the sink in arrival order.
    processChunk(data);
  };

  /**
   * Stream-encrypt and send a File/Blob with backpressure.
   * @param {Blob} file
   */
  async function sendFile(file) {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
    const key = await deriveKey(passphrase, salt);

    // 1) announce the file + (public) salt
    dc.send(JSON.stringify({
      type: 'meta',
      name: file.name || 'file',
      size: file.size,
      mime: file.type || 'application/octet-stream',
      salt: bufToB64(salt),
    }));

    // 2) stream + encrypt + frame + send, gated by bufferedAmount backpressure
    const reader = file.stream().getReader();
    let seq = 0;
    let sent = 0;
    dc.bufferedAmountLowThreshold = LOW_WATER;

    const drain = () => new Promise((resolve) => {
      dc.addEventListener('bufferedamountlow', resolve, { once: true });
    });

    while (true) {
      if (dc.bufferedAmount > HIGH_WATER) {
        handlers.onSendState?.('paused'); // receiver is slow; apply backpressure
        await drain();
        handlers.onSendState?.('sending');
      }
      const { done, value } = await reader.read();
      if (done) break;

      // The source stream may hand back the whole file in one read (Node's
      // Blob.stream() does), but WebRTC DataChannel messages are capped well
      // below that. Slice each read into CHUNK-sized frames so every dc.send()
      // stays within browser limits AND the receiver always exercises its
      // multi-chunk reassembly path. Copy the slice first: a stream reader can
      // detach/reuse `value`'s buffer once we await, which would corrupt the
      // bytes handed to encryptChunk.
      let off = 0;
      while (off < value.length) {
        const slice = value.slice(off, off + CHUNK);
        const { iv, ciphertext } = await encryptChunk(key, slice);
        const header = new Uint8Array(4 + IV_LEN);
        new DataView(header.buffer).setUint32(0, seq, false);
        header.set(iv, 4);

        const packet = new Uint8Array(header.length + ciphertext.length);
        packet.set(header, 0);
        packet.set(ciphertext, header.length);
        dc.send(packet);

        seq++;
        sent += slice.length;
        off += slice.length;
        handlers.onSendProgress?.(sent, file.size);
      }
    }

    // 3) signal end-of-file
    dc.send(JSON.stringify({ type: 'done', chunks: seq }));
    try { await reader.cancel(); } catch { /* already closed */ }
    handlers.onSendState?.('done');
  }

  return { sendFile };
}
