// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
// src/main.js — application orchestrator.
//
// Pipeline:
//   generate (fake graph) -> SharedArrayBuffer (SAB)
//        |-> physics Worker writes positions into SAB every tick (off main thread)
//        |-> main thread reads the SAME SAB and uploads to the GPU each frame
//   WebGPU renders nodes (instanced) + edges (line-list) with data-driven coloring.
//
// The SAB is the single source of truth shared by both threads => zero-copy,
// zero per-frame allocation, no GC stalls on the render thread.

import { pickGpu } from './gpu/device.js';
import { GpuRenderer, setShaderSource } from './gpu/pipelines.js';
import { WebGL2Renderer } from './gpu/pipelines-webgl2.js';
import { Camera } from './gpu/camera.js';
import { Hud } from './ui/hud.js';
import { Controls } from './ui/controls.js';
import { createSAB, attach, packAttr, BIT_HOVER, C_RUNNING, C_TICKMS } from './mem/sab.js';
import { generate, planEdges } from './data/generate.js';
import { DEFAULTS } from './config.js';

const canvas = document.getElementById('gpu');
const errorBox = document.getElementById('error');
const showError = (msg) => { errorBox.textContent = msg; errorBox.style.display = 'block'; };
// Static text fallback when NEITHER WebGPU nor WebGL2 is available: the canvas is
// left untouched (never black), and a clear message is shown instead of throwing.
function showStaticFallback(reason) {
  showError(
    'Topology rendering is unavailable on this device.\n' +
    'Neither WebGPU nor WebGL2 could be initialized' + (reason ? ' (' + reason + ')' : '') + '.\n' +
    'The graph cannot be drawn here, but every other Aegis module remains fully functional.',
  );
}
// Surface silent failures: a throw inside a pointer handler aborts that handler
// and the interaction just "does nothing", which is indistinguishable from a
// coordinate bug while blind-debugging. Show it on the page instead.
window.addEventListener('error', (ev) =>
  showError('JS error: ' + ev.message + ' @ ' + (ev.filename || '?') + ':' + (ev.lineno || '?')));
window.addEventListener('unhandledrejection', (ev) =>
  showError('Promise rejection: ' + ((ev.reason && ev.reason.message) || ev.reason)));

const hud = new Hud({
  fps: document.getElementById('hud-fps'), frame: document.getElementById('hud-frame'),
  physics: document.getElementById('hud-physics'), nodes: document.getElementById('hud-nodes'),
  edges: document.getElementById('hud-edges'), draws: document.getElementById('hud-draws'),
});
const controls = new Controls({
  nodeCount: 'nodeCount', radius: 'radius', colorMode: 'colorMode',
  regenerate: 'regenerate', play: 'play', resetView: 'resetView', clearFocus: 'clearFocus',
});

let gpu, renderer, camera, worker, layout, N, E, fullBBox, running = true, needsFit = false;
let autoFitUntil = 0; // auto-frame the live bbox for the first moments (0 = off)
let fitZoom = 0; // zoom level that fits the FULL graph; focus zoom is capped relative to it
let renderPos = null; // snapshot of node positions as last rendered — picking matches the visible frame

async function boot() {
  let gpu;
  try {
    gpu = await pickGpu(canvas);
  } catch (e) {
    showStaticFallback(e.message);
    return;
  }
  window.__topoBackend = gpu.kind; // test hook: 'webgpu' | 'webgl2'

  if (gpu.kind === 'webgpu') {
    const res = await fetch('./src/gpu/shaders.wgsl');
    setShaderSource(await res.text());
    renderer = new GpuRenderer(gpu);
  } else {
    renderer = new WebGL2Renderer(gpu);
  }
  camera = new Camera(1, 1, Math.min(2, window.devicePixelRatio || 1));

  controls.bind();
  controls.setPlayLabel(running);
  controls.on('regenerate', rebuild);
  controls.on('togglePlay', togglePlay);
  controls.on('resetView', resetView);
  controls.on('clearFocus', clearFocus);
  controls.on('nodeCount', rebuild); // slider release -> rebuild graph at new size

  bindCanvasInput();
  build();
  requestAnimationFrame(loop);
  // Run the picking self-test once the first frames have populated renderPos and
  // the camera has settled, so the result reflects the live browser state.
  requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(selfTestPick, 250)));
}

