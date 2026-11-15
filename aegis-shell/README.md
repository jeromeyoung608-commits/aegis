# Aegis Shell — Seven-Stage Closed-Loop Command Console

> Aegis workbench · `@aegis/shell`
> ENGINE BY JEROME YOUNG

## 1. What it solves

Taken alone, each module looks like a demo: the topology is cool, redaction is solid, P2P is fast — but a customer's first question is always "can these be strung into one thing?" Without a closed loop, seven modules are seven islands, and there is no proof they actually cooperate. This Shell wires them into one **seven-stage state machine**: select node → load contract → local redact → sign → encrypted transport → counterparty verify → seal into vault → audit-chain commit.

## 2. Who buys this

- Procurement / integrators who need a full-machine demo, not point demos
- Sales-engineering teams selling Aegis as one solution
- Delivery teams needing a reproducible acceptance path

## 3. Run in 60 seconds

The Shell references each module by absolute path `/modules/...`, so it **must be served from the Aegis repository root**:

```bash
cd /path/to/Aegis
python3 -m http.server 8000
# → http://localhost:8000/aegis-shell/
```

(Running it standalone inside `aegis-shell/` would 404 on `/modules/*` and show only an empty shell.)

## 4. Integration contract

- The event-bus contract lives in `src/sdk.js`: `topology:node-selected` / `redaktor:export-ready` / `artifact:signed` / `p2p:file-sent` / `p2p:file-received` / `artifact:verified` / `vault:sealed`.
- External subscribers use `AegisSDK` and never read the DOM directly.
- State is mutated only through the `src/context.js` mutators, so every stage is externally observable.

## 5. Architecture

```
aegis-shell/
├── index.html         seven-stage Stepper + three iframe workspaces
└── src/
    ├── context.js    FLOW_STAGES(1..7) + one-way-forward state machine
    ├── sdk.js        event bus / external contract
    ├── identity.js   signing adapter (uses Aegis-Identity)
    └── app.js        iframe orchestration + step lighting + closing audit
```

## 6. Guarantees & threat model

- **Guarantee**: `flowStage` only increases (`Math.max`); out-of-order events never rewind the demo.
- **Guarantee**: a failed verification never unlocks the archive step (failure must stop at VERIFY).
- **Out of scope**: the in-iframe modules' own guarantees (see each module README); also not protecting against a host page injected by third-party scripts.

## 7. Known limits

- Depends on same-origin deployment: every module must be served by the same origin; cross-origin iframes lose events and OPFS.
- Stage 5 verification and stage 6 sealing depend on browser OPFS support (Chrome / Edge).
- The stage-4 brand label is unified as **Aegis-Transport** (previously mislabeled Aegis-SignedDelivery).

## 8. Verification

```bash
node --test tests/flow.test.mjs
# expected: # pass 5 / # fail 0
```

Covers: seven-stage continuity, full 1→7 advance, **failed verify cannot enter archive** (failure path), out-of-order events never rewind, `resetFlow()` clears all fields.

## 9. Measured performance

Pure state-machine logic; on this machine (macOS / Apple Silicon / Node 20+, 2026-11-10) the 5 assertions run in < 50 ms. End-to-end latency depends on the modules (OCR and P2P dominate).

## 10. Dependencies

**A · Pure Zero**: 0 npm dependencies, 0 vendor, 0 external requests; only native browser APIs are used.

## 11. License

**Business Source License 1.1 (BUSL-1.1)** — source-available, not open source.
The root `LICENSE` governs. Non-production use is free. Production use is free
for organizations with fewer than 10 FTE and consolidated annual revenue below
EUR 2,000,000; otherwise a commercial license is required (see
`COMMERCIAL-LICENSE.md`). On 2030-11-15 this version converts to Apache-2.0.

## 12. Changelog

See [`CHANGELOG.md`](./CHANGELOG.md).
