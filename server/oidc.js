// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// server/oidc.js — zero-dependency OpenID Connect helper for Aegis.
//
// Implements just enough of OIDC to close the SSO loop with NO external library:
// discovery, authorization-code token exchange, JWKS fetch, and RS256 id_token
// verification (node:crypto only). It is opt-in — server.js wires it up only when
// AEGIS_AUTH_MODE=oidc + AEGIS_OIDC_ISSUER/CLIENT_ID are configured.
import crypto from 'node:crypto';

function b64urlToBuf(s) {
  const t = String(s).replace(/-/g, '+').replace(/_/g, '/');
  const pad = t.length % 4 ? '='.repeat(4 - (t.length % 4)) : '';
  return Buffer.from(t + pad, 'base64');
}
function b64urlDecode(s) { return b64urlToBuf(s).toString('utf8'); }

// Fetch the IdP's OpenID Connect discovery document.
export async function discover(issuer) {
  const res = await fetch(`${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`discovery failed: ${res.status}`);
  return res.json();
}

// Exchange the authorization code for tokens at the token endpoint. Confidential
// clients authenticate with HTTP Basic; public clients pass client_id in body.
export async function exchangeCode(tokenEndpoint, { clientId, clientSecret, code, redirectUri, codeVerifier }) {
  const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri });
  if (codeVerifier) body.set('code_verifier', codeVerifier);
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };
  const opts = { method: 'POST', headers, body };
  if (clientSecret) {
    headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
  } else {
    body.set('client_id', clientId);
  }
  const res = await fetch(tokenEndpoint, opts);
  if (!res.ok) throw new Error(`token exchange failed: ${res.status}`);
  return res.json();
}

// Fetch the IdP's JWKS (signing keys for id_token).
export async function fetchJwks(jwksUri) {
  const res = await fetch(jwksUri, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`jwks failed: ${res.status}`);
  return res.json();
}

// Verify an RS256 id_token and its standard claims. Returns the decoded payload,
// or throws with a specific reason (signature / iss / aud / exp / nonce).
export function verifyIdToken(idToken, { issuer, clientId, nonce, jwks, clockSkewSeconds = 60 }) {
  if (!jwks || !Array.isArray(jwks.keys)) throw new Error('jwks required for verification');
  const parts = String(idToken).split('.');
  if (parts.length !== 3) throw new Error('malformed id_token');
  const header = JSON.parse(b64urlDecode(parts[0]));
  const payload = JSON.parse(b64urlDecode(parts[1]));
  const sig = b64urlToBuf(parts[2]);
  if (header.alg !== 'RS256') throw new Error(`unexpected alg ${header.alg}`);
  const jwk = jwks.keys.find((k) => k.kid && k.kid === header.kid) || jwks.keys.find((k) => !k.kid);
  if (!jwk) throw new Error('no matching JWK');
  const key = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const ok = crypto.verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), key, sig);
  if (!ok) throw new Error('id_token signature verification failed');
  if (payload.iss !== issuer) throw new Error('issuer mismatch');
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(clientId)) throw new Error('audience mismatch');
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now > payload.exp + clockSkewSeconds) throw new Error('id_token expired');
  if (nonce && payload.nonce && payload.nonce !== nonce) throw new Error('nonce mismatch');
  return payload;
}