function build() {
  N = Math.max(1000, Math.min(DEFAULTS.maxNodeCount, controls.getNodeCount()));
  E = planEdges(N, DEFAULTS.extraEdgeFactor);

  layout = createSAB(N, E);
  generate(layout, N, DEFAULTS.extraEdgeFactor);

  // initial bbox for camera framing
  fullBBox = computeBBox(layout.pos, N);
  renderPos = new Float32Array(2 * N); // picking snapshot, refreshed every rendered frame

  renderer.build(N, E, layout.edge, layout.attr);
  document.body.setAttribute('aria-busy', 'true'); // heaviest task: 100k-node physics worker
  // Size the canvas BEFORE framing so the camera uses the real viewport, not the
  // HTML default 300x150. If the viewport is still degenerate (e.g. hidden
  // container), defer the fit until resize() sees a real size (needsFit).
  resize();
  if (camera.vpW > 1 && camera.vpH > 1) {
    camera.frameBounds(fullBBox.minX, fullBBox.minY, fullBBox.maxX, fullBBox.maxY);
    camera.setInstant(camera.tPanX, camera.tPanY, camera.tZoom);
    fitZoom = camera.tZoom;
  } else {
    needsFit = true;
  }

  // (re)start physics worker on the new SAB
  worker?.terminate();
  worker = new Worker(new URL('./physics/worker.js', import.meta.url), { type: 'module' });
  // The worker freezes the layout once its FR cooling bottoms out; re-frame the
  // camera on the FINAL bbox then, so the settled graph is perfectly framed.
  worker.onmessage = (ev) => {
    if (ev.data && ev.data.type === 'settled' && layout && camera.vpW > 1) {
      const b = computeBBox(layout.pos, N);
      camera.frameBounds(b.minX, b.minY, b.maxX, b.maxY);
      fitZoom = camera.tZoom;
      document.body.setAttribute('aria-busy', 'false'); // layout settled — busy ends
    }
  };
  worker.postMessage({ type: 'init', sab: layout.sab, N, E, params: DEFAULTS.physics });
  running = true; controls.setPlayLabel(running);
  // Auto-fit the live bbox for the first 3s while the layout settles (it grows from
  // the initial disc to its final extent), then hand control to the user.
  autoFitUntil = performance.now() + 3000;
}

function rebuild() {
  renderer.destroy();
  build();
}

function togglePlay() {
  running = !running;
  worker?.postMessage({ type: running ? 'resume' : 'pause' });
  controls.setPlayLabel(running);
}

function resetView() {
  if (camera.vpW > 1 && camera.vpH > 1 && layout) {
    const b = computeBBox(layout.pos, N);
    camera.frameBounds(b.minX, b.minY, b.maxX, b.maxY);
    fitZoom = camera.tZoom;
  } else {
    needsFit = true;
  }
  clearFocus();
}

function clearFocus() {
  for (let i = 0; i < N; i++) {
    layout.attr[i] = packAttr(layout.attr[i] & 3, 0, 0); // status only, no focus
  }
  renderer.updateAttr(layout.attr);
}

// How much deeper than the full-graph fit a click-focus may zoom.
const FOCUS_ZOOM_CAP = 12;

