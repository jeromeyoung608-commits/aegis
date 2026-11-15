<!-- Issued — reaffirm against the deployed configuration before each customer onboarding. -->

# Sub-processor & Third-party Inventory

**Status:** Issued · **Version:** 1.0 · **Last updated:** 2026-11-14
**Product:** Aegis — Privacy-First Local Data Cleansing Engine
**Basis:** GDPR Art. 28(2) / SOC 2 CC9 — know and document every external party
that can touch personal data.

---

## 1. Runtime sub-processors: NONE (by design)

Aegis runs **fully locally** with **zero mandatory network egress**. Out of the
box it:

- makes **no outbound calls** to any vendor;
- embeds **no third-party analytics, telemetry, or SaaS SDK**;
- ships its dependencies as **vendored, hashed libraries** inside the package
  (see `dist/sbom.cdx.json` and `verify:delivery` integrity check) — these are
  compiled-in, not remote services.

Therefore there is **no runtime sub-processor** requiring a separate DPA beyond
the Aegis DPA itself.

## 2. Optional integrations (customer-configured, customer-controlled)

| Integration | When active | Data sent | Party |
|-------------|-------------|-----------|-------|
| RFC3161 Timestamp Authority | only if `gateway.externalTsa.enabled=true` | a **hash only** (never document bytes) | customer-chosen TSA endpoint |
| SCIM / OIDC IdP | only if SCIM/OIDC configured | account attributes | customer's IdP |

Each is **opt-in and off by default**. The customer is the controller of any
transfer and is responsible for the transfer mechanism (e.g. SCCs) for the TSA.

## 3. Vendored libraries (bundled, not sub-processors)

The few third-party libs (e.g. `pdf-lib`) are **vendored under
`modules/*/vendor/`**, byte-identical across copies, and recorded in the SBOM with
their licenses and SHA-256. They execute in-process; they are **not** external
services and do not receive data.

## 4. Review cadence

Re-confirm this inventory on every release and at every customer onboarding: the
set of optional egress points must remain exactly the two above, and both off by
default.
