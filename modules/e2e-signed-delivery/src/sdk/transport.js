// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
// src/sdk/transport.js — P2P transport for the signed artifact.
//
// This deliberately reuses the project's own p2p-crypto-transfer module:
// the same WebRTC + AES-GCM pipeline (offer/answer over BroadcastChannel,
// chunked encrypted stream) that the Aegis shell uses elsewhere. We run BOTH
// ends (the sender and the "boss" receiver) in this single page, paired via the
// shared BroadcastChannel in 'local' mode — a faithful same-machine demo of
// "send the finalized document to the boss on the LAN".

import { createSession } from '../../../p2p-crypto-transfer/src/p2p.js';
import { createTransfer } from '../../../p2p-crypto-transfer/src/transfer.js';

// Scope the signaling room to this page load. Both peers live in this one page,
// so a per-load nonce is enough — and it keeps a second tab (or a stale tab from
// an earlier demo) from stealing this session's WebRTC offer over BroadcastChannel.
const ROOM = 'aegis-signed-delivery-' + Math.random().toString(36).slice(2, 10);

const openChannel = (dc) =>
  new Promise((res) => {
    if (dc.readyState === 'open') res(dc);
    else dc.onopen = () => res(dc);
  });

/**
 * Open the sender (initiator) side and return a bound sendFile().
 * @param {object} o
 * @param {string} o.passphrase shared AES-GCM passphrase
 * @param {(s:string)=>void} o.onStatus
 * @param {()=>void} o.onSent
 * @param {(e:Error)=>void} o.onError
 */
export async function openSender({ passphrase, onStatus, onSent, onError }) {
  let channelReady;
  await createSession({
    mode: 'local',
    room: ROOM,
    isInitiator: true,
    onStatus,
    onChannel: (dc) => { channelReady = openChannel(dc); },
  });
  return {
    async sendFile(file) {
      const dc = await channelReady;
      const transfer = createTransfer(dc, passphrase, {
        onError,
        onSendState: (st) => { if (st === 'done') onSent && onSent(); },
      });
      return transfer.sendFile(file);
    },
  };
}

/**
 * Open the boss (receiver) side. Calls onReceived with the received Blob once the
 * transfer finishes. For in-memory sinks the Blob carries the bytes (needed for
 * signature verification); disk sinks report kind 'disk' and the bytes are not
 * recoverable in-page (verify from the saved file instead).
 */
export async function openReceiver({ passphrase, onStatus, onReceived, onError }) {
  await createSession({
    mode: 'local',
    room: ROOM,
    isInitiator: false,
    onStatus,
    onChannel: (dc) => {
      // onChannel fires asynchronously (ondatachannel); bind the transfer here.
      openChannel(dc).then((c) => {
        createTransfer(c, passphrase, {
          onError,
          onComplete: (sink, meta) => {
            if (sink.kind === 'mem') onReceived?.(sink.blob, meta, 'mem');
            else onReceived?.(null, meta, 'disk');
          },
        });
      });
    },
  });
}
