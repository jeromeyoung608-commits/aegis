# Configure before deploy — operator-supplied facts

> **Scope.** This is the single checklist for every fact Aegis asks the **deploying
> controller** (you) to provide. Nothing here is shipped pre-filled and Aegis never
> fabricates legal facts. The product provides a real entry point — the **Operator
> Console → Compliance** tab — plus fill-in tokens in the compliance templates. Fill
> them with your real legal entity before going to production / answering a GDPR
> Article 30 / DPA request.

## 1. Two ways to supply the facts

| Method | Best for | Where |
|---|---|---|
| **Operator Console → Compliance tab** (recommended) | Day-to-day entry, persistence, signed-doc upload, one-click "filled" template generation | `/aegis-shell/console.html`, log in as an **operator**, open the **Compliance** tab |
| **Edit the templates directly** | White-label / legal review of the raw markdown | `docs/compliance/ROPA.md`, `PRIVACY-POLICY.md`, `DPA.md`, `SLA.md` |

The console writes to `data/compliance/legal.json` and uploaded documents to
`data/compliance/files/` — a runtime volume that is **never served statically**
(`config` / `data` / `server` top-level dirs are denied) and **never shipped**
(`data/` is excluded from the delivery package). So no operator fact or secret
leaves your deployment (B-03 class).

## 2. Pre-deploy checklist

| # | Item | Console field | Template token | Template file | Example | Required |
|---|---|---|---|---|---|---|
| 1 | Controller legal name | Controller → Legal name | `{{CONTROLLER_LEGAL_NAME}}` | `ROPA.md` (line 6), `DPA.md` | Acme GmbH | **Yes** |
| 2 | Controller registered address | Controller → Registered address | `{{CONTROLLER_ADDRESS}}` | `ROPA.md` (line 6) | Hauptstr. 1, 10117 Berlin, DE | **Yes** |
| 3 | Company registration no. | Controller → Company registration no. | `{{CONTROLLER_REG_NO}}` | `ROPA.md` (line 6) | HRB 123456 | Recommended |
| 4 | DPO name | DPO → DPO name | `{{DPO_NAME}}` | `PRIVACY-POLICY.md` (§9), `DPA.md` | Jane Doe | If a DPO is appointed |
| 5 | DPO email | DPO → DPO email | `{{DPO_EMAIL}}` | `PRIVACY-POLICY.md` (§9) | dpo@acme.example | If a DPO is appointed |
| 6 | DPO postal address | DPO → DPO postal address | `{{DPO_ADDRESS}}` | `PRIVACY-POLICY.md` (§9) | c/o Acme, … | If a DPO is appointed |
| 7 | EU representative (GDPR Art.27) | EU representative → Representative name | `{{EU_REP_NAME}}` | referenced in ROPA / Privacy Policy | Acme EU Rep Ltd | If no EU establishment |
| 8 | EU representative address | EU representative → Representative address | `{{EU_REP_ADDRESS}}` | referenced in ROPA / Privacy Policy | … | If no EU establishment |
| 9 | SLA contact mailbox | SLA & legal → SLA contact mailbox | `{{SLA_MAILBOX}}` | `SLA.md` (§0) | ops@acme.example | **Yes** |
| 10 | Operator timezone | SLA & legal → Operator timezone | `{{SLA_TIMEZONE}}` | `SLA.md` (§0) | Europe/Berlin (UTC+1/+2) | **Yes** |
| 11 | Governing law | SLA & legal → Governing law | `{{GOVERNING_LAW}}` | `DPA.md` | Laws of Germany | **Yes** |
| 12 | Supervisory authority | SLA & legal → Supervisory authority | `{{SUPERVISORY_AUTHORITY}}` | `PRIVACY-POLICY.md` (§9) | Berliner Beauftragte für Datenschutz | **Yes** |
| 13 | RFC 3161 TSA endpoint (optional) | Optional — TSA gateway → RFC 3161 TSA endpoint | `{{TSA_ENDPOINT}}` | (runtime config) | https://tsa.example/timestamp | Optional |
| 14 | Signed ROPA / DPA / SLA, DPO appointment, logo | Compliance → Upload document | — | stored server-side, listed in console | ROPA-signed.pdf | Recommended |

**If a field is left blank, the generated template shows a visible
`[ … — to be completed ]` marker** instead of fake data, so an incomplete
document is never mistaken for a finished one.

## 2b. Security-relevant environment variables

Set these on the server process (or as container/env secrets). They are never
stored in `config/local.json` and never shipped.

