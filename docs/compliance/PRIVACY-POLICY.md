<!-- Issued — requires review by qualified EU/UK privacy counsel before publication. -->

# Aegis Privacy Policy

**Status:** Issued for signature · **Version:** 1.0 · **Last updated:** 2026-11-14
**Product:** Aegis — Privacy-First Local Data Cleansing Engine
**Applies to:** the self-hosted Aegis software and its operators (the "Service").

---

## 1. Who is the controller?

Aegis is a **local-first** product. In the standard deployment the software runs
entirely on infrastructure you control (your server, your machines). The
**customer** who operates an Aegis instance is the **data controller** for the
personal data processed through it; the Aegis software acts as the **processor**
on the customer's behalf. When Aegis is operated by its vendor as a managed
service, the vendor is the controller and a separate controller notice applies.

This policy explains what the *software* processes and how it is configured to
honour data-protection obligations. It is not a substitute for the customer's own
privacy notice where the customer determines the purposes of processing.

## 2. What data is processed

| Data | Where it lives | Notes |
|------|---------------|-------|
| Documents / media uploaded for cleansing | Customer's runtime volume, then an **encrypted-archive vault** | Never leaves the instance unless explicitly exported. |
| Derived hashes / manifests | Same runtime volume | Content-hash only; original bytes are not re-transmitted. |
| Operator & issuer accounts | SQLite store (`accounts`) | Hashed credentials; no plaintext passwords. |
| Audit events | SQLite store (`audit_events`, hash-chained) | Operator/system events are **tamper-evident and append-only** (see §6). |
| Optional RFC3161 timestamps | Sent to a customer-configured TSA | Only a **hash** is transmitted, never document bytes (opt-in, default off). |

Aegis does **not** phone home, does not embed third-party analytics, and ships
with **zero network egress** by default.

## 3. Legal bases (GDPR Art. 6)

- **Contract (Art. 6(1)(b))** — operating the Service you requested.
- **Legitimate interests (Art. 6(1)(f))** — security, fraud prevention, and
  maintaining the integrity of the audit trail.
- **Consent (Art. 6(1)(a))** — any optional integration (e.g. external TSA) is
  opt-in and off by default.

## 4. Data minimisation & zero-knowledge

Identity proofs (e.g. the built-in zero-knowledge identity module) are designed
to **prove attributes without revealing them**. Personal data is processed only
to the extent required for the requested operation and is not used for secondary
purposes.

## 5. International transfers

By default there are **no international transfers** — processing is local. If a
customer enables the optional RFC3161 timestamp adapter, a **hash** (not
personal data in clear) may be sent to a TSA endpoint the customer configures;
appropriate transfer mechanisms (SCCs) are the customer's responsibility.

## 6. Retention & erasure

- **Data subjects** (rooms, signers, end individuals) may exercise the right to
  erasure (GDPR Art. 17). The Service implements erasure via its data-subject
  erasure function, which deletes the subject's personal-data rows while
  retaining a redaction marker for accountability.
- **Operator / system audit events** form a **tamper-evident, append-only**
  accountability log and are **not erasable** — erasing the operator's own trail
  is refused (HTTP 403). This is a deliberate forensic-integrity control, not a
  limitation of the erasure right: it applies only to the security audit trail,
  never to data-subject records.

## 7. Security

- Encryption at rest for the vault; hash-chained audit log.
- Hashed credentials; bearer-token operator auth with TTL.
- Login throttling (per-IP and per-IP:username) to resist brute force and
  enumeration.
- No external egress without explicit opt-in.

## 8. Your rights

Access, rectification, erasure, restriction, portability, and objection
(GDPR Arts. 15–21). Exercise them through the instance operator; for a
vendor-managed instance, contact the DPO below.

## 9. Contact & DPO

**Data Protection Officer:** {{DPO_NAME}} — `{{DPO_EMAIL}}` ({{DPO_ADDRESS}}). Supervisory authority:
{{SUPERVISORY_AUTHORITY}}. For vendor-managed instances the DPO is the
point of contact for the rights below.

## 10. Retention schedule

| Data | Default retention | Trigger / legal basis |
|------|------------------|----------------------|
| Operator / issuer accounts | 30 days after deactivation, then deleted | controller policy; a redaction marker only is retained |
| Vault / encrypted-archive contents | until the operator deletes them | local volume; no automatic expiry |
| Audit events (operator/system) | 365 days rolling, then pruned | tamper-evident forensic-integrity log; **not erasable** (see §6) |
| Session tokens | TTL-bound (≤ 1 hour); auto-expire | security |
| Documents / media | removed when the operator deletes them | local processing |

## 11. Responding to your requests (GDPR Art. 12(3))

We acknowledge requests without undue delay and provide the substantive
information **within one month** of receipt (extendable by two further months for
complex requests, with notice). Requests may be submitted to the DPO (§9).
Acknowledgement template:

> **Subject:** Confirmation of receipt — data-protection request (Aegis)
> Thank you for your request received on {date}. We acknowledge it under
> GDPR Art. 12(3) and will respond substantively within one month. If we need to
> verify your identity or extend the deadline, we will contact you.

## 12. Cookies & local storage

Aegis sets **no HTTP cookies** (verified: zero `Set-Cookie` on any response). The
operator console stores strictly-necessary state only in the browser's
`sessionStorage` — e.g. `sessionStorage['aegis.issuer']` (operator session token),
the selected tab, and in-progress form state. These are not tracking cookies,
are not shared with any third party, and are cleared when the session ends.
Because no tracking or non-essential cookies are used, no cookie-consent banner
is required; this section documents the position transparently.

## 13. Deutsche Fassung (Zusammenfassung)

Diese Datenschutzerklärung gilt für die lokale Aegis-Software. Der betreibende
Kunde ist in der Regel die verantwortliche Stelle (Controller); Aegis ist
Auftragsverarbeiter. Es erfolgt **keine Datenübertragung ins Ausland** ohne
ausdrückliche Option (z. B. optionaler RFC3161-TSA, nur Hash, kein Dokument).
Betroffene haben die Rechte nach Art. 15–21 DSGVO. Eine vollständige
deutschsprachige Fassung ist vor Veröffentlichung durch die zuständige Stelle
bereitzustellen und rechtlich prüfen zu lassen.

> This document is a template. Replace placeholders, confirm the controller/processor
> posture for your deployment, and have it reviewed by qualified counsel before use.
