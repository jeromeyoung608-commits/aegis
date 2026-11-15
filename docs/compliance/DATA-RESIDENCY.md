# Data Residency & Transfer Position — Aegis

**Status:** Issued · **Version:** 1.0 · **Last updated:** 2026-11-14
**Product:** Aegis — Privacy-First Local Data Cleansing Engine

---

## 1. Principle: data stays where you run it

Aegis is **local-first**. By default **all** personal data — documents, derived
hashes, manifests, operator accounts and audit events — is stored on the
customer's own runtime volume (`data/aegis.db`, the encrypted-archive vault, and
`~/.aegis/tls`). The vendor never receives it.

## 2. Default network posture — zero egress

The shipping build makes **no outbound network calls** unless an optional
integration is explicitly enabled. This is verified by the project's
zero-dependency gate, which fails the build if any module performs outbound I/O.
No telemetry, no analytics, no SaaS callbacks.

## 3. Optional integrations (customer-controlled, off by default)

| Integration | When active | Data sent | Cross-border consideration |
|-------------|-----------|----------|---------------------------|
| RFC3161 Timestamp Authority | only if `gateway.externalTsa.enabled=true` | a **hash only** (never document bytes) | the customer's chosen TSA endpoint; customer owns the transfer mechanism (e.g. SCCs) |

There is **no other** external egress. SCIM/OIDC (if enabled) talks only to the
customer's own identity provider.

## 4. International transfers (GDPR Chapter V)

- **Default:** none. Processing is local to the jurisdiction where the instance
  runs.
- **Optional TSA:** only a hash leaves the instance. Because a cryptographic hash
  of a document is generally not personal data in clear, and the endpoint is
  customer-selected, the transfer mechanism (SCCs / adequacy) is the customer's
  responsibility. Document the TSA endpoint and its location in the ROPA.
- **Vendor support channels:** any support interaction is governed by the support
  agreement; no product data is transmitted to the vendor unless the customer
  chooses to share it.

## 5. Residency attestation for customers

Customers subject to data-residency requirements can attest, using this document
and the `verify:zero-deps` evidence, that no personal data leaves their perimeter
in the default configuration. Enable only the integrations whose transfer basis
you have authorised.

Deployment region and any mandated local-processor clauses are specified in the
Order Form for each engagement.
