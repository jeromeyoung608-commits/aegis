# Aegis Licensing Model

> Commercial-structure guidance, not legal advice. Have a qualified EU attorney
> review the license, EULA and liability limits before you sell.

## TL;DR

Aegis is **source-available**, not open source. It is licensed under the
**Business Source License 1.1 (BSL-1.1)** with an **Aegis Commercial License**
as the paid alternative for production / commercial use.

- **Free tier (no payment):** BSL-1.1 allows non-production use (evaluation,
  development, testing, training) and **production use by organizations with
  fewer than 10 employees AND annual revenue below EUR 2,000,000**.
- **Paid tier:** the Aegis Commercial License removes the production-use
  restriction and adds support, SLA, liability coverage and enterprise features
  (see `EULA.md` and `PRICING.md`).
- **Change Date `2030-11-15`:** each version's BSL-1.1 grant converts to
  Apache-2.0 four years after that version's first publication, so old versions
  eventually become free for everyone.

## Why BSL and not AGPL / MIT / closed source

| Option | Verdict for Aegis |
|--------|-------------------|
| MIT (old) | Rejected — permits free commercial reuse and dropping attribution; cannot fund development. |
| AGPL-3.0 | Rejected as the backbone — its copyleft only bites *distribution / network service*; a German factory or hospital running Aegis **on an internal network** is not obligated to pay or publish. It cannot enforce "continue to use → must pay". |
| Closed source + EULA | Possible, but forgoes the GitHub star funnel and the "anyone can read the code" trust signal that sells to security-conscious EU buyers. |
| **BSL-1.1 + Commercial** | **Chosen.** Source stays visible (GitHub stars + trust) while a *use restriction* — not distribution — makes internal-network production use require a paid license. This is the only option that makes "continue to use → must pay" legally real for the actual customer base. |

## How a customer obtains a license

1. Evaluate freely under the BSL-1.1 free tier (non-production, or small-org production).
2. For production beyond the free tier, purchase an Aegis Commercial License
   (see `PRICING.md` tiers: Starter / Business / Enterprise).
3. You receive:
   - a signed **commercial license** (PDF), and
   - an **offline license file** (`license.json`) — an ECDSA-signed document
     binding the customer id, seat count, expiry, and enabled feature bits.

## Offline activation (air-gapped friendly)

Enterprise customers — hospitals, factories — are frequently **air-gapped**
(physically isolated, never on the public internet). Aegis therefore uses
**offline signed license files**, not phone-home activation:

- The author issues `license.json` signed with the author's ECDSA private key.
- The customer imports the file into their Aegis deployment; the client verifies
  the signature locally against the embedded public key. **No network call occurs.**
- An optional "refresh every 90 days" check is a value-add, never a requirement.

This reuses Aegis's existing ECDSA signing capability — zero new dependencies.

> Note: an offline license file cannot technically enforce seat counts (a single
> licensed copy could be copied across machines inside an organization). That is
> mitigated contractually via the audit clause in `COMMERCIAL-LICENSE.md` §5 and
> the fact that regulated orgs self-report. This is consistent with how most
> BSL software is operated.

## Enterprise modules and the derivative-works boundary (P0 — architecture rule)

BSL-1.1 states that "all copies of the original and modified Licensed Work, and
**derivative works** of the Licensed Work, are subject to this License", and that
the license "applies **separately for each version**". Therefore any paid
enterprise feature that is judged a derivative of the core would (a) be bound by
BSL even for a paying customer, and (b) convert to the Change License (Apache-2.0)
at its Change Date — i.e. **the paid feature would become free**. This boundary is
a release blocker, not a nice-to-have.

Enterprise functionality (TSA timestamping, SIEM export, HSM/PKCS#11, centralized
management, compliance reporting) MUST be isolated so it is not a derivative work:

- ❌ **Derivative** — imports core source, shares a source directory, modifies core
  files before packaging, statically links core logic at build time.
- ✅ **Non-derivative** — an independent process/service that talks to the core only
  over an HTTP / WebSocket / CLI boundary, contains no fragments of core source,
  and lives in its own repository or its own directory with its own copyright
  header and its own license.

Keep an entitlement boundary in `docs/LICENSING.md` and verify in CI that no
core source path appears inside an enterprise-module directory. Attorneys should
confirm the process/API boundary is sufficient to avoid derivative-work status.

## SPDX headers

Every first-party source file carries both:

```
// Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
```

(CSS uses `/* … */`, HTML uses `<!-- … -->` comments.) `BUSL-1.1` is the official
SPDX identifier for the Business Source License 1.1 (`BSL-1.0` is the unrelated
Boost license). Enforced by `scripts/verify-licensing.mjs`, wired into `npm test`.
