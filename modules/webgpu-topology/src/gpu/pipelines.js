// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
// src/gpu/pipelines.js — WebGPU render pipelines + per-frame command encoding.
//
// Draw budget: edges = 1 line-list draw, nodes = 1 instanced draw (6 verts x N).
// That is 2 draw calls total — comfortably within the "≤3 draw calls" target.

import { C_N, C_E } from '../mem/sab.js';

export class GpuRenderer {
  constructor({ device, format, context }) {
    this.device = device;
    this.format = format;
    this.context = context;
    this._staging = null;
  }

  /** Create buffers + pipelines for a graph of N nodes and E edges. */
  build(N, E, edgeView, attrView) {
    const device = this.device;
    const code = BUILD_SHADER; // injected at module load (see bottom)
    const module = device.createShaderModule({ code });

    const vis = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT;
    this.nodeBGL = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: vis, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
        { binding: 2, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
      ],
    });
    this.edgeBGL = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: vis, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
        { binding: 2, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
        { binding: 3, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
      ],
    });

    this.nodePipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [this.nodeBGL] }),
      vertex: { module, entryPoint: 'vs_node' },
      fragment: { module, entryPoint: 'fs_node', targets: [{ format: this.format }] },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
    });
    this.edgePipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [this.edgeBGL] }),
      vertex: { module, entryPoint: 'vs_edge' },
      fragment: {
        module, entryPoint: 'fs_edge',
        targets: [{
          format: this.format,
          // Alpha blending is what makes the edge web glow: each line is drawn
          // translucent and overlapping lines accumulate brightness. WebGPU's
          // default is NO blending, which would paint every line opaque.
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          },
        }],
      },
      primitive: { topology: 'line-list' },
    });

    // Buffers
    this.N = N; this.E = E;
    this.transformUBO = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const posBytes = 2 * N * 4;
    this.nodePosBuf = device.createBuffer({ size: posBytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    this.attrBuf = device.createBuffer({ size: N * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    this.edgeBuf = device.createBuffer({ size: 2 * E * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });

    this.nodeBG = device.createBindGroup({
      layout: this.nodeBGL,
      entries: [
        { binding: 0, resource: { buffer: this.transformUBO } },
        { binding: 1, resource: { buffer: this.nodePosBuf } },
        { binding: 2, resource: { buffer: this.attrBuf } },
      ],
    });
    this.edgeBG = device.createBindGroup({
      layout: this.edgeBGL,
      entries: [
        { binding: 0, resource: { buffer: this.transformUBO } },
        { binding: 1, resource: { buffer: this.nodePosBuf } },
        { binding: 2, resource: { buffer: this.attrBuf } },
        { binding: 3, resource: { buffer: this.edgeBuf } },
      ],
    });

    this.updateAttr(attrView);
    this.updateEdges(edgeView);
  }

  /** Upload static edge index buffer (called once at build / regenerate). */
  updateEdges(edgeView) {
    this._writeStorage(this.edgeBuf, edgeView);
  }

  /** Upload node attr (status + focus) — call on generate and on focus change. */
  updateAttr(attrView) {
    this._writeStorage(this.attrBuf, attrView);
  }

  /** Upload live positions from the shared SAB each frame. */
  updatePositions(posView) {
    this._writeStorage(this.nodePosBuf, posView);
  }

  // writeBuffer from a typed-array view; tries the SAB-backed view directly and
  // falls back to a reusable staging ArrayBuffer if the implementation rejects SAB.
  _writeStorage(buffer, view) {
    try {
      this.device.queue.writeBuffer(buffer, 0, view.buffer, view.byteOffset, view.byteLength);
    } catch {
      if (!this._staging || this._staging.length !== view.length) this._staging = new Float32Array(view.length);
      this._staging.set(view);
      this.device.queue.writeBuffer(buffer, 0, this._staging);
    }
  }

  /** Encode + submit one frame. transform = {panX,panY,zoom,radius,vpW,vpH,colorMode}. */
  frame(transform) {
    const device = this.device;
    const buf = new ArrayBuffer(32);
    const f = new Float32Array(buf);
    const u = new Uint32Array(buf);
    f[0] = transform.panX; f[1] = transform.panY;
    f[2] = transform.zoom; f[3] = transform.radius;
    f[4] = transform.vpW; f[5] = transform.vpH;
    u[6] = transform.colorMode | 0;
    device.queue.writeBuffer(this.transformUBO, 0, buf);

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: this.context.getCurrentTexture().createView(),
        clearValue: { r: 0.04, g: 0.05, b: 0.07, a: 1 },
        loadOp: 'clear', storeOp: 'store',
      }],
    });
    pass.setPipeline(this.edgePipeline);
    pass.setBindGroup(0, this.edgeBG);
    pass.draw(2 * this.E);
    pass.setPipeline(this.nodePipeline);
    pass.setBindGroup(0, this.nodeBG);
    pass.draw(6, this.N);
    pass.end();
    device.queue.submit([encoder.finish()]);
  }

  destroy() {
    this.nodePosBuf?.destroy();
    this.attrBuf?.destroy();
    this.edgeBuf?.destroy();
    this.transformUBO?.destroy();
  }
}

// The WGSL source is imported as text at load time (see main.js fetch), but to keep
// this module self-contained we accept an injected string via setShaderSource().
let BUILD_SHADER = '';
export function setShaderSource(code) { BUILD_SHADER = code; }
