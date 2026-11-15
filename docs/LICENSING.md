# Aegis Licensing Model

## 1. Open source, Apache-2.0

Aegis is **open source**, licensed under the **Apache License 2.0** — see
[`LICENSE`](../LICENSE). Every first-party file in this repository is
Apache-2.0. You may use, modify, redistribute and sell the software, including
commercially, without paying anything and without asking permission.

The only obligations are those Apache-2.0 itself imposes:

- retain the license and attribution notices (copyright headers, `ENGINE BY
  JEROME YOUNG` footers, and the `NOTICE` file);
- state significant changes you make;
- keep Apache-2.0's patent grant and NOTICE terms intact when redistributing.

The software is free in every sense — no paid tier, no seat limit, no revenue
threshold, and no "contact sales" gate. Paid support and services are optional
(see section 3).

## 2. Why Apache-2.0 and not MIT

Apache-2.0 carries an **express patent grant (§3)**: each contributor grants a
royalty-free, irrevocable patent license for claims their contributions cover.
For a product that makes security and forensic-integrity promises, that patent
protection matters more to adopters than MIT's shorter text. A customer cannot
be sued over a patent that an Aegis contributor could have asserted.

Apache-2.0 is also **compatible with GPLv3** (its terms are GPLv3-compatible),
so Aegis can be combined into GPLv3 projects — another reason it fits an
open-source security tool better than a custom or use-restricted license.

## 3. Where the money comes from

The software is free. We charge for our **time**, as optional services:

| Service | Indicative price |
|---------|------------------|
| Deployment / integration | EUR 1,500–4,000 |
| Compliance readiness pack (SBOM / CRA evidence) | EUR 2,000–6,000 |
| SIEM integration | EUR 1,500–3,500 |
| Annual support | quoted per engagement |

A support contract is **never** a precondition for using the software. Nothing
in this repository restricts use beyond Apache-2.0 itself.

## 4. What we do not do

- We do not host customer data. Aegis runs in the customer's own environment;
  sensitive bytes stay in the browser and transport is direct P2P.
- We do not operate a SaaS offering.
- We do not promise compliance certification. Under the CRA, the manufacturer /
  integrator placing the product on the market carries the conformity
  obligations; our compliance packs are evidence material, not a certification.
