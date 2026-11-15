<!-- Issued — requires review by qualified counsel; tailor to the signed commercial terms. -->

# Aegis Data Processing Agreement (DPA)

**Status:** Issued for signature · **Version:** 1.0 · **Last updated:** 2026-11-14
**Framework:** EU GDPR Article 28(3) / UK GDPR

This DPA is entered into between the **Controller** (the customer operating an
Aegis instance) and the **Processor** (the Aegis software / vendor) and governs
processing performed when the customer uses Aegis to process personal data.

---

## 1. Subject matter & duration

The subject matter is the provision of the Aegis local data-cleansing Service.
Processing occurs for the duration of the engagement and for any retention period
required by the Controller or law.

## 2. Nature, purpose & types of processing

- **Nature/purpose:** local cleansing, hashing, signing, vaulting and audit of
  customer-supplied documents/media.
- **Types of personal data:** document contents, derived hashes/manifests,
  operator account data, and audit metadata.
- **Categories of data subjects:** the Controller's staff (operators), and any
  individuals appearing in customer-supplied documents.
- **Special-category data:** none processed by the software by design; the
  Controller is responsible for any special-category data it chooses to upload.

## 3. Controller obligations

Determine the purposes and means of processing; ensure a lawful basis; provide
only data lawfully obtained; configure optional integrations (e.g. TSA) in line
with transfer requirements.

## 4. Processor obligations

1. **Confidentiality** — access limited to those with a need to know.
2. **Security** — implement appropriate technical/organisational measures
   (encryption at rest, hash-chained audit, credential hashing, login throttling,
   no default egress).
3. **Sub-processing** — the software has **no mandatory sub-processors**; any
   optional external TSA is customer-configured and customer-controlled.
4. **Audit** — the Processor maintains a tamper-evident, hash-chained audit log the
   Controller can export for verification (`/audit/export`).
5. **Breach notification (Art. 33/34)** — the Processor shall notify the
   Controller **without delay and in any event within 24 hours** of becoming aware
   of a personal-data breach, enabling the Controller to meet its own 72-hour
   supervisory-authority notification duty under GDPR Art. 33.
6. **Deletion / return** — on termination, the Controller's data resides in its
   own runtime volume and is removed per the Controller's retention policy; the
   Processor's immutability control applies only to the security audit trail.
7. **Assistance** — the Processor assists the Controller with data-subject
   requests and Article 32–36 obligations to the extent technically feasible.

## 5. International transfers

No transfers occur by default. Where the Controller enables an optional TSA, the
Controller is responsible for a lawful transfer mechanism (e.g. SCCs) for any
hash transmitted.

## 6. Records & evidence

The Service provides `GET /audit` and `GET /audit/export` for the Controller's
records, and a `GET /healthz` probe for availability monitoring.

## 7. Governing law

As agreed in the principal commercial agreement; this template references the GDPR
as the baseline.

---

## Annex 1 — Technical & Organisational Measures (Art. 32)

| Measure | Implementation evidence (Aegis source) |
|---------|------------------------------------------|
| Encryption at rest | encrypted-archive vault (AES-GCM); TLS key material in `~/.aegis/tls` |
| Credential hashing | `server/store.js` — `crypto.scrypt` key derivation (per-salt, N=16384) |
| Access control | bearer-token operator auth with TTL; operator/admin scope separation |
| Login throttling | `server.js` — per-IP and per-IP:username fixed-window rate limits + per-IP enumeration guard |
| Audit integrity | hash-chained, tamper-evident `audit_events`; export via `/audit/export` |
| Network minimisation | zero default egress; verified by `npm run verify:zero-deps` |
| Key management | issuer secret mints session tokens; rotated by the Controller |

## Annex 2 — Sub-processors (Art. 28(2))

None mandatory. The only optional external integration is a customer-configured
RFC3161 TSA (sends a **hash only**); the customer is the controller of that
transfer and responsible for the transfer mechanism (e.g. SCCs).

## Annex 3 — Personal-data breach procedure (Art. 33/34)

1. Detect & contain (rotate issuer secret; isolate the instance).
2. Notify the Controller **within 24 hours**.
3. Assist the Controller's 72-hour supervisory-authority notification.
4. Post-incident review; the tamper-evident audit log is the forensic source.

## Annex 4 — Deletion & return (Art. 28(3)(g))

On termination, the Controller's data resides in its own runtime volume and is
removed per the Controller's retention policy. The Processor's tamper-evident
audit trail is retained for accountability and is not deleted.

## Signature

| Controller | Processor (Aegis) |
|-----------|-------------------|
| Name / entity: {{CONTROLLER_LEGAL_NAME}} | Name / entity: Aegis (Jerome Young) |
| Authorised signatory: ______ | Authorised signatory: ______ |
| Date: ______________________ | Date: ______________________ |

> NOTE: governing law: {{GOVERNING_LAW}}; counsel confirm before signature.
