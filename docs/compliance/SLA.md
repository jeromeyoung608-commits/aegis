<!-- Issued — tailor SLAs/penalties to the signed commercial agreement. -->

# Service Level Agreement (SLA) — Aegis

**Status:** Issued · **Version:** 1.0 · **Last updated:** 2026-11-14
**Model:** self-hosted / customer-operated (the customer owns the runtime)

## 0. Operational contact

- **SLA contact mailbox:** {{SLA_MAILBOX}}
- **Operator timezone:** {{SLA_TIMEZONE}}

---

## 1. Scope & responsibility split

Aegis is delivered as **software the customer operates on its own infrastructure**.
Therefore availability, backup and incident handling are the **customer's**
operational responsibility, supported by the vendor as described below.

| Area | Customer | Vendor |
|------|----------|--------|
| Host availability / uptime | owns (their VM/hardware) | — |
| Backup & restore of the runtime volume | owns (procedure provided) | documents `sqlite3 .backup` + restore drill |
| Security patching of the OS/runtime | owns | ships dependency updates + advisories |
| Product defect / outage causality | diagnoses with vendor | provides fixes per support tier |
| Availability monitoring | owns | exposes `GET /healthz` probe |

## 2. Availability target (reference)

For a single-node self-hosted deployment with the documented backup in place, the
reference availability objective is **99.5%** of scheduled uptime per month
(excludes planned maintenance and customer-side infrastructure faults). This is a
**target**, not a contractual penalty unless the commercial agreement states one.

## 3. Support response times (reference)

| Priority | Example | Response objective |
|----------|---------|-------------------|
| P1 — Sev1 (data loss / breach / exploited vuln) | confirmed breach, vault corruption | **4 hours** acknowledgement, continuous until resolved |
| P2 — Sev2 (major feature broken, no data loss) | a module fails to load | 1 business day |
| P3 — Sev3 (degraded) | slow export | 3 business days |
| P4 — Sev4 (cosmetic/doc) | wording | next release |

## 4. Monitoring

The vendor supplies a **liveness/readiness probe**: `GET /healthz` returns
`{ ok, uptimeSeconds, db, version, ts }` and can sit behind a load balancer. The
customer wires alerts to it.

## 5. Change management

Releases are tagged and reproducible; the delivery package is integrity-checked
(`verify:delivery`). The customer controls when to apply updates.

## 6. Exclusions

The vendor does **not** warrant uptime of customer-owned infrastructure, nor
availability of customer-configured optional integrations (e.g. a third-party
TSA). Force majeure applies.

> NOTE: replace response times, penalties and governing terms with the signed
> agreement; counsel review before publication.
