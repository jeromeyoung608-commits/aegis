<!-- Issued — required where processing is likely to result in high risk (GDPR Art. 35). -->

# Aegis Data Protection Impact Assessment (DPIA) — Trigger & Template

**Status:** Template · **Version:** 1.0 · **Last updated:** 2026-11-14
**Framework:** EU GDPR Article 35 / UK GDPR

A DPIA is mandatory before starting processing that is "likely to result in a high
risk". This document (a) lists the statutory trigger criteria, (b) records the
Controller's answers, and (c) provides the assessment body. The Aegis instance
exposes a trigger calculation at `GET /api/compliance/dpia` from the Controller's
own `dpia` flags — it is advisory only and does not replace counsel's judgement.

---

## 1. Trigger criteria (Art. 35(3)) — tick any that apply

| # | Criterion | Controller answer |
|---|---|---|
| 1 | Large-scale evaluation of personal aspects based on automated processing (profiling) | [ ] |
| 2 | Large-scale processing of special-category data (Art. 9) or criminal-offence data (Art. 10) | [ ] |
| 3 | Systematic, large-scale monitoring of a publicly accessible area | [ ] |
| 4 | Large-scale processing (e.g. > 100k data subjects) | [ ] |
| 5 | Processing that prevents data subjects from exercising a right or using a service/contract | [ ] |
| 6 | Processing that creates or exploits vulnerable-subject profiles | [ ] |
| 7 | Innovative technology (e.g. biometric, AI-driven decisions) | [ ] |
| 8 | When combined with another processing, it gives rise to high risk | [ ] |
| 9 | Processing of children's data / offering services to children | [ ] |

**Trigger result:** if any criterion is ticked, a DPIA is **required**. The
`/api/compliance/dpia` endpoint returns `{ required: true, reasons: [...] }`.

## 2. Assessment body (Art. 35(7))

- **Description of processing:** {{ROPA_PURPOSE}}
- **Necessity & proportionality:** local-only by design; egress disabled by default;
  hashing/minimisation applied before any optional external call.
- **Risks to data subjects:** unauthorised access (mitigated by operator auth + audit);
  retention beyond need (mitigated by GDPR erasure / tombstone).
- **Measures:** encryption at rest, zero default egress, tamper-evident audit chain,
  role-based access, and the operator compliance console.
- **Residual risk & sign-off:** _to be completed by the Controller's DPO._

## 3. Consultation (Art. 35(9))

Where a DPIA indicates high residual risk, the Controller consults the competent
supervisory authority before processing.

---

_Completed DPIA to be retained by the Controller and supplied to the supervisory authority on request._
