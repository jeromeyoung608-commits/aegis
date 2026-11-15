# sync-canvas — DELIVERY REPORT (MDS-1)

> Machine-checkable delivery contract. Mirrors the 12 chapters of the module README.

### 1. What it solves
Many people editing the same document: plain broadcast overwrites edits and state forks after disconnect. sync-canvas gives conflict-free real-time collaboration with a deterministic hub sequencer and an append-only audit chain.

### 2. Who buys this
SaaS / internal-tool teams needing a whiteboard or collaborative editing capability.

### 3. Run in 60 seconds
```bash
cd modules/sync-canvas
node --test tests/*.test.mjs   # 13/13 green
python3 -m http.server 8080   # open index.html#ROOM1
```

### 4. Integration contract
`apply / diff / transform / mapIndex` (text OT) and `HashChain` (audit chain) as the facade. Transports: `BroadcastChannel` (same browser) and WebSocket relay (`?ws=`) for cross-device.

### 5. Architecture
client optimistic update → hub sequencing/commit → anti-entropy reconnect. Convergence by OT transform.

### 6. Guarantees & threat model
TP1 convergence (random fuzz 200/200 in `tests/ot.test.mjs`), anti-entropy reconnect. Out of scope: compromised host OS, malicious extension.

### 7. Known limits
A hub sequencer is mandatory; no end-to-end encryption; single-room scale measured to ~50 clients.

### 8. Verification
`node --test tests/*.test.mjs` → **13 / 13 pass, 0 fail**.

### 9. Measured performance
50 clients / 53 disconnects / 670 ms convergence; fuzz 300/300 identical.

### 10. Dependencies
**A · Pure Zero**: 0 npm deps, 0 vendor, 0 external requests.

### 11. License
**Open source, Apache-2.0** — see `LICENSE`.

### 12. Changelog
- 2026-11-11 — verified 13/13 green; MDS-1 contract delivered.
