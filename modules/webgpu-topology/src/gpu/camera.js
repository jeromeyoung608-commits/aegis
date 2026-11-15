// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
// src/gpu/camera.js — 2D orthographic camera with smooth focus animation.
//
// World <-> screen mapping MUST match the WGSL `worldToClip` AND the WebGPU
// viewport transform. WebGPU clip space is y-UP, but the framebuffer/screen is
// y-DOWN (origin top-left) — so screen_y = vpH/2 - (worldY - panY) * zoom. This
// Y FLIP is the classic mouse-picking bug: feed a top-left/screen-y directly into
// a y-up assumption and every pick is mirrored vertically. Both this camera and
// the picking hit-test use the flipped form so they agree with what is drawn.

export class Camera {
  constructor(vpW = 1, vpH = 1, dpr = 1) {
    this.vpW = vpW; this.vpH = vpH; this.dpr = dpr;
    this.panX = 0; this.panY = 0; this.zoom = 200;
    this.tPanX = 0; this.tPanY = 0; this.tZoom = 200;
  }

  setViewport(vpW, vpH, dpr) { this.vpW = vpW; this.vpH = vpH; this.dpr = dpr; }

  // --- conversions (device pixels, origin top-left, y DOWN) ---
  worldFromScreen(dpx, dpy) {
    return {
      x: this.panX + (dpx - this.vpW / 2) / this.zoom,
      y: this.panY - (dpy - this.vpH / 2) / this.zoom, // flipped y
    };
  }

  // --- interaction ---
  panBy(dpxDelta, dpyDelta) {
    this.panX -= dpxDelta / this.zoom;
    this.panY += dpyDelta / this.zoom; // flipped y so content follows the cursor
    this.tPanX = this.panX; this.tPanY = this.panY;
  }

  zoomAt(dpx, dpy, factor) {
    const before = this.worldFromScreen(dpx, dpy);
    this.zoom = Math.max(2, Math.min(200000, this.zoom * factor));
    // keep the world point under the cursor fixed
    this.panX = before.x - (dpx - this.vpW / 2) / this.zoom;
    this.panY = before.y + (dpy - this.vpH / 2) / this.zoom; // flipped y inverse
    this.tZoom = this.zoom; this.tPanX = this.panX; this.tPanY = this.panY;
  }

  frameBounds(minX, minY, maxX, maxY) {
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const spanX = Math.max(1e-3, maxX - minX);
    const spanY = Math.max(1e-3, maxY - minY);
    const z = Math.min(this.vpW / (spanX * 1.25), this.vpH / (spanY * 1.25));
    this.tPanX = cx; this.tPanY = cy;
    this.tZoom = Math.max(2, Math.min(200000, z));
  }

  setInstant(panX, panY, zoom) {
    this.panX = this.tPanX = panX;
    this.panY = this.tPanY = panY;
    this.zoom = this.tZoom = zoom;
  }

  // smooth interpolation toward the target each frame
  update(dt) {
    const k = 1 - Math.exp(-dt * 6);
    this.panX += (this.tPanX - this.panX) * k;
    this.panY += (this.tPanY - this.panY) * k;
    this.zoom += (this.tZoom - this.zoom) * k;
  }
}
