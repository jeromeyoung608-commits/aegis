<!-- Issued — tune severity thresholds, comms channels and on-call roster before use. -->

# Incident Response Runbook

**Status:** Issued · **Version:** 1.0 · **Last updated:** 2026-11-14
**Product:** Aegis — Privacy-First Local Data Cleansing Engine
**Purpose:** define how the operating team detects, contains, eradicates, recovers
from, and learns from security/privacy incidents, including the GDPR 72-hour
breach-notification duty.

---

## 1. Roles

| Role | Responsibility |
|------|----------------|
| Incident Commander (IC) | owns the response, coordinates, decides severity |
| Security lead | technical containment & forensics |
| Comms / DPO | regulator, customer and internal communication |
| On-call operator | executes containment steps on the instance |

## 2. Severity classification

| Sev | Example | Response target |
|-----|---------|-----------------|
| Sev1 | Confirmed breach of operator account / issuer secret leak / data exfiltration | 1h acknowledge, 24h containment |
| Sev2 | Exploit attempted & blocked, audit-integrity alarm | 4h acknowledge |
| Sev3 | Service degradation, failed backup, /healthz red | 1 business day |
| Sev4 | Cosmetic / doc / low-risk | backlog |

## 3. Response phases

1. **Detect / Triage** — alerts from `/healthz` monitoring, audit anomalies
   (`auth_login_throttled`, `auth_login_failed` spikes), or external report.
2. **Contain** — rotate `AEGIS_ISSUER_SECRET`; disable/lock the implicated
   operator account; isolate the instance (stop `node server.js` or block port).
3. **Eradicate** — patch the vulnerable component; purge any injected artifact;
   confirm with `verify:delivery` that the deployed build matches a known-good manifest.
4. **Recover** — restore from the last known-good backup (`sqlite3 .backup` chain,
   see `DR-BACKUP.md`); bring the service back behind monitoring.
5. **Post-mortem** — blameless write-up within 5 business days; the **tamper-evident
   audit log** (`/audit/export`) is the authoritative forensic source — it cannot
   be erased (operator/system subjects are protected).

## 4. Breach notification (GDPR Art. 33/34)

- Assess whether a **personal-data breach** occurred within **24h** of detection.
- Notify the competent **supervisory authority within 72h** if required.
- Notify **affected data subjects** without undue delay when high risk to them.
- The Controller (customer operating the instance) owns the notification; the
  Processor (Aegis) assists per the DPA.

## 5. Comms

- Internal: incident channel + IC updates every 4h during Sev1/2.
- External: via DPO; never disclose forensic detail publicly.

## 6. Drills

- Quarterly tabletop; annual live restore drill (see `DR-BACKUP.md`).
- Test the throttle/alarm path by intentionally tripping `auth_login_throttled`.