// ---- focus subgraph (1-hop neighborhood) on click --------------------------
function applyFocus(node) {
  const inSet = new Uint8Array(N);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const mark = (i) => {
    if (inSet[i]) return;
    inSet[i] = 1;
    const x = layout.pos[i * 2], y = layout.pos[i * 2 + 1];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  };
  mark(node);
  for (let e = 0; e < E; e++) {
    const a = layout.edge[e * 2], b = layout.edge[e * 2 + 1];
    if (a === node) mark(b);
    else if (b === node) mark(a);
  }
  for (let i = 0; i < N; i++) {
    // preserve the live hover bit set by the pointer handler
    const hov = (layout.attr[i] >> BIT_HOVER) & 1;
    layout.attr[i] = packAttr(layout.attr[i] & 3, inSet[i], 1) | (hov << BIT_HOVER);
  }
  renderer.updateAttr(layout.attr);
  if (maxX > minX) {
    camera.frameBounds(minX, minY, maxX, maxY);
    // Cap focus zoom relative to the full-graph fit: a 1-hop neighborhood of a
    // dense mesh can span almost nothing, and an unclamped fit slams into the
    // 200000 zoom ceiling, producing a useless line-art view.
    if (fitZoom > 0) camera.tZoom = Math.min(camera.tZoom, fitZoom * FOCUS_ZOOM_CAP);
  }
}

// Pick in SCREEN space so the hit target is a constant ~14 CSS px regardless of
// zoom: a node is just as easy to click zoomed-in or zoomed-out, and clicking the
// visible dot always lands. (The old world-space `200 / zoom` tolerance shrank as
// you zoomed in, so dense graphs felt "missable".)
const PICK_RADIUS_CSS = 14;
function pickNearest(dpx, dpy, diag) {
  let best = -1, bestD = Infinity;
  const p = renderPos || layout.pos;
  // Replicate the shader's f32 projection EXACTLY: the WGSL uniform stores pan/zoom
  // as f32, so if we projected with the camera's f64 pan here we'd compute node
  // screen positions shifted by (pan_f32 - pan_f64) * zoom — invisible at fit zoom
  // but thousands of px once focused (deep zoom), which is exactly the "click the
  // node but miss, click empty space and hit" bug. Round to f32 to match the GPU.
  const z = Math.fround(camera.zoom);
  const px = Math.fround(camera.panX), py = Math.fround(camera.panY);
  const hw = camera.vpW / 2, hh = camera.vpH / 2;
  // Guard against a degenerate/NaN camera (e.g. a 0-span bbox at boot) producing
  // NaN node screen positions -> every pick misses and the cursor never flips.
  if (!(z > 0) || !Number.isFinite(px) || !Number.isFinite(py) ||
      !Number.isFinite(hw) || !Number.isFinite(hh)) return -1;
  // Y FLIP: WebGPU clip space is y-UP but the framebuffer/screen is y-DOWN
  // (origin top-left). So a node's drawn screen-y (pixels from top) is
  // vpH/2 - (worldY - panY) * zoom. Using the un-flipped form mirrors every
  // pick vertically — the classic mouse-picking bug. This MUST match camera.js.
  for (let i = 0; i < N; i++) {
    const sx = (p[i * 2] - px) * z + hw;
    const sy = (py - p[i * 2 + 1]) * z + hh;
    const dx = sx - dpx, dy = sy - dpy;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = i; }
  }
  const r = PICK_RADIUS_CSS * camera.dpr;
  const dist = Math.sqrt(bestD);
  if (diag) { diag.best = best; diag.dist = dist; diag.r = r; }
  return dist <= r ? best : -1;
}

// Shared event -> device-pixel conversion used by hover/click AND the load-time
// self-test. Maps a pointer event's viewport coords back to canvas device pixels;
// robust to any CSS scaling of the page (sx = canvas.width / rect.width collapses
// scale out — verified algebraically).
function pickAt(e, diag) {
  const rect = canvas.getBoundingClientRect();
  const sx = rect.width ? canvas.width / rect.width : 1;
  const sy = rect.height ? canvas.height / rect.height : 1;
  if (diag) { diag.rect = rect; diag.sx = sx; diag.sy = sy; }
  return pickNearest((e.clientX - rect.left) * sx, (e.clientY - rect.top) * sy, diag);
}

