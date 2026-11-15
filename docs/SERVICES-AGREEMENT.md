# Aegis — Support & Services Agreement

> Template agreement. Have a qualified EU attorney review it — especially the
> liability limitations — before signature. This document governs **paid support
> and services only**.

**Provider:** Jerome Young (Yang Jie), AEGIS maintainer.
**Customer:** ⟨legal entity name⟩.
**Effective date:** ⟨YYYY-MM-DD⟩.

This services agreement ("Agreement") is entered into between the Provider and
the Customer. It is accompanied by an Order Form, which forms part of it.

## 1. Scope and relation to the software licence

1.1 The AEGIS software ("the Software") is **open source**, licensed under the
**Apache License, Version 2.0** (SPDX `Apache-2.0`). The full text is in
`LICENSE`. Nothing in this Agreement restricts, conditions or re-licences the
Customer's use of the Software.

1.2 The Customer may use, modify, redistribute and sell the Software,
including commercially, without paying a licence fee and without obtaining
permission. No purchase obligation arises from the Software's licence.

1.3 This Agreement covers only the **services** the Provider performs for the
Customer: deployment, integration, hardening review, compliance readiness packs,
SIEM integration and support. The scope of each engagement is stated in the
Order Form.

1.4 If the Customer has not signed an Order Form, no services are engaged and
no obligation arises under this Agreement.

## 2. Services

2.1 The Provider performs the services listed in the Order Form §2 with
reasonable skill and care, in accordance with the acceptance criteria in §4.

2.2 Services are provided **remotely by default**. On-site work requires a
separate statement of work.

2.3 The Provider may use subcontractors for non-specialist work (e.g. hosting
or translation), remaining responsible for their performance.

2.4 **Change control.** Work outside the agreed scope is quoted separately and
begins only after written approval. The Provider may stop work that exceeds the
agreed scope until the change is approved.

## 3. Customer obligations

3.1 The Customer provides a technically competent contact, timely access to the
target environment, and the information and credentials required for the
engagement.

3.2 The Customer is responsible for the legal and contractual basis on which it
processes documents and personal data. **The Provider does not host customer
data** and does not process document content on the Customer's behalf.

3.3 The Customer keeps a backup before each engagement step that modifies
persistent state.

## 4. Deliverables and acceptance

4.1 Each engagement produces written deliverables: a deployment record, a
hardening-review report, a compliance readiness pack (SBOM + evidence index),
or a support summary — as stated in the Order Form.

4.2 The Customer has **10 business days** from delivery to accept a deliverable
or give written notice of specific non-conformity. A deliverable is accepted if
no notice is received in that period.

4.3 If a deliverable does not conform, the Provider re-performs the affected
work within a reasonable period. If it still does not conform, the Customer's
sole remedy for that deliverable is a proportionate reduction of the fee for
the affected item.

4.4 The handover of a deployment follows
[`docs/DEPLOYMENT-DELIVERY-CHECKLIST.md`](./DEPLOYMENT-DELIVERY-CHECKLIST.md),
which both parties sign off.

## 5. Fees, invoicing and renewal

5.1 Fees are those in the Order Form, net of VAT and excluding the taxes,
duties and levies the Customer must pay.

5.2 Invoices are issued as stated in the Order Form and are payable within 30
days. Late payment beyond 30 days, after written notice, suspends support
services. The Provider may invoice for work already performed.

5.3 **Renewal (§307 BGB — attorney review required).** Where the Order Form
selects auto-renewal: the term does not renew silently. The Provider gives
written notice of the upcoming renewal **60 days** before term end; the
Customer may terminate with effect at term end on **30 days' notice**. Price
holds for the committed term. Any price change at renewal is limited to the
change in the German CPI (Verbraucherpreisindex) over the prior 12 months,
applied by a stated formula, and the Customer may terminate instead of
accepting it. Avoid "we may change prices at any time" wording — such a clause
is generally invalid as an unreasonable standard-term disadvantage under §307
BGB.

5.4 Expenses are charged at cost where the Order Form says so, and are never
marketed up.

## 6. Support and service levels

6.1 Response targets per severity are those in the Order Form §4. A target is a
response time, not a resolution time, unless expressly stated otherwise.

6.2 Support covers the deployed version of the Software and the configurations
delivered under this engagement. Support for third-party components is provided
to the extent the Provider can influence it; the Customer remains responsible
for licensing and support of those components under their own terms.

