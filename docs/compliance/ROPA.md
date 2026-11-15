<!-- Issued — maintain under GDPR Art. 30; fill controller identity before use. -->

# Records of Processing Activities (ROPA)

**Status:** Issued · **Version:** 1.0 · **Last updated:** 2026-11-14
**Basis:** GDPR Article 30 · **Controller:** {{CONTROLLER_LEGAL_NAME}} — {{CONTROLLER_ADDRESS}} — {{CONTROLLER_REG_NO}}

This record covers processing performed by the Aegis local data-cleansing
Service. One row per processing activity.

---

## Processing activity register (Art. 30 — structured)

| Processing activity | Purpose | Retention | Recipients | Legal basis |
| --- | --- | --- | --- | --- |
| Aegis core service | {{ROPA_PURPOSE}} | {{ROPA_RETENTION}} | {{ROPA_RECIPIENTS}} | {{ROPA_LEGAL_BASIS}} |

> The four columns above are the structured minimum the supervisory authority
> expects. Fill them via the Operator Console (Compliance → ROPA section); until
> they are set, the factory gate blocks issuing the filled ROPA (HTTP 409 +
> `X-Aegis-Compliance: not-ready`).

---

## Activity A — Document cleansing & hashing

- **Purposes:** remove sensitive attributes from documents; compute integrity
  hashes/manifests.
- **Categories of data subjects:** individuals appearing in customer documents.
- **Categories of personal data:** document contents; derived hashes/manifests.
- **Recipients:** none by default (local processing).
- **Transfers:** none (opt-in TSA sends hash only).
- **Retention:** per Controller policy; erasable on request.
- **Transfer basis:** none — local processing; the only optional cross-border flow is the TSA hash (Controller responsibility, SCCs).
- **Security:** encryption at rest; zero default egress.

## Activity B — Operator authentication & access

- **Purposes:** authenticate operators/issuers; authorise actions.
- **Categories of data subjects:** customer staff (operators).
- **Categories of personal data:** account identifiers; hashed credentials;
  session tokens.
- **Recipients:** none external.
- **Transfers:** none.
- **Retention:** accounts retained per policy; sessions TTL-bound.
- **Transfer basis:** none — local processing.
- **Security:** credential hashing; bearer auth with TTL; login throttling.

## Activity C — Audit & accountability logging

- **Purposes:** maintain a tamper-evident, hash-chained accountability trail.
- **Categories of data subjects:** operators (as actors in audit events).
- **Categories of personal data:** action metadata, remote address, subject.
- **Recipients:** Controller (via `/audit/export`).
- **Transfers:** none.
- **Retention:** rolling; **operator/system events are tamper-evident and
  append-only, and not erasable** (forensic-integrity control).
- **Transfer basis:** none — local processing.
- **Security:** hash-chained log; export gated by operator scope.

## Activity D — Optional RFC3161 timestamping (opt-in)

- **Purposes:** bind cleansed artifacts to a trusted timestamp.
- **Categories of personal data:** none in clear — only a **hash** is sent.
- **Recipients:** customer-configured TSA endpoint.
- **Transfers:** to the configured TSA (customer responsibility for SCCs).
- **Retention:** timestamp receipt stored with the artifact.
- **Transfer basis:** to the configured TSA only (customer responsibility, SCCs).
- **Security:** outbound disabled by default (`gateway.externalTsa.enabled=false`).

---

_Completed ROPA to be signed by the Controller's DPO and kept available to the
supervisory authority._