// Load-time self-test: prove picking works end-to-end in THIS browser with the
// real camera + DOM + SAB, with no user interaction. Projects sampled nodes with
// the shader's f32 math, then asks pickAt() at the node's exact screen position.
function selfTestPick() {
  const dbg = document.getElementById('pickdbg');
  if (!camera || !renderPos || N === 0) { if (dbg) dbg.textContent = 'SELF-TEST: not ready'; return; }
  const rect = canvas.getBoundingClientRect();
  const sx = rect.width ? canvas.width / rect.width : 1;
  const sy = rect.height ? canvas.height / rect.height : 1;
  const z = Math.fround(camera.zoom), px = Math.fround(camera.panX), py = Math.fround(camera.panY);
  const hw = camera.vpW / 2, hh = camera.vpH / 2;
  const sample = Math.min(N, 300);
  let ok = 0, tested = 0, worst = { d: -1 };
  for (let s = 0; s < sample; s++) {
    const i = Math.min(N - 1, Math.floor((s + 1) * N / (sample + 1)));
    const dpx = (renderPos[i * 2] - px) * z + hw;
    const dpy = (py - renderPos[i * 2 + 1]) * z + hh; // Y flip to match the draw
    const fake = { clientX: rect.left + dpx / sx, clientY: rect.top + dpy / sy };
    const node = pickAt(fake, null);
    tested++;
    if (node === i) ok++;
    else { const diag = {}; pickAt(fake, diag); if (diag.dist > worst.d) worst = { d: diag.dist, i, node, dpx, dpy }; }
  }
  const r = PICK_RADIUS_CSS * camera.dpr;
  let msg = `SELF-TEST picking: ${ok}/${tested} sampled nodes hit at their exact screen pos. `;
  msg += ok === tested
    ? 'PASS — CPU pick matches the GPU projection for every sampled node. Scope: math + projection only; DOM event delivery is verified separately by video-tool/verify-webgl2.mjs with real pointer events.'
    : `FAIL — e.g. node #${worst.i} on screen (${worst.dpx.toFixed(0)},${worst.dpy.toFixed(0)}) -> pickAt returned #${worst.node}, dist ${worst.d.toFixed(0)}px (> r ${r.toFixed(0)}). sx=${sx.toFixed(2)} canvas=${canvas.width}x${canvas.height} rect=${rect.width.toFixed(0)}x${rect.height.toFixed(0)}`;
  console.log('[topo] ' + msg);
  if (dbg) dbg.textContent = msg + '\n\n' + dbg.textContent;
}

// ---- hover feedback (cursor + GPU highlight) -------------------------------
let hoverNode = -1;
function setHover(node) {
  if (node === hoverNode) return;
  if (hoverNode >= 0) layout.attr[hoverNode] &= ~(1 << BIT_HOVER);
  hoverNode = node;
  if (hoverNode >= 0) layout.attr[hoverNode] |= (1 << BIT_HOVER);
  renderer.updateAttr(layout.attr);
}

// A press is still a "click" if the pointer slips a few CSS px while pressing —
// 9px is forgiving for trackpads without turning a deliberate drag into a select.
const CLICK_THRESHOLD = 9;

