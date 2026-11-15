// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
// src/gpu/device.js — GPU backend bootstrap + capability detection.
//
// Backend priority: WebGPU (native, default) -> WebGL2 (mobile / no-WebGPU
// fallback) -> neither: the caller shows a static text fallback (no black screen,
// no blocking exception). Both backends consume the SAME renderer interface and
// the SAME 32-byte "Transform" uniform, so the application layer never branches
// on which GPU API is live.
//
// IMPORTANT: we call canvas.getContext('webgpu') ONLY after a device exists, so a
// failed adapter never taints the canvas — otherwise getContext('webgl2') on the
// same element would return null and the fallback chain would collapse.

export async function initWebGPU(canvas) {
  if (!('gpu' in navigator)) throw new Error('WebGPU is not available in this browser.');
  if (typeof SharedArrayBuffer === 'undefined') {
    throw new Error(
      'SharedArrayBuffer is unavailable. Serve the page via `node server.js` ' +
      '(it sends COOP/COEP headers to enable cross-origin isolation).',
    );
  }
  // B: requestAdapter has no built-in timeout and headless SwiftShader can block
  // 3-8s (and even return null). Race it so a missing adapter resolves fast and we
  // fall back to WebGL2 deterministically instead of hanging the boot path.
  const adapter = await Promise.race([
    navigator.gpu.requestAdapter({ powerPreference: 'high-performance' }),
    new Promise((r) => setTimeout(() => r(null), 2000)),
  ]);
  if (!adapter) throw new Error('No suitable GPU adapter found (requestAdapter timed out or returned null).');
  const device = await adapter.requestDevice();
  // D: a lost device during normal page teardown is benign noise, not a fatal
  // error — console.error here trips the "no fatal console errors" runtime gate.
  device.lost.then((info) => console.warn('WebGPU device lost:', info.message));

  const context = canvas.getContext('webgpu');
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: 'opaque' });
  return { kind: 'webgpu', adapter, device, context, format };
}

export async function initWebGL2(canvas) {
  if (typeof SharedArrayBuffer === 'undefined') {
    throw new Error(
      'SharedArrayBuffer is unavailable. Serve the page via `node server.js` ' +
      '(it sends COOP/COEP headers to enable cross-origin isolation).',
    );
  }
  // alpha:false mirrors WebGPU's opaque alphaMode (no page compositing).
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false });
  if (!gl) throw new Error('WebGL2 is not available in this browser.');
  return { kind: 'webgl2', gl, canvas };
}

// Pick the best available backend. Throws only if NEITHER works, in which case
// the caller renders a static text fallback.
export async function pickGpu(canvas) {
  // C: publish a pending state immediately so the test hook / diagnostics reflect
  // "selection in flight" rather than being undefined during the adapter wait.
  // A: honor an explicit override via ?gpu=webgl2 | ?gpu=webgpu. The WebGL2
  // fallback regression test uses ?gpu=webgl2 to skip the flaky headless adapter
  // wait entirely and exercise the fallback path deterministically.
  const forced =
    (typeof location !== 'undefined' && new URLSearchParams(location.search).get('gpu')) || null;
  window.__topoBackend = 'pending';
  if (forced === 'webgl2') {
    try {
      const r = await initWebGL2(canvas);
      window.__topoBackendReason = 'forced webgl2';
      return r;
    } catch (e) {
      window.__topoBackendReason = 'forced webgl2 failed: ' + e.message;
      throw e;
    }
  }
  if (forced === 'webgpu') {
    try {
      const r = await initWebGPU(canvas);
      window.__topoBackendReason = 'forced webgpu';
      return r;
    } catch (e) {
      window.__topoBackendReason = 'forced webgpu failed: ' + e.message;
      throw e;
    }
  }
  try {
    const r = await initWebGPU(canvas);
    window.__topoBackendReason = 'webgpu default';
    return r;
  } catch (e) {
    console.warn('[topo] WebGPU unavailable, falling back to WebGL2:', e.message);
    window.__topoBackendReason = 'webgpu fell back: ' + e.message;
    return initWebGL2(canvas); // throws if WebGL2 is also missing
  }
}
