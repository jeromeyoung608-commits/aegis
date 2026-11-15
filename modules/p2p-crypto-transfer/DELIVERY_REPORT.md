# Delivery Report — P2P Encrypted Transfer (Geek Task #3)

**Project**: `p2p-crypto-transfer`
**Date**: 2026-11-09
**Author**: CodeBuddy (engineering audit + build)
**Constraint compliance**: 100% native browser + Node built-ins, **zero third-party runtime or dev dependencies**.

---

## 1 · Objective recap

Build a minimal, zero-dependency P2P encrypted file-transfer tool for the LAN / no-USB,
no-cloud-drive scenario. Hard requirements:

1. P2P transport via **WebRTC DataChannel**.
2. **Native Web Crypto AES-GCM** encryption applied to **every chunk** before transfer.
3. A hand-written **backpressure** mechanism based on `bufferedAmount` (no memory blow-up
   when the receiver is slow).
4. A minimal **signaling server** is allowed, OR a public STUN, OR a same-machine
   **BroadcastChannel** demo.
5. **Zero dependency**; structured, modular files; detailed README + this delivery report.

---

## 2 · What was delivered

| File | Responsibility |
|------|----------------|
| `index.html` | Minimal UI: mode select, room, shared key, send/receive progress, log. |
| `server.js` | Zero-dep Node signaling + static server. HTTP long-poll relay; optional HTTPS when `key.pem`/`cert.pem` present. |
| `package.json` | No deps; `start` and `test` scripts. |
| `src/crypto.js` | Web Crypto: PBKDF2 key derivation (passphrase + random salt) + AES-GCM per-chunk encrypt/decrypt. |
| `src/signalers.js` | Pluggable signaling: `HttpSignaler` (server relay) and `BroadcastSignaler` (server-less same-machine). |
| `src/p2p.js` | WebRTC orchestration: Offer/Answer, ICE (non-trickle, ICE-gather-complete before send), STUN for NAT. |
| `src/transfer.js` | Streaming chunk + encrypt + send with `bufferedAmount` backpressure; receive + decrypt streams straight to disk via `createSink` (1 GiB-capped in-memory `Blob` fallback). |
| `src/main.js` | UI orchestration only (no business logic). |
| `tests/crypto.test.mjs` + `tests/sink.test.mjs` | Zero-dep unit tests (node --test, 11/11): crypto (round-trip, wrong-key rejection, tamper rejection, salt round-trip, peer interop, key-derivation) + sink (OOM-fix streaming-to-disk logic). |
| `README.md` / `DELIVERY_REPORT.md` | Documentation + this report. |

---

## 3 · Geek-challenge checklist (all met)

### 3.1 P2P penetration (WebRTC)
- ✅ Connection built on `RTCPeerConnection` + `RTCDataChannel` (`src/p2p.js`).
- ✅ Two signaling options shipped: a **minimal zero-dep signaling server** (`server.js`,
  HTTP long-poll, relays only SDP/ICE) **and** a **server-less BroadcastChannel** mode for
  same-machine demo — exactly the alternatives the brief allowed.
- ✅ Public free **STUN** (`stun:stun.l.google.com:19302`) for NAT reflexive candidates;
  used only for ICE, never sees file bytes/keys.
- ✅ Non-trickle ICE: we wait for `iceGatheringState === 'complete'` before sending the SDP
  so the server logic stays trivial (relays exactly two messages).

### 3.2 Encryption & chunking (Web Crypto AES-GCM)
- ✅ `File.stream()` is read via `getReader()` and sliced into **16 KiB chunks**.
- ✅ Each chunk is encrypted with **AES-GCM (256-bit, 128-bit tag) and a fresh random 12-byte IV**
  (`src/crypto.js` `encryptChunk`). The key is derived from the shared passphrase + a random
  salt via **PBKDF2 (120,000 iterations, SHA-256)**.
- ✅ Wire framing per chunk: `[uint32 seq | 12-byte IV | ciphertext]`. Sequence numbers make
  out-of-order arrival safe even though DataChannel is reliable+ordered.
- ✅ The salt is public (sent in the JSON `meta` message); the passphrase is **never transmitted**.
  A compromised signaling server therefore cannot decrypt anything.

### 3.3 Backpressure (bufferedAmount)
- ✅ Hand-written flow control in `src/transfer.js` `sendFile`:
  - `HIGH_WATER = 16 MiB`: when `dc.bufferedAmount` exceeds it, the sender **stops reading**
    from the File stream and `await`s the `bufferedamountlow` event.
  - `LOW_WATER = 1 MiB`: `dc.bufferedAmountLowThreshold` set to this; the `bufferedamountlow`
    event resumes sending.
  - Result: the sender never overwhelms the channel or exhausts RAM even if the receiver is slow.
- ✅ UI surfaces the backpressure state via a log line ("Receiver is slow — backpressure engaged").

### 3.4 Zero dependency
- ✅ `package.json` has empty `dependencies`.
- ✅ `server.js` uses only `node:http`, `node:https`, `node:fs`, `node:path`, `node:url`.
- ✅ Browser code uses only WebRTC + Web Crypto (platform APIs, not libraries).
- ✅ Tests run on `node --test` with no installed packages (`npm test` → 11/11 pass: crypto + sink).

---

## 4 · Verification performed

- `node --test` → **11/11 pass**: crypto tests (round-trip, wrong-key rejection, tamper rejection, salt round-trip, peer interop, key-derivation) + sink tests (OOM-fix streaming-to-disk logic).
- `node --check` on every `.js` file → all parse cleanly (no syntax errors).
- Static review of the security model: confirmed signaling server relays opaque SDP/ICE only;
  file bytes + key material never leave the browser; wrong-key/tampered chunks fail GCM auth.

> Note: live WebRTC end-to-end transfer requires a secure-context browser (HTTPS or localhost)
> and was validated by code review + unit-tested crypto. A manual two-tab/ two-machine run is
> recommended as the final smoke test (steps in README §3).

---

## 5 · Known limitations (honest disclosure)
- Sequential transfers only (one file per channel at a time); concurrent bidirectional metadata
  isolation is not implemented but is an easy extension (see README §5).
- **Receiver OOM — FIXED (was the "memory hog" bug)**: the receiver used to buffer every
  chunk in an array and assemble a `Blob` at the end — a 4 GB file would OOM the tab. It now
  opens a sink on the first decrypted chunk and streams straight to disk
  (`src/transfer.js` `createSink`): Chromium uses `showSaveFilePicker()` →
  `FileSystemWritableFileStream` (unbounded, no reassembly buffer); all other browsers fall
  back to an in-memory `Blob **capped at 1 GiB**` that throws a crisp, actionable error above
  the cap instead of crashing. The one caveat — `showSaveFilePicker` needs a user gesture — is
  handled by a "💾 Choose save location" button that pre-locks the writer before the peer
  sends. See README §6 for the full risk note.
- Public STUN only; symmetric NAT would need a TURN server (out of zero-dep scope).
- Signaling server is in-memory, single-process, unauthenticated — suitable for intranet/demo;
  production needs room auth + scaling.

---

## 6 · Suggested next steps (optional)
1. Multi-file / folder batch with per-file `meta`.
2. Resume capability via `resumeFrom` offset in `meta`.
3. Room authentication + ephemeral token on the signaling server.
4. WASM-accelerated chunk hashing for very high throughput.
