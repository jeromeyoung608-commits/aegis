// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// src/p2p.js — WebRTC connection orchestration (offer/answer + ICE, non-trickle).
//
// Non-trickle design: we wait for ICE gathering to COMPLETE before sending the
// SDP, so the offer/answer already embed all host/STUN candidates. This keeps the
// signaling server trivial (it only relays exactly two messages: offer and answer)
// and avoids a fragile candidate-plumbing state machine.
//
// STUN: a public free STUN server is used ONLY to discover reflexive candidates
// for NAT traversal. It never sees file bytes or keys. For a pure same-subnet LAN
// or the BroadcastChannel demo, STUN is not even contacted.

import { HttpSignaler, BroadcastSignaler } from './signalers.js';

// Public, free STUN. Replace with your corporate/from-scratch server if needed.
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

/**
 * Establish a P2P session.
 * @param {object}   cfg
 * @param {'lan'|'local'} cfg.mode       'lan' => HttpSignaler, 'local' => BroadcastSignaler
 * @param {string}   cfg.room             shared room id (entered by both peers)
 * @param {boolean}  cfg.isInitiator      true => creates the DataChannel + sends offer
 * @param {(dc: RTCDataChannel) => void} cfg.onChannel  called when the channel exists
 * @param {(state: string) => void}      cfg.onStatus   connection-state updates
 * @returns {Promise<{pc: RTCPeerConnection, signaler: any}>}
 */
export async function createSession({ mode, room, isInitiator, onChannel, onStatus }) {
  const signaler = mode === 'local' ? new BroadcastSignaler() : new HttpSignaler();
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  pc.onconnectionstatechange = () => onStatus?.(pc.connectionState);

  let dc;
  if (isInitiator) {
    dc = pc.createDataChannel('file', { ordered: true });
    onChannel?.(dc);
  } else {
    pc.ondatachannel = (e) => {
      dc = e.channel;
      onChannel?.(dc);
    };
  }

  const myId = crypto.randomUUID();
  await signaler.connect(room, myId);

  // BroadcastChannel does NOT buffer messages: if the receiver joins after the
  // initiator already sent its one-and-only offer, that offer is gone and the
  // pair would wait on each other forever. The initiator therefore retransmits
  // the offer every 2s until an answer arrives, and the receiver ignores any
  // retransmitted duplicates.
  let answered = false;
  let offerHandled = false;

  // Relay incoming signaling messages to the RTCPeerConnection.
  signaler.onMessage(async (msg) => {
    try {
      if (msg.type === 'offer') {
        if (offerHandled) return; // duplicate from the initiator's retransmit loop
        offerHandled = true;
        await pc.setRemoteDescription({ type: msg.type, sdp: msg.sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await _waitIce(pc);
        // RTCSessionDescription is NOT structured-cloneable — sending the
        // instance over BroadcastChannel throws "could not be cloned".
        // Always flatten to a plain { type, sdp } pair.
        await signaler.send({ type: 'answer', sdp: pc.localDescription.sdp });
      } else if (msg.type === 'answer') {
        answered = true;
        await pc.setRemoteDescription({ type: msg.type, sdp: msg.sdp });
      }
    } catch (err) {
      onStatus?.('signaling-error: ' + err.message);
    }
  });

  if (isInitiator) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await _waitIce(pc);
    await signaler.send({ type: 'offer', sdp: pc.localDescription.sdp });
    const retransmit = setInterval(() => {
      if (answered || pc.connectionState === 'connected') { clearInterval(retransmit); return; }
      signaler.send({ type: 'offer', sdp: pc.localDescription.sdp });
    }, 2000);
    setTimeout(() => clearInterval(retransmit), 30_000); // hard stop after 30s
  }

  return { pc, signaler };
}

/** Resolve once ICE gathering finishes (or after a 3s fallback). */
function _waitIce(pc) {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') return resolve();
    const check = () => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', check);
        resolve();
      }
    };
    pc.addEventListener('icegatheringstatechange', check);
    setTimeout(resolve, 3000); // safety net if the event never fires
  });
}