// ---- canvas input ----------------------------------------------------------
function bindCanvasInput() {
  let dragging = false, lastX = 0, lastY = 0, downX = 0, downY = 0;

  // ---- on-page pick diagnostics (remove once the click bug is confirmed fixed)
  const dbg = document.getElementById('pickdbg');
  let dbgCount = 0;
  const showPickDebug = (e, diag, phase) => {
    if (!dbg) return;
    dbgCount++;
    const d = diag || {};
    if (!d.rect) { d.rect = canvas.getBoundingClientRect(); d.sx = 1; d.sy = 1; }
    const p = renderPos || layout.pos;
    const n = d.best != null ? d.best : -1;
    const dpx = (e.clientX - d.rect.left) * d.sx, dpy = (e.clientY - d.rect.top) * d.sy;
    dbg.textContent =
      `events=${dbgCount} ${phase}\n` +
      `client=(${e.clientX},${e.clientY})  rect=(${d.rect.left.toFixed(0)},${d.rect.top.toFixed(0)} ${d.rect.width.toFixed(0)}x${d.rect.height.toFixed(0)})  k=(${(+d.sx).toFixed(2)},${(+d.sy).toFixed(2)})\n` +
      `device=(${dpx.toFixed(1)},${dpy.toFixed(1)})  canvas=${canvas.width}x${canvas.height}\n` +
      `cam pan=(${camera.panX.toFixed(2)},${camera.panY.toFixed(2)}) zoom=${camera.zoom.toFixed(1)} vp=(${camera.vpW},${camera.vpH}) dpr=${camera.dpr}\n` +
      `nearest #${n}  dist=${d.dist != null ? d.dist.toFixed(1) : '–'}  r=${d.r != null ? d.r.toFixed(1) : '–'}  hit=${n >= 0}` +
      (n >= 0 ? `  world=(${p[n * 2].toFixed(3)},${p[n * 2 + 1].toFixed(3)})` : '');
  };

  canvas.style.cursor = 'grab';
  // A dropped pointerup/pointercancel can leave `dragging` stuck true, which makes
  // every later pointermove take the pan branch and RETURN before the cursor is ever
  // set to `pointer` — exactly the "no hand cursor ever" symptom. Reset on those.
  const resetDrag = () => { dragging = false; canvas.style.cursor = 'grab'; };
  canvas.addEventListener('pointercancel', resetDrag);
  canvas.addEventListener('lostpointercapture', resetDrag);

  canvas.addEventListener('pointerdown', (e) => {
    autoFitUntil = 0; // first interaction hands the camera to the user
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    downX = e.clientX; downY = e.clientY;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', (e) => {
    if (dragging) {
      const dx = (e.clientX - lastX) * camera.dpr;
      const dy = (e.clientY - lastY) * camera.dpr;
      camera.panBy(dx, dy);
      lastX = e.clientX; lastY = e.clientY;
      setHover(-1); // hide the hover ring while panning
      canvas.style.cursor = 'grabbing';
      return;
    }
    const diag = {};
    let node = -1;
    try { node = pickAt(e, diag); } catch (err) { if (dbg) dbg.textContent = 'pick error: ' + (err && err.message); }
    try { setHover(node); } catch { /* ignore attr upload failure */ }
    // Cursor is set UNCONDITIONALLY so a throw above can never suppress the hand.
    canvas.style.cursor = node >= 0 ? 'pointer' : 'grab';
    showPickDebug(e, diag, 'move');
  });
  canvas.addEventListener('pointerup', (e) => {
    const slipX = Math.abs(e.clientX - downX);
    const slipY = Math.abs(e.clientY - downY);
    const isClick = !dragging || (slipX < CLICK_THRESHOLD && slipY < CLICK_THRESHOLD);
    dragging = false;
    const diag = {};
    let node = -1;
    try { node = pickAt(e, diag); } catch (err) { if (dbg) dbg.textContent = 'pick error: ' + (err && err.message); }
    showPickDebug(e, diag, 'up' + (node >= 0 ? ' FOCUS' : ' miss'));
    if (isClick && node >= 0) {
      applyFocus(node);
      // Integration hook: tell the Aegis shell which node was picked so it can open
      // that node's associated document in the redaction module.
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          channel: 'aegis', type: 'topology:node-selected',
          nodeId: node, x: (renderPos || layout.pos)[node * 2], y: (renderPos || layout.pos)[node * 2 + 1],
        }, '*');
      }
    }
    canvas.style.cursor = node >= 0 ? 'pointer' : 'grab';
  });
  canvas.addEventListener('pointerleave', () => { setHover(-1); canvas.style.cursor = 'grab'; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const sx = rect.width ? canvas.width / rect.width : 1;
    const sy = rect.height ? canvas.height / rect.height : 1;
    const dpx = (e.clientX - rect.left) * sx;
    const dpy = (e.clientY - rect.top) * sy;
    camera.zoomAt(dpx, dpy, e.deltaY < 0 ? 1.1 : 1 / 1.1);
  }, { passive: false });
}

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
  const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w; canvas.height = h;
    camera?.setViewport(w, h, dpr);
    // If we deferred the initial fit (e.g. container was hidden at build time),
    // perform it now that a real viewport size is known.
    if (needsFit && w > 1 && h > 1 && fullBBox) {
      camera.frameBounds(fullBBox.minX, fullBBox.minY, fullBBox.maxX, fullBBox.maxY);
      camera.setInstant(camera.tPanX, camera.tPanY, camera.tZoom);
      fitZoom = camera.tZoom;
      needsFit = false;
    }
  }
}

