// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// adapters/tsa-rfc3161/schema.js — fixed input/output contract for the TSA adapter.
//
// The output shape is STABLE: callers (the Aegis audit chain, FieldSeal manifest
// extension) store this verbatim. `tsaStatus` is the only discriminator; on
// failure the same shape is returned with `error` set and token fields null.
export function validateInput(input) {
  if (!input || typeof input !== 'object') return { ok: false, error: 'payload must be an object' };
  const digest = input.digest;
  if (typeof digest !== 'string' || !/^[0-9a-fA-F]{64}$/.test(digest)) {
    return { ok: false, error: 'digest must be a 64-char hex sha-256' };
  }
  const algo = input.digestAlgorithm || 'sha256';
  if (algo !== 'sha256') return { ok: false, error: 'only sha256 supported' };
  if (input.tsaEndpoint != null && typeof input.tsaEndpoint !== 'string') {
    return { ok: false, error: 'tsaEndpoint must be a string url' };
  }
  if (input.tsaAuth != null) {
    if (typeof input.tsaAuth !== 'object' || !['none', 'basic', 'token'].includes(input.tsaAuth.type)) {
      return { ok: false, error: 'tsaAuth.type must be none|basic|token' };
    }
  }
  if (input.requestNonce != null && typeof input.requestNonce !== 'boolean') {
    return { ok: false, error: 'requestNonce must be boolean' };
  }
  return {
    ok: true,
    value: {
      digest: digest.toLowerCase(),
      digestAlgorithm: algo,
      tsaEndpoint: input.tsaEndpoint || null,
      tsaAuth: input.tsaAuth || { type: 'none' },
      requestNonce: input.requestNonce !== false,
    },
  };
}

const VERIFY_HINT =
  'RFC 3161 TimeStampToken returned as-is; Aegis does NOT verify the TSA certificate ' +
  'chain. Verify offline against the TSA root CA. Legal weight depends on your ' +
  'jurisdiction and the TSA provider’s qualified certificate.';

export function buildOutput(fields = {}) {
  const t = fields.tstInfo || {};
  return {
    tsaStatus: fields.tsaStatus || 'failed',
    originalDigest: fields.originalDigest || null,
    timestampTokenBase64: fields.timestampTokenBase64 || null,
    tstInfo: {
      genTime: t.genTime || null,
      serialNumber: t.serialNumber || null,
      nonce: t.nonce || null,
    },
    tsaProvider: fields.tsaProvider || null,
    verifyHint: VERIFY_HINT,
    ...(fields.error ? { error: fields.error } : {}),
  };
}
