<!-- Issued — requires review by qualified counsel; execute only after the DPA is signed. -->

# Aegis Standard Contractual Clauses (SCC) — International Transfer Module

**Status:** Template for signature · **Version:** 1.0 · **Last updated:** 2026-11-14
**Framework:** EU GDPR Article 46 / Commission Implementing Decision (EU) 2021/914

This module applies when personal data processed by Aegis is transferred to a
third country (including to a processor, sub-processor, or an external service
such as a Time-Stamp Authority). It is appended to the DPA and is completed by
the Controller with its qualified counsel before any such transfer is enabled.

---

## 1. Parties

- **Data exporter (Controller):** {{CONTROLLER_LEGAL_NAME}} — {{CONTROLLER_ADDRESS}} — {{CONTROLLER_REG_NO}}
- **Data importer (Processor / TSA / sub-processor):** _to be completed per transfer_

## 2. Transfer details

- **Purpose of the transfer:** {{ROPA_PURPOSE}}
- **Categories of data transferred:** document hashes/manifests; operator account
  metadata; and, where the Controller enables an external TSA, the one-way hash
  submitted for timestamping. No document plaintext leaves the Aegis instance by
  default (`gateway.externalTsa.enabled=false`).
- **Recipients in the third country:** {{ROPA_RECIPIENTS}}
- **Legal basis for the transfer (Art. 46):** Standard Contractual Clauses (this
  module) + supplementary measures (encryption in transit, minimisation to hash-only)

## 3. Module selection (Art. 2021/914)

- [ ] **Module One** — Controller → Processor
- [ ] **Module Two** — Processor → Processor (sub-processing)
- [ ] **Module Three** — Controller → Controller

## 4. Supplementary measures

- Encryption in transit (TLS 1.2+); outbound transfers disabled by default.
- Data minimisation: only non-reversible hashes are transmitted to a TSA.
- Transparency: every transfer is recorded in the server audit log.

## 5. Docking point

The SCC is only relevant if the Controller enables a cross-border flow. The Aegis
factory gate (§compliance status) does **not** block on SCC completion, because
Aegis ships with all egress disabled; SCC completion is the Controller's
responsibility and is evidenced here for the supervisory authority.

---

_Completed SCC to be signed by both parties and retained by the Controller._
