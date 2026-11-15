// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
// adapters/tsa-rfc3161/config-default.js — default (disabled) adapter configuration.
//
// The adapter is OFF by default and ships with no provider. Operators supply their
// own TSA endpoint(s) via --tsa-config <file> or the AEGIS_TSA_* env vars. No
// TSA vendor URL, API key, or certificate is ever hardcoded here.
export const defaultConfig = {
  enabled: false, // mirrored by the --adapter-tsa on/off relay flag
  provider: 'unset', // human label for the configured TSA (e.g. "FreeTSA", "DigiCert")
  timeoutMs: 10000, // per-request timeout to an external TSA
  requestNonce: true, // send a nonce to defend against replay
  // Optional RBAC hook (full account system is a separate deliverable). When empty,
  // the endpoint is open like the rest of the relay today. Set to e.g.
  // ['operator','admin'] to reject Auditor (read-only) submissions via X-Aegis-Role.
  allowRoles: [],
  // Egress policy. A caller must never be able to point this adapter at an
  // arbitrary host: that turns "submit a digest" into a server-side request
  // forgery primitive (169.254.169.254, 127.0.0.1 admin ports, LAN scanners).
  allowClientEndpoint: false, // true ONLY for a controlled in-house TSA deployment
  allowPrivateHosts: false,   // loopback/RFC1918/link-local are refused by default
  allowHosts: [],             // when non-empty, hostname must match exactly
  // Ordered failover list. Inputs may only select an INDEX of this list.
  // auth.type: 'none' | 'basic' (value "user:pass") | 'token' (value = bearer).
  endpoints: [],
  // Trust store for X.509 chain verification of returned RFC 3161 tokens (P3). Each
  // entry is a PEM or DER of a trusted TSA root CA. With this set, returned tokens
  // are verified (signature + message imprint + chain-to-trust-root + validity).
  // Without it, verification is skipped and `verification` reports 'skipped'.
  trustStore: [],
};

export default defaultConfig;
