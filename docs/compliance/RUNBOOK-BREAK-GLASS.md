# Break-glass (key escrow) runbook

Aegis supports **key escrow** for "break-glass" recovery of a session/asset when the
primary holder is unavailable. This is an accountability-sensitive capability and is
audited; use it only under a documented, authorized procedure.

## When to use
- A locked session must be admitted but the operator who sealed the escrow is absent.
- A regulatory/litigation hold requires retrieving a sealed payload.

## Procedure
1. **Authorize:** obtain a second-person approval (two-operator rule). Record the
   ticket/incident ID.
2. **Deposit/retrieve:** the escrow API deposits a sealed blob under a room key; the
   recovery endpoint returns it to an authorized holder. Every deposit and retrieval
   is written to the append-only audit log (`escrow.deposit` / `escrow.retrieve`).
3. **Verify:** confirm the audit entry shows the retrieving operator, timestamp, and
   room — the audit trail is the evidence the break-glass was legitimate.
4. **Close:** after use, rotate the relevant secret (see RUNBOOK-KEY-ROTATION.md) and
   note the break-glass event in the incident record.

## Guardrails
- Escrow is **opt-in** (`gateway.escrow.enabled`); enabling
  `gateway.escrow.requireForAdmit` makes admission impossible without a deposited
  key — only turn this on when your process can actually deposit.
- The operator/system audit trail is **never erasable** (GDPR Art.17 targets data
  subjects, not accountability logs — see the B-04 hardening note in
  DELIVERY_REPORT.md). A break-glass event therefore always leaves a trace; that is
  intentional.
- Disable escrow in high-risk environments where the added recovery surface outweighs
  the availability benefit.
