# p2p-crypto-transfer — Peer-to-Peer Encrypted Transfer

## 1. What it solves
Files must move between two parties without a server ever seeing them. p2p-crypto-transfer sets up a WebRTC data channel and streams AES-GCM-encrypted chunks straight to disk, with a minimal zero-dependency signaling server that relays only opaque SDP/ICE.

## 2. Who buys this
Any workflow that needs direct, end-to-end-encrypted file handoff (the "transport" leg of the Aegis closed loop).

## 3. Run in 60 seconds
```bash
cd modules/p2p-crypto-transfer
node --test                 # 11/11 green
node server.js &            # minimal signaling server (relays SDP/ICE only)
python3 -m http.server 8080 # open index.html (two tabs to transfer)
```

## 4. Integration contract
`src/transfer.js` (stream encrypt/send + receive/decrypt to disk), `src/p2p.js` (RTCPeerConnection/DataChannel), `src/crypto.js` (envelope). The shell drives it via iframe + postMessage.

## 5. Architecture
key exchange → AES-GCM envelope → WebRTC DataChannel → receiver decrypts to disk via a 1 GiB-capped in-memory Blob fallback. Signaling server relays only SDP/ICE.

## 6. Guarantees & threat model
End-to-end encryption (wrong key fails), integrity (tamper rejected), OOM-safe streaming. The signaling server sees no file bytes or keys. Out of scope: signaling server compromise, host OS compromise.

## 7. Known limits
Requires a secure context (HTTPS/WSS) and a browser for the live transfer; the node suite simulates the crypto/transport contract.

## 8. Verification
`node --test` → 11/11 green (crypto round trip, wrong-key rejection, tamper rejection, salt round trip, peer interop, streaming-to-disk logic).

## 9. Measured performance
Suite ~1.0 s (Node 26), deterministic.

## 10. Dependencies
**A · Pure Zero** first-party code: 0 npm deps. Browser uses only WebRTC + Web Crypto.

## 11. License
Repository LICENSE.

## 12. Changelog
- 2026-11-11 — README delivered (English); TEST_REPORT delivered; 11/11 green (count corrected from stale 10).
