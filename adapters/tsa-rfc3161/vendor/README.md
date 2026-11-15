# adapters/tsa-rfc3161/vendor

This directory is intentionally **empty in the shipped build**.

The TSA adapter's DER codec (`rfc3161-client.js`) is hand-rolled with Node
built-ins only, which is sufficient for:

- building a `TimeStampReq` (DER), and
- extracting `genTime` / `serialNumber` / `nonce` from the returned `TSTInfo`.

The one thing it does **not** do is verify the TSA's CMS signature / certificate
chain — by design (Aegis never asserts TSA trust; verification is the user's
offline responsibility, see `../README.md`).

If a future need arises for full CMS *verification* (path-building against a TSA
root CA store), that code MUST live here, isolated, and must NOT be imported by
the adapter's production path unless an explicit opt-in flag loads it. This keeps
the zero-dependency contract: `scripts/zero-dep-lint.mjs` skips `vendor/`, so
anything placed here is excluded from the kernel-boundary gate but is also never
loaded by default.

Do not add third-party npm packages here — that would break the "adapter isolated,
kernel untouched" guarantee.
