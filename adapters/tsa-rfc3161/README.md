# Aegis · RFC 3161 TSA Adapter (`tsa-rfc3161`)

> **This is an OPTIONAL, removable adapter. It is NOT part of the Aegis trust
> kernel. Removing this directory and the `--adapter-tsa` flag leaves Aegis fully
> functional — the hash chain, ECDH/ECDSA crypto, LAN relay, and topology render
> are untouched. The adapter only forwards a hash to an external Time-Stamp
> Authority and returns the raw token.**

EN – English
----------

### What it does
Receives a SHA-256 digest (e.g. the Aegis chain head, a FieldSeal `sealHash`, or a
C2PA result hash), sends an RFC 3161 `TimeStampReq` to a configured TSA over
HTTP/HTTPS, and returns the CMS `TimeStampToken` (base64) plus best-effort
metadata (`genTime`, `serialNumber`, `nonce`).

### Design rules (hard)
- **Forwarder only.** It never signs, never timestamps, and never verifies the
  TSA certificate chain. The token is returned **as received** — not re-signed,
  not cached, not mutated.
- **Zero third-party code.** Only Node built-ins (`node:crypto`, `node:http`,
  `node:https`). The ASN.1 DER codec is hand-rolled. No `asn1js` / `pkijs`.
- **Fails safe.** Any network error, timeout, or 4xx/5xx yields
  `{ tsaStatus: 'failed', ... }`. It never throws and never takes the Aegis
  service down.
- **No hardcoded provider.** No TSA URL, API key, or certificate is embedded.
  Operators supply them via `--tsa-config` or env vars.

### Enable / disable
```bash
# OFF (default) — Aegis behaves exactly as before
node server.js

# ON with a config file (recommended; supports multiple TSA failover entries)
node server.js --adapter-tsa on --tsa-config ./config/tsa-config.json
```

### Interface
`POST /adapter/tsa/submit` (registered only when the adapter is enabled):
```jsonc
// request
{
  "digest": "<64-char hex sha256>",
  "digestAlgorithm": "sha256",
  "tsaEndpoint": "https://freetsa.org/tsr",      // optional if config provides one
  "tsaAuth": { "type": "none" | "basic" | "token", "value": "..." },
  "requestNonce": true
}
// response (fixed schema; tsaStatus is the only discriminator)
{
  "tsaStatus": "ok" | "failed",
  "originalDigest": "<hex>",
  "timestampTokenBase64": "<CMS token, raw>",
  "tstInfo": { "genTime": "ISO", "serialNumber": "string", "nonce": "hex|null" },
  "tsaProvider": "label",
  "verifyHint": "...",
  "error": "..."   // present only on failure
}
```

### Access control (RBAC hook)
The full account/RBAC system is a separate deliverable. Today the endpoint is
open like the rest of the relay, but two optional gates exist:
- `AEGIS_ADAPTER_TOKEN` env → require `Authorization: Bearer <token>`.
- `allowRoles: ["operator","admin"]` in config → reject others via
  `X-Aegis-Role` header (so a read-only Auditor cannot submit).

### GDPR / data minimization
Aegis sends **only the digest** to the TSA — never the document, file bytes, or
any key. The TSA therefore cannot see your content, only a one-way hash. Choose
an EU/DigiCert-class provider if you need a qualified timestamp for EU matters.

### Legal disclaimer
Aegis provides an RFC 3161 timestamp *credential*. It makes **no claim** about
legal effect. Whether the timestamp is admissible, and under which qualified
certificate, is decided by your jurisdiction and the TSA provider's certificate
chain. Verify the token offline against the TSA root CA.