| Variable | Purpose | Default | Notes |
|---|---|---|---|
| `AEGIS_ISSUER_SECRET` | Operator auth + the issuer secret that signs session/room tokens | _(empty)_ | **Required in any shared deployment.** Without it, `/session` is locked (no token can be minted). Generate out-of-band; pass as a secret, never bake into the image. |
| `AEGIS_METRICS_TOKEN` | Gates `/metrics` (Prometheus scrape) | _(unset)_ | **Metrics are fail-closed.** Until this is set, `GET /metrics` returns `401`. Once set, scrape with `Authorization: Bearer <token>` or `?token=<token>`. Only enable behind your reverse proxy's ACL — it discloses uptime, audit-event count, and active-session count. |
| `AEGIS_TRUSTED_LAN` | Relaxes `/session` admission for lab use | `0` | Set `1` **only on an isolated localhost lab**. Never on a shared/production network — it disables the operator-credential gate. |
| `AEGIS_DB` | SQLite path | `data/aegis.db` | Mount as a volume so it survives restarts. |
| `PORT` | Listen port | `8080` (Docker `8099`) | The server binds to **all interfaces** by default — place it behind a reverse proxy (see `SECURITY.md`). |
| `AEGIS_TLS_DIR` | Optional PEM key/cert for HTTPS | `~/.aegis/tls` | If `key.pem`+`cert.pem` exist there, the server serves HTTPS (safe for cross-machine LAN). |
| `AEGIS_MFA_MODE` / `AEGIS_MFA_KEY` | Operator MFA (`totp`/`webauthn`) | `off` | Enable for production operator accounts. |
| `AEGIS_AUTH_MODE` / `AEGIS_OIDC_*` | External IdP (OIDC) | `local` | Optional SSO for operators. |
| `AEGIS_SCIM_TOKEN` | SCIM 2.0 provisioning token | _(empty)_ | Only if automated account provisioning is used. |
| `AEGIS_RATE_LIMIT` | Per-IP request-rate cap | `0` (off) | Set a positive value to throttle abuse. |

## 3. Using the Operator Console (recommended path)

1. Open `/aegis-shell/console.html` and log in as an **operator** (operator accounts
   are created by `npm run setup`; the default password equals the configured issuer
   secret until changed).
2. Open the **Compliance** tab.
3. Fill items 1–13 above, then click **Save facts**.
4. Under **Upload filled compliance documents**, choose a file, pick its kind
   (ROPA / DPA / SLA / DPO-appointment / Logo / Other), and click **Upload**.
   Uploaded files appear in the table with **download** / **delete** controls.
5. Under **Generate filled templates**, click **Download filled ROPA / DPA / SLA /
   Privacy Policy** — each downloads the template with your facts substituted into
   the `{{TOKEN}}` placeholders. Hand these to legal/customers.

### API (same authentication as the console)
All require an operator session or the issuer secret.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/compliance` | GET / PUT | read / write the facts object |
| `/api/compliance/files` | GET | list uploaded documents |
| `/api/compliance/upload` | POST | upload a base64 document (≤ 9 MB) |
| `/api/compliance/file/:id` | GET / DELETE | retrieve / remove an uploaded document |
| `/api/compliance/doc/<ROPA\|PRIVACY-POLICY\|DPA\|SLA\|SCC\|DPIA>` | GET | download the token-filled template (blocked by the factory gate until facts are complete; an uploaded signed copy of the same `kind` also lifts it) |
| `/api/compliance/template/<ROPA\|…>` | GET | download the **blank, unfilled** template (`{{TOKEN}}` placeholders, `TEMPLATE — UNFILLED` footer) — always available, bypasses the gate |
| `/api/compliance/status` | GET | readiness probe: which required facts are still missing |
| `/metrics` | GET | Prometheus scrape — **fail-closed**; requires `AEGIS_METRICS_TOKEN` (see §2b) |

## 4. Token reference (for direct template editing)

If you edit `docs/compliance/*.md` by hand instead of using the console, replace these
tokens with your real values:

```
{{CONTROLLER_LEGAL_NAME}}   Controller legal name
{{CONTROLLER_ADDRESS}}      Controller registered address
{{CONTROLLER_REG_NO}}       Company registration number
{{DPO_NAME}}                Data Protection Officer name
{{DPO_EMAIL}}               Data Protection Officer email
{{DPO_ADDRESS}}             Data Protection Officer postal address
{{EU_REP_NAME}}             EU representative name (GDPR Art.27)
{{EU_REP_ADDRESS}}          EU representative address
{{SLA_MAILBOX}}             SLA contact mailbox
{{SLA_TIMEZONE}}            Operator timezone
{{GOVERNING_LAW}}           Governing law of the DPA
{{SUPERVISORY_AUTHORITY}}   Lead EU/UK supervisory authority
{{TSA_ENDPOINT}}            Optional RFC 3161 TSA endpoint
```

## 5. Sign-off

- [ ] Items 1, 2, 9, 10, 11, 12 completed (controller identity, SLA, governing law, authority)
- [ ] DPO details (4–6) completed or explicitly "not appointed"
- [ ] EU representative (7–8) completed **or** confirmed not required (EU establishment exists)
- [ ] Signed ROPA / DPA / SLA uploaded (item 14) where contractually required
- [ ] "Download filled" documents generated and reviewed by counsel
- [ ] `AUTH_JWT_SECRET` / issuer secret set to a unique value per environment (never the dev default)
- [ ] Deployment image pushed to **your own** registry with secrets supplied via env/secret, not baked in (see `ACR-PRIVATE-REGISTRY.md`)
