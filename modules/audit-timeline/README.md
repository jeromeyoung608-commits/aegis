# audit-timeline — Hash-Chained Audit Timeline

## 1. What it solves
Every meaningful action in the closed loop must be recorded so that tampering is detectable. audit-timeline is an append-only, SHA-256 hash-chained timeline: each entry binds to the previous hash, so deleting or altering any entry breaks the chain.

## 2. Who buys this
Any workflow that needs a tamper-evident, locally verifiable audit trail of who did what, when.

## 3. Run in 60 seconds
```bash
cd modules/audit-timeline
node --test                 # suite green
python3 -m http.server 8080 # open index.html (browser timeline UI)
```

## 4. Integration contract
`AuditTrail` (append + verify) and `renderTimeline` are importable; the shell commits a hash-chained entry at each closed-loop stage.

## 5. Architecture
entry → `Hash(prevHash || canonical(entry))` → chain. `verify()` recomputes the chain and flags any broken link.

## 6. Guarantees & threat model
Append-only integrity, tamper-evidence. Out of scope: a compromised host that rewrites the whole chain.

## 7. Known limits
Chain integrity is local; cross-party notarization would need an external anchor.

## 8. Verification
`node --test` → suite green (append, verify, tamper detection).

## 9. Measured performance
Hash chaining is sub-millisecond per entry (native Web Crypto).

## 10. Dependencies
**A · Pure Zero**: 0 npm deps, 0 vendor, 0 external requests (platform Web Crypto).

## 11. License
Repository LICENSE.

## 12. Changelog
- 2026-11-11 — README delivered (English); MDS-1 contract.