// ---- main render loop ------------------------------------------------------
let lastT = performance.now();
let fpsSmooth = 60, frameSmooth = 16;
// Worker tick time is a diagnostic, not a product metric. It arrives as an integer
// fixed-point millisecond value from the physics Worker; a cold-start tick can read
// thousands of ms while the render loop still holds 60 FPS (different clocks).
// Smooth it and reject implausible spikes so ?diag=1 never shows a misleading number.
let physicsSmooth = 0, physicsWarmup = 0;
const PHYSICS_MAX_PLAUSIBLE_MS = 1000;
if (new URLSearchParams(location.search).get('diag') === '1') {
  document.body.dataset.diag = '1';
}

function loop(t) {
  const dt = Math.min(0.05, (t - lastT) / 1000);
  lastT = t;

  resize();
  // Auto-fit the live bounding box until the user interacts (or the window expires),
  // so the graph is always nicely framed as it settles from the initial disc.
  if (autoFitUntil && performance.now() < autoFitUntil && layout) {
    const b = computeBBox(layout.pos, N);
    camera.frameBounds(b.minX, b.minY, b.maxX, b.maxY);
    camera.setInstant(camera.tPanX, camera.tPanY, camera.tZoom);
    fitZoom = camera.tZoom;
  }
  camera.update(dt);

  const f0 = performance.now();
  renderer.updatePositions(layout.pos); // zero-copy read from SAB
  if (renderPos) renderPos.set(layout.pos); // freeze the positions the user is currently seeing
  renderer.frame({
    panX: camera.panX, panY: camera.panY, zoom: camera.zoom,
    radius: controls.getRadius(), vpW: canvas.width, vpH: canvas.height,
    colorMode: controls.getColorMode(),
  });
  const frameMs = performance.now() - f0;

  // smoothed metrics
  const instFps = dt > 0 ? 1 / dt : 60;
  fpsSmooth += (instFps - fpsSmooth) * 0.1;
  frameSmooth += (frameMs - frameSmooth) * 0.1;
  const rawPhysicsMs = layout.ctrl[C_TICKMS] / 1000;
  if (Number.isFinite(rawPhysicsMs) && rawPhysicsMs >= 0 && rawPhysicsMs <= PHYSICS_MAX_PLAUSIBLE_MS) {
    // Ignore the first few ticks (Worker boot / initial 100k-node layout).
    if (physicsWarmup < 5) physicsWarmup++;
    else physicsSmooth = physicsSmooth === 0 ? rawPhysicsMs : physicsSmooth + (rawPhysicsMs - physicsSmooth) * 0.1;
  }

  hud.update({
    fps: fpsSmooth, frameMs: frameSmooth, physicsMs: physicsSmooth,
    nodes: N, edges: E, draws: 2,
  });

  requestAnimationFrame(loop);
}

function computeBBox(pos, n) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    const x = pos[i * 2], y = pos[i * 2 + 1];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

boot();
