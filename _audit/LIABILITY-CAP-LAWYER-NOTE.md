# INTERNAL — Liability cap drafting note (NOT for customers)

> This file lives under `_audit/`, which the delivery packer excludes. It must
> never ship in a customer package. It records the open decision for German
> counsel; the customer-facing contract (`COMMERCIAL-LICENSE.md` §8, `EULA.md` §6)
> intentionally contains only a neutral "[to be completed on execution]" blank.

## Open question for counsel (BGB §305 ff., §307)
How should the aggregate liability cap be set for a medical/industrial
de-identification tool sold to German/EU B2B customers?

- **Option A** — the limits of the Provider's Cyber/E&O insurance policy
  (a copy to be attached to the executed agreement).
- **Option B** — a multiple (3–5×) of the annual license fee.

## Why the old "12 months' fees" cap was removed
A flat "fees paid in the preceding 12 months" cap is likely disproportionate to
the risk of a de-identification tool handling medical/personal data, and may be
unenforceable as an unreasonable standard-term disadvantage (§307 BGB). Do not
restore it without written advice.

## Related (already in the v3 lawyer brief)
- Germany removed the cap on liability for personal injury in the new ProdHaftG
  (BGBl. 2026 I Nr. 321, applicable 2026-12-09); PLD 2024/2853 covers natural
  persons only — corporate customers cannot claim under it.
- Confirm whether continued subscription updates after 2026-12-09 count as
  "placing a new product on the market" (open question, no case law yet).

**Status: OPEN — awaiting written confirmation by German counsel. Fill the
contract blank only after that confirmation.**
