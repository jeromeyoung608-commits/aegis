# doc-redactor — DELIVERY REPORT (MDS-1)

> Machine-checkable delivery contract. Mirrors the 12 chapters of the module README.

### 1. What it solves
Customers must redact and sanitize sensitive PDFs before sharing, entirely in the browser — no upload, no server. Optional OCR detects text and scanned content; the export is produced locally.

### 2. Who buys this
Compliance / legal / privacy teams that must prove a document never left the device during redaction.

### 3. Run in 60 seconds
```bash
cd modules/doc-redactor
node --test                         # 62/62 green
python3 -m http.server 8080        # open index.html (works offline, zero external requests)
```

### 4. Integration contract
Browser app exposing `window.REDAKTOR` and an `aegis` channel (`redaktor:load-doc` / `export-ready`). Core redaction functions are importable; the shell drives it via iframe + postMessage.

### 5. Architecture
PDF parsed in-browser → regions redacted (vector + raster) → locally produced export. OCR runs on-device when enabled; nothing is sent to a server.

### 6. Guarantees & threat model
Zero external requests (verified offline), local-only processing. Out of scope: a compromised host OS, a malicious extension reading page memory.

### 7. Known limits
Heavy OCR/large scans depend on device CPU; very large PDFs are bounded by tab memory.

### 8. Verification
`node --test` → **62 / 62 pass, 0 fail** (redaction correctness, zero-external-request CSP, export integrity).

### 9. Measured performance
Suite ~< 2 s; redaction ops are sub-frame in the browser.

### 10. Dependencies
**A · Pure Zero** for first-party code: 0 npm deps. Vendored `pdf-lib` via import map (kept inside the module, not a runtime dependency) for PDF handling.

### 11. License
Repository [LICENSE](../../LICENSE) — **MIT**, covering all first-party code. Vendored components
keep their own upstream licences (see `vendor/THIRD_PARTY_NOTICES.md`).

### 12. Changelog
- 2026-11-11 — verified 62/62 green; MDS-1 contract delivered.