6.3 The Provider may suspend support for a sustained security issue in the
Customer's environment where continued operation would expose the Provider's
other customers; the Provider gives notice and mitigates where practicable.

## 7. Confidentiality

7.1 Each party keeps the other's non-public information confidential, uses it
only for this engagement, and protects it at least to the same standard it
applies to its own confidential information of that kind.

7.2 The obligation survives termination for three years.

7.3 These obligations do not apply to information that is public, independently
developed, lawfully received from a third party, or required to be disclosed by
law (where the disclosing party gives prompt notice where lawful).

7.4 **Customer data processed during a deployment remains the Customer's data.**
The Provider does not host it and does not retain copies after the engagement
unless agreed in writing.

## 8. Intellectual property and trademark

8.1 The Software, including its documentation, remains licensed under
Apache-2.0. The Provider grants no additional intellectual-property rights in
the Software beyond that licence.

8.2 Deliverables produced specifically for the Customer in the course of an
engagement are provided to the Customer under the Apache-2.0 licence, to the
extent they contain Provider material. The Provider may reuse general
know-how, methods and non-Customer-specific components.

8.3 The Provider retains all rights in the AEGIS name, logo and the
"ENGINE BY JEROME YOUNG" attribution mark. The Apache-2.0 licence grants no
trademark rights. The Customer may state factually that a deployment is "based
on Aegis" or "powered by Aegis", provided the attribution notices required by
Apache-2.0 are retained.

8.4 Neither party may use the other's marks in a way that suggests endorsement.

## 9. Warranties and liability

9.1 The Software and the services are provided "AS IS", without warranty of any
kind, to the maximum extent permitted by law.

9.2 The Provider warrants that it will perform the services with reasonable
skill and care, and that deliverables will materially conform to the
acceptance criteria in §4 for 30 days after delivery.

9.3 To the maximum extent permitted by law, the Provider is **not liable** for
indirect, incidental, special or consequential damages, or for loss of profit,
revenue, data or business interruption, arising from the Software or the
services.

9.4 The Provider's aggregate liability under this Agreement is limited to the
cap stated in the Order Form / executed schedule for the applicable engagement.

9.5 Nothing in this clause limits liability that cannot be excluded by
applicable law (intent, gross negligence, death or personal injury caused by
negligence, product liability under ProdHaftG, fraud, or the simple-negligence
breach of a cardinal obligation — the latter limited to typical foreseeable
loss).

## 10. Term and termination

10.1 This Agreement runs for the term stated in the Order Form and terminates
on completion of the services or expiry of that term.

10.2 Either party may terminate for material breach with a 14-day cure period.
The Provider may suspend services for non-payment after written notice and a
14-day cure period.

10.3 On termination the Provider delivers the work in progress and the
deliverables produced, and the Customer pays for services performed up to that
date.

10.4 Termination does not affect the Customer's rights under the Apache-2.0
licence to the Software, nor §§7 (confidentiality), 9 (liability) or 11
(governing law).

## 11. Governing law and disputes

11.1 This Agreement is governed by the laws of the Federal Republic of Germany,
excluding its conflict-of-laws rules and the UN CISG.

11.2 The courts of the Provider's registered seat have exclusive jurisdiction,
unless mandatory local consumer or data-protection law provides otherwise.

11.3 The parties will attempt to resolve any dispute by good-faith negotiation
within 30 days of written notice of the dispute, before commencing proceedings.

## 12. General

12.1 This Agreement and its Order Form are the entire agreement between the
parties on their subject matter and supersede earlier discussions.

12.2 Amendments must be in writing and signed by both parties.

12.3 If a provision is unenforceable, it is modified to the minimum extent
necessary; the rest remains in force.

12.4 Neither party may assign this Agreement without the other's prior written
consent, except to a successor in a business transfer of substantially all
assets.

12.5 The Provider may reference the Customer as a reference customer, with the
Customer's written approval of the wording, unless the Customer objects.

## 13. Signatures

| | Provider | Customer |
|---|---|---|
| Name | Jerome Young (Yang Jie) | ⟨name⟩ |
| Title | maintainer | ⟨title⟩ |
| Signature | | |
| Date | | |

---

*This is a commercial-structure template, not legal advice. Have a qualified
German/EU attorney review it before signature.*
