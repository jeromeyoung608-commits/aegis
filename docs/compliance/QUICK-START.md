# Quick start

## 1. Install & bootstrap
```
git clone <your-registry>/aegis && cd aegis
npm run setup          # prompts for an operator account; default password = AEGIS_ISSUER_SECRET
npm start              # serves http://localhost:8080
```
Open `http://localhost:8080` in **Chrome or Edge 113+** (SharedArrayBuffer for the
WebGPU topology requires COOP/COEP, which Aegis sets).

## 2. Workbench — the seven-step closed loop
1. Select a source node in the topology. 2. Load a document. 3. Redact. 4. Sign
(hashes + signature). 5. Send. 6. Receive. 7. Verify → seal. The loop cannot go
backwards; this invariant is locked by `aegis-shell/tests/flow.test.mjs`.

## 3. Operator console — `aegis-shell/console.html`
Log in as the operator, then use the tabs:
- **Audit** — append-only audit trail (export CSV/JSON).
- **Revoke** — revocation list management.
- **Key escrow** — break-glass deposit/retrieve.
- **TSA verify** — RFC 3161 timestamp verification.
- **Compliance** — enter your real legal facts (controller, DPO, EU rep, SLA, governing
  law, authority) + upload signed ROPA/DPA/SLA/DPO letter/logo; generate filled
  templates.
- **Setup** — pre-deploy checklist (export sign-off).
- **Data subjects** — DSAR export (Art.20) + erasure (Art.17) + tombstone verify.
- **Sessions** — list/revoke operator sessions.
- **Config** — read-only config reflection + safe toggles (escrow, MFA enforce), SIEM
  forward URL, incident test, admin MFA reset, DB backup.

## 4. Pre-deploy checklist
Work through `docs/compliance/CONFIGURE-BEFORE-DEPLOY.md` (also the in-console Setup
tab). Set `AEGIS_ISSUER_SECRET` unique per environment, push the image to **your own**
registry, enable TLS via a reverse proxy, and complete the compliance facts.

## 5. Production deployment
See `deploy/` (docker-compose, Kubernetes/Helm, systemd, nginx/Caddy) and
`docs/compliance/ACR-PRIVATE-REGISTRY.md`. Never bake secrets into the image.
