# webgpu-topology — WebGPU Topology Engine

## 1. What it solves
The command console needs a rich, live topology view to drive the seven-stage loop. webgpu-topology renders the Aegis network/entity topology on the GPU with a SharedArrayBuffer-backed data store that cross-origin isolation unlocks (enabling SharedArrayBuffer).

## 2. Who buys this
Any dashboard/visualization that wants high-node-count topology rendering with deterministic, testable data structures.

## 3. Run in 60 seconds
```bash
cd modules/webgpu-topology
node --test                 # 7/7 green
python3 -m http.server 8080 # open index.html (WebGPU-capable browser required for rendering)
```

## 4. Integration contract
SAB-backed node/edge stores, attribute pack/unpack, deterministic graph generation, status weights, and P-256 key/fingerprint primitives. Rendering is browser-only (WebGPU).

## 5. Architecture
SharedArrayBuffer node/edge arrays → WebGPU render pipeline. Determinism lives in the typed-array stores, which are unit-tested without a GPU.

## 6. Guarantees & threat model
Deterministic generation, correct SAB layout, attribute round-trips. Out of scope: the GPU pipeline (browser-only).

## 7. Known limits
Rendering requires a WebGPU-capable, cross-origin-isolated browser; the node suite validates logic only.

## 8. Verification
`node --test` → 7/7 green (SAB layout, attribute packing, generation, base64, key primitives).

## 9. Measured performance
Suite ~114 ms (Node 26), deterministic.

## 10. Dependencies
**A · Pure Zero** first-party code: 0 npm deps. Vendored WGSL/WebGPU via import map only.

## 11. License
Repository LICENSE.

## 12. Changelog
- 2026-11-11 — README delivered (English); TEST_REPORT delivered; 7/7 green (count corrected from a stale 12).
