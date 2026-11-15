# Aegis — Order Form (template)

> Template only. Have counsel review before use. This form accompanies the
> **Aegis Paid Support & Services Terms** ([`COMMERCIAL-LICENSE.md`](../COMMERCIAL-LICENSE.md))
> and the full agreement ([`docs/SERVICES-AGREEMENT.md`](./SERVICES-AGREEMENT.md)).

The Aegis **software is open source under Apache-2.0** — this form covers paid
support and services only. No license fee is due; no purchase obligation
exists for running the software.

---

## 1. Parties

| | |
|---|---|
| **Provider** | Jerome Young (Yang Jie), AEGIS maintainer — address per `SECURITY.md` / `.well-known/security.txt` |
| **Customer** | ⟨legal entity name⟩ |
| **Registered address** | ⟨address⟩ |
| **Country / VAT ID** | ⟨country⟩ / ⟨VAT ID⟩ |
| **Customer contact** | ⟨name, role, email, phone⟩ |
| **Technical contact** | ⟨name, role, email, phone⟩ — day-to-day delivery contact |

## 2. Services ordered

Select one plan; the scope below mirrors [`PRICING.md`](../PRICING.md). Coverage
is expressed as deployments and services included — **not** a seat count, and it
does not limit how many operators use the software.

| Plan | Coverage | Annual fee (net, ex-VAT) | Response target | Selected |
|---|---|---|---|---|
| Starter | 1 team / 1 deployment | €4,900 | best-effort / community | ☐ |
| Business | up to 5 deployments | €24,000 | 2 business days | ☐ |
| Enterprise | unlimited | €75,000+ (quoted) | 4h Sev-1 / 1d Sev-2 | ☐ |

### 2.1 Included deliverables

☐ Deployment & integration (environment, module wiring, one-click install)
☐ Hardening review (CSP / COOP-COEP / key handling / sealing configuration)
☐ Compliance readiness pack — SBOM + CRA evidence material
☐ SIEM integration (log forwarding)
☐ Annual support (see §4)
☐ Compliance packs per year: ⟨n⟩  ☐ Extra pack: quoted

### 2.2 Explicitly not included

- Third-party penetration test or ACR/CRA attestation — engagement-specific, quoted separately.
- German-language localisation of compliance templates beyond what ships in the product.
- Custom product development beyond the scope above (available as a separately
  scoped statement of work).

## 3. Fees and payment

| | |
|---|---|
| Annual service fee | € ⟨amount⟩ (net, exclusive of VAT) |
| One-off onboarding fee | € ⟨amount⟩ ☐ none |
| Billing frequency | ☐ annual in advance ☐ monthly ☐ per milestone (SOW) |
| Payment terms | 30 days from invoice date |
| Currency | EUR |

Prices hold for the committed term. Renewal and price-change handling follow
§5 of the services agreement (German CPI-linked cap, 60-day advance notice, 30-day
termination right).

## 4. Support and service levels

| Severity | Definition | Response target (plan) |
|---|---|---|
| Sev-1 | Product unusable or evidence chain broken | ⟨per plan⟩ |
| Sev-2 | Major feature degraded, no data loss | ⟨per plan⟩ |
| Sev-3 | Minor defect or question | ⟨per plan⟩ |
| Sev-4 | Feature request / advisory | next planned release |

Escalation path and on-call arrangements (Enterprise only): ⟨fill⟩.

## 5. Term

| | |
|---|---|
| Start date | ⟨YYYY-MM-DD⟩ |
| Initial term | 12 months ☐ ⟨n⟩ months |
| Auto-renewal | ☐ yes ☐ no — if yes, see §5 of the services agreement |

## 6. Commercial and legal terms

1. The **Aegis software is licensed under Apache-2.0** (SPDX `Apache-2.0`) —
   see [`LICENSE`](../LICENSE). The customer may use, modify, redistribute and
   sell it, including commercially, without paying a licence fee.
2. This Order Form governs **services only**, under the
   [services agreement](./SERVICES-AGREEMENT.md).
3. Liability is capped as stated in the services agreement; the cap amount is
   recorded in an executed schedule: € ⟨amount or "as stated in the executed schedule">⟩.
4. The customer retains all rights under Apache-2.0. No trademark rights are
   granted; see [`TRADEMARK.md`](../TRADEMARK.md).
5. Data handling: the provider does not host customer data. Deployment and
   support work is performed on the customer's infrastructure or under the
   customer's control. See §8 of the services agreement.
6. Provider invoices and delivery reports are provided as **PDF with a sha256
   digest**; the customer may publish the digest.

## 7. Signatures

| | Provider | Customer |
|---|---|---|
| Name | Jerome Young (Yang Jie) | ⟨name⟩ |
| Title | maintainer | ⟨title⟩ |
| Signature | | |
| Date | | |

---

*Non-binding until signed by both parties. Prices shown are list prices and may
be adjusted for scope; see `PRICING.md` for the indicative structure.*
