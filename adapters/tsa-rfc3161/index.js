// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
// adapters/tsa-rfc3161/index.js — adapter entry point.
//
// Thin, optional integration seam. It forwards a digest to an external RFC 3161
// TSA and returns the raw token + best-effort metadata. It NEVER throws: every
// error path yields { tsaStatus: 'failed', ... } so the Aegis hash chain and the
// rest of the workbench keep running if the TSA is unreachable or misconfigured.
//
// This module is deliberately separated from the kernel (crypto / hash-chain /
// audit / signaling). Removing this directory and the --adapter-tsa flag leaves
// Aegis fully functional — the kernel is untouched.
import { defaultConfig } from './config-default.js';
import { validateInput, buildOutput } from './schema.js';
import { requestTimestamp, parseTimeStampToken } from './rfc3161-client.js';
import { verifyTimestampToken } from './verify.js';

export { defaultConfig };

function mergeConfig(base, override) {
  if (!override || typeof override !== 'object') return { ...base };
  return {
    ...base,
    ...override,
    endpoints: Array.isArray(override.endpoints) ? override.endpoints : base.endpoints,
    allowRoles: Array.isArray(override.allowRoles) ? override.allowRoles : base.allowRoles,
    allowHosts: Array.isArray(override.allowHosts) ? override.allowHosts : base.allowHosts,
  };
}

export function createTsaAdapter(config = {}) {
  const cfg = mergeConfig(defaultConfig, config);

  // Optional access gate. Full multi-account RBAC is a separate deliverable; this
  // is a deployable stop-gap: a shared bearer token and/or a role header.
  function checkAccess(req) {
    const token = process.env.AEGIS_ADAPTER_TOKEN;
    if (token) {
      const auth = req.headers['authorization'] || '';
      if (auth !== 'Bearer ' + token) return { ok: false, status: 401, error: 'unauthorized' };
    }
    if (Array.isArray(cfg.allowRoles) && cfg.allowRoles.length) {
      const role = (req.headers['x-aegis-role'] || '').toLowerCase();
      if (!cfg.allowRoles.includes(role)) {
        return { ok: false, status: 403, error: 'role not permitted (need one of: ' + cfg.allowRoles.join(', ') + ')' };
      }
    }
    return { ok: true };
  }

  const PRIVATE_V4 = [/^127\./, /^10\./, /^192\.168\./, /^169\.254\./, /^0\./, /^172\.(1[6-9]|2\d|3[01])\./];

  function isPrivateHost(hostname) {
    const h = String(hostname || '').replace(/^\[|\]$/g, '').toLowerCase();
    if (!h) return true; // fail closed on an unparseable/empty host
    if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local')) return true;
    if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return true;
    return PRIVATE_V4.some((re) => re.test(h));
  }

  function endpointAllowed(raw) {
    let u;
    try { u = new URL(raw); } catch { return { ok: false, reason: 'bad endpoint url' }; }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return { ok: false, reason: 'unsupported scheme' };
    if (cfg.allowHosts.length && !cfg.allowHosts.includes(u.hostname)) {
      return { ok: false, reason: 'host not in allowHosts' };
    }
    if (!cfg.allowPrivateHosts && isPrivateHost(u.hostname)) {
      return { ok: false, reason: 'private/loopback host blocked' };
    }
    return { ok: true };
  }

  function resolveEndpoint(input) {
    // The request body may only SELECT an operator-configured endpoint, never
    // supply a URL. Configuring an in-house TSA is an operator decision.
    if (cfg.allowClientEndpoint && input && typeof input.tsaEndpoint === 'string' && input.tsaEndpoint) {
      return { url: input.tsaEndpoint, auth: input.tsaAuth || { type: 'none' } };
    }
    if (input && Number.isInteger(input.endpointIndex) && cfg.endpoints[input.endpointIndex]) {
      return cfg.endpoints[input.endpointIndex];
    }
    if (cfg.endpoints && cfg.endpoints.length) return cfg.endpoints[0];
    return null;
  }

  async function submit(input) {
    const v = validateInput(input);
    if (!v.ok) {
      return buildOutput({ tsaStatus: 'failed', originalDigest: (input && input.digest) || null, error: v.error });
    }
    const ep = resolveEndpoint(v.value);
    if (!ep) {
      return buildOutput({ tsaStatus: 'failed', originalDigest: v.value.digest, error: 'no TSA endpoint configured' });
    }
    const allowed = endpointAllowed(ep.url);
    if (!allowed.ok) {
      return buildOutput({ tsaStatus: 'failed', originalDigest: v.value.digest, error: allowed.reason, tsaProvider: cfg.provider });
    }
    try {
      const resp = await requestTimestamp({
        digest: v.value.digest,
        endpoint: ep.url,
        auth: ep.auth || { type: 'none' },
        timeoutMs: cfg.timeoutMs,
      });
      if (!resp.ok) {
        return buildOutput({ tsaStatus: 'failed', originalDigest: v.value.digest, error: resp.error, tsaProvider: cfg.provider });
      }
      let tstInfo = {};
      try { tstInfo = parseTimeStampToken(resp.token); }
      catch (e) { tstInfo = { parseError: String((e && e.message) || e) }; }
      const tokenB64 = resp.token.toString('base64');
      const out = buildOutput({
        tsaStatus: 'ok',
        originalDigest: v.value.digest,
        timestampTokenBase64: tokenB64,
        tstInfo,
        tsaProvider: cfg.provider,
      });
      out.verification = (cfg.trustStore && cfg.trustStore.length)
        ? verifyTimestampToken(resp.token, { trustStore: cfg.trustStore, expectedDigest: v.value.digest })
        : { verified: 'skipped', reason: 'no trust store configured' };
      return out;
    } catch (e) {
      return buildOutput({ tsaStatus: 'failed', originalDigest: v.value.digest, error: String((e && e.message) || e), tsaProvider: cfg.provider });
    }
  }

  // Standalone verification (P3): given a token + expected digest, validate the
  // signature, message imprint, and X.509 chain against the configured trust store.
  function verify(tokenBase64, expectedDigestHex) {
    if (!cfg.trustStore || !cfg.trustStore.length) {
      return { verified: 'skipped', reason: 'no trust store configured' };
    }
    try {
      return verifyTimestampToken(Buffer.from(String(tokenBase64), 'base64'), {
        trustStore: cfg.trustStore || [],
        expectedDigest: expectedDigestHex,
      });
    } catch (e) {
      return { verified: false, issues: [String((e && e.message) || e)] };
    }
  }

  return { submit, checkAccess, verify, config: cfg };
}
