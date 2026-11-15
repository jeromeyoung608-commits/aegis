# Security Policy

## Security support period (CRA Art. 13)
Aegis v1.0.0 has a declared security support period of **5 years from first
publication: 2026-11-15 → 2031-11-15**. During this period the manufacturer
provides security updates and vulnerability remediation. The end date is
disclosed to customers at the time of purchase (CRA Art. 13(19)); the rationale
for the period is recorded in the technical documentation (Art. 13(8)).

| Version | Supported | Security support until |
|---------|-----------|------------------------|
| 1.0.x   | ✅ | 2031-11-15 |

## Reporting a vulnerability (coordinated disclosure / CVD)
Aegis is a privacy-first, local-processing tool. If you find a vulnerability,
**do not open a public issue** with exploit details. Instead, report privately to
the maintainer at **jeromeyoung608@gmail.com** (also published in
`.well-known/security.txt`) and include:
- a description and impact,
- steps to reproduce,
- affected version (`Aegis` version from `package.json`).

We aim to acknowledge within **5 business days** and to provide a remediation
timeline within **30 days** for confirmed issues.

## Scope
In scope: the Aegis server (`server.js`, `server/store.js`), the TSA adapter
(`adapters/tsa-rfc3161`), and the operator console (`aegis-shell/console.html`).
Out of scope: the underlying browser, Node.js runtime, and any third-party TSA you
configure.

## Security posture (summary)
- Zero **npm** runtime dependencies. Browser modules vendor third-party libraries (PDF.js, pdf-lib, Tesseract.js) committed under each module's `vendor/` directory; the SBOM (`scripts/gen-sbom.mjs`) lists all of them — and the dev/test `playwright` tooling — honestly. The "zero-dependency" claim applies to the **core kernel** (`crypto / hash-chain / audit / signaling / redaction render`); it is not a claim that the entire product contains no third-party code.
- Server-blind transfer: the relay stores only opaque ciphertext.
- Token-gated signaling + per-IP rate limiting.
- Operator-only audit / revocation / escrow APIs.
- Local CRL-style revocation checked at session admission.
- GDPR Art. 17 erasure with retained compliance markers.

## Network exposure & deployment hardening

**By default the server binds to all network interfaces** (`server.listen(PORT)` with no
host argument → `0.0.0.0` / `::`). The static console UI, the token-gated signaling
relay, and the metrics endpoint are therefore reachable from **any host that can route
to the port** (default `8099`, or `PORT`). This is intentional for a single-operator
local workbench, but it is **not** safe to expose raw on a shared / untrusted network.

Deployment rules:
- **Put Aegis behind a reverse proxy** (nginx, Caddy, Traefik, or your LoadBalancer) that
  terminates TLS, enforces authenticated access, and restricts source IPs / CIDR ranges.
  Do not publish the raw Node port to the internet or a shared LAN segment.
- The reverse proxy is also where you should expose `/metrics` **only if** you have set
  `AEGIS_METRICS_TOKEN` (it is fail-closed otherwise — see
  `docs/compliance/CONFIGURE-BEFORE-DEPLOY.md`). Keep metrics behind the proxy's ACL.
- **Never** set `AEGIS_TRUSTED_LAN=1` on a shared or production network — it relaxes the
  `/session` admission control for lab use only and is explicitly unsafe beyond localhost.
- The operator console and signaling relay both require an operator session / issuer
  secret; the static UI is unauthenticated by design (it is a login screen), so the
  proxy must enforce who may reach it.

See `docs/compliance/THREAT-MODEL.md` and `docs/compliance/CRA-NIS2.md` for the
full analysis. **An independent third-party penetration test is still required
before any production deployment claim.**

## CRA incident reporting commitment
For vulnerabilities that qualify as a **severe incident** under the EU Cyber
Resilience Act (Regulation (EU) 2024/2847, Art. 14/71), the manufacturer commits
to the following reporting timeline to the competent authority (BSI in Germany):

- **Within 24 hours** of becoming aware: an early warning (Art. 14(2));
- **Within 72 hours**: a vulnerability notification / incident report with the
  available details (Art. 14(3));
- **Within 14 days**: a final report with root cause and remediation (Art. 14(4)),
  or a reasoned delay where facts are still under investigation.

Note: the CRA reporting obligations have applied since **2026-09-11**. Where Aegis
is already supplied in the EU, these are current obligations, not future plans.
⚠️ This commitment is a commercial/process statement, not legal advice; the exact
trigger, authority and any micro/small-enterprise exemptions must be confirmed by
qualified counsel.
