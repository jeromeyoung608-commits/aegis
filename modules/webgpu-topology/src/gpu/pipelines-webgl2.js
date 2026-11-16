// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// src/gpu/pipelines-webgl2.js — WebGL2 render backend (mobile / no-WebGPU fallback).
//
// This is a DROP-IN alternative to GpuRenderer (WebGPU). It implements the SAME
// public interface (build / updateEdges / updateAttr / updatePositions / frame /
// destroy) and consumes the SAME 32-byte "Transform" uniform, so main.js never
// branches on the backend. Output is pixel-identical in structure: instanced
// round nodes (data-driven color + focus dimming) and translucent line-list edges.
//
// Zero third-party graphics libs: hand-written GLSL ES 3.00, VAOs, and a UBO.
// Per-instance node data is read on the GPU via texelFetch from float/integer
// textures (the WebGPU equivalent of storage buffers). No vertex attributes are
// needed — positions come from gl_VertexID / gl_InstanceID.

import { C_N, C_E } from '../mem/sab.js';

// ── Shaders ────────────────────────────────────────────────────────────────────
const NODE_VS = `#version 300 es
precision highp float;
layout(std140) uniform Transform {
  vec2 pan; float zoom; float radius;
  vec2 vp; uint colorMode; uint _pad;
};
uniform highp sampler2D uPos;    // RG32F, width N  (node x,y)
uniform highp usampler2D uAttr;  // R32UI, width N  (status + focus + hover bits)
out vec2 vCorner;
out vec3 vColor;
out float vDim;

vec3 statusColor(uint s){
  if (s == 1u) return vec3(0.96, 0.66, 0.12);   // warning
  if (s == 2u) return vec3(0.96, 0.25, 0.20);   // critical
  return vec3(0.25, 0.85, 0.45);                // healthy
}
vec3 hue2rgb(float h){
  float r = abs(h * 6.0 - 3.0) - 1.0;
  float g = 2.0 - abs(h * 6.0 - 2.0);
  float b = 2.0 - abs(h * 6.0 - 4.0);
  return clamp(vec3(r, g, b), 0.0, 1.0);
}
vec2 worldToClip(vec2 p){
  vec2 c = (p - pan) * zoom;
  return c / (vp * 0.5);
}
float dimFactor(uint a){
  uint focusActive = (a >> 3u) & 1u;
  uint inFocus = (a >> 2u) & 1u;
  return (focusActive == 1u && inFocus == 0u) ? 0.10 : 1.0;
}
void main(){
  int vi = gl_VertexID;
  vec2 corner;
  if (vi == 0) corner = vec2(-1.0, -1.0);
  else if (vi == 1) corner = vec2( 1.0, -1.0);
  else if (vi == 2) corner = vec2( 1.0,  1.0);
  else if (vi == 3) corner = vec2(-1.0, -1.0);
  else if (vi == 4) corner = vec2( 1.0,  1.0);
  else corner = vec2(-1.0, 1.0);
  int ii = gl_InstanceID;
  uint a = texelFetch(uAttr, ivec2(ii, 0), 0).r;
  uint hover = (a >> 4u) & 1u;
  float rscale = (hover == 1u) ? 1.7 : 1.0;
  vec2 center = worldToClip(texelFetch(uPos, ivec2(ii, 0), 0).xy);
  vec2 ndcCorner = corner * (radius * rscale / (vp * 0.5));
  gl_Position = vec4(center + ndcCorner, 0.0, 1.0);
  vCorner = corner;
  vec3 base = (colorMode == 1u) ? hue2rgb(float(ii % 360) / 360.0) : statusColor(a & 3u);
  vColor = mix(base, vec3(1.0), float(hover) * 0.55);   // brighten on hover
  vDim = dimFactor(a);
}`;

const NODE_FS = `#version 300 es
precision highp float;
in vec2 vCorner; in vec3 vColor; in float vDim;
out vec4 o;
void main(){
  if (length(vCorner) > 1.0) discard;   // round nodes
  o = vec4(vColor * vDim, 1.0);
}`;

const EDGE_VS = `#version 300 es
precision highp float;
layout(std140) uniform Transform {
  vec2 pan; float zoom; float radius;
  vec2 vp; uint colorMode; uint _pad;
};
uniform highp sampler2D uPos;     // RG32F, width N
uniform highp usampler2D uAttr;   // R32UI, width N
uniform highp usampler2D uEdge;   // RG32UI, width E  (endpoint indices)
out float vDim;
vec2 worldToClip(vec2 p){
  vec2 c = (p - pan) * zoom;
  return c / (vp * 0.5);
}
float dimFactor(uint a){
  uint focusActive = (a >> 3u) & 1u;
  uint inFocus = (a >> 2u) & 1u;
  return (focusActive == 1u && inFocus == 0u) ? 0.10 : 1.0;
}
void main(){
  int idx = gl_VertexID;
  int e = idx / 2;
  bool isB = (idx % 2) == 1;
  uvec2 ep = texelFetch(uEdge, ivec2(e, 0), 0).rg;
  uint ni = isB ? ep.y : ep.x;
  vec2 p = texelFetch(uPos, ivec2(int(ni), 0), 0).xy;
  gl_Position = vec4(worldToClip(p), 0.0, 1.0);
  vDim = dimFactor(texelFetch(uAttr, ivec2(int(ni), 0), 0).r);
}`;

const EDGE_FS = `#version 300 es
precision highp float;
in float vDim; out vec4 o;
void main(){
  // translucent cool-blue lines; overlapping edges accumulate into glowing webs
  o = vec4(0.55, 0.66, 0.85, 0.25 * vDim);
}`;

export class WebGL2Renderer {
  constructor({ gl, canvas }) {
    this.gl = gl;
    this.canvas = canvas;
    this.N = 0; this.E = 0;
    this._staging = {};
    this._compile();
  }

  _compile() {
    const gl = this.gl;
    this.nodeProg = this._program(NODE_VS, NODE_FS);
    this.edgeProg = this._program(EDGE_VS, EDGE_FS);

    // Shared Transform UBO (binding 0) for both programs.
    this.transformUBO = gl.createBuffer();
    gl.bindBuffer(gl.UNIFORM_BUFFER, this.transformUBO);
    gl.bufferData(gl.UNIFORM_BUFFER, 32, gl.DYNAMIC_DRAW);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, this.transformUBO);

    for (const p of [this.nodeProg, this.edgeProg]) {
      const bi = gl.getUniformBlockIndex(p, 'Transform');
      if (bi !== gl.INVALID_INDEX) gl.uniformBlockBinding(p, bi, 0);
      gl.useProgram(p);
      const uPos = gl.getUniformLocation(p, 'uPos');
      const uAttr = gl.getUniformLocation(p, 'uAttr');
      if (uPos) gl.uniform1i(uPos, 0);
      if (uAttr) gl.uniform1i(uAttr, 1);
      const uEdge = gl.getUniformLocation(p, 'uEdge');
      if (uEdge) gl.uniform1i(uEdge, 2);
    }

    // A single (empty) VAO is enough: both draws derive geometry from
    // gl_VertexID / gl_InstanceID, so no vertex attributes are bound.
    this.vao = gl.createVertexArray();
  }

  _program(vsSrc, fsSrc) {
    const gl = this.gl;
    const vs = this._shader(gl.VERTEX_SHADER, vsSrc);
    const fs = this._shader(gl.FRAGMENT_SHADER, fsSrc);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('WebGL2 link failed: ' + gl.getProgramInfoLog(prog));
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return prog;
  }

  _shader(type, src) {
    const gl = this.gl;
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error('WebGL2 shader compile failed: ' + gl.getShaderInfoLog(s));
    }
    return s;
  }

  // Create a 2D texture sized (w x 1). internalFormat/format/type per spec.
  _makeTex(internalFormat, format, type, w) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, 1, 0, format, type, null);
    return tex;
  }

  // Upload a typed-array view into a texture. Some WebGL implementations reject
  // SharedArrayBuffer-backed views, so fall back to a reusable staging copy.
  _upload(tex, format, type, w, view, stagingKey) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    try {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, 1, format, type, view);
    } catch {
      let st = this._staging[stagingKey];
      if (!st || st.length !== view.length) st = this._staging[stagingKey] = new view.constructor(view.length);
      st.set(view);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, 1, format, type, st);
    }
  }

  /** Create buffers/textures for a graph of N nodes and E edges. */
  build(N, E, edgeView, attrView) {
    const gl = this.gl;
    this.N = N; this.E = E;

    this.posTex = this._makeTex(gl.RG32F, gl.RG, gl.FLOAT, N);     // RG32F
    this.attrTex = this._makeTex(gl.R32UI, gl.RED_INTEGER, gl.UNSIGNED_INT, N); // R32UI
    this.edgeTex = this._makeTex(gl.RG32UI, gl.RG_INTEGER, gl.UNSIGNED_INT, E); // RG32UI

    this.updateEdges(edgeView);
    this.updateAttr(attrView);
  }

  updateEdges(edgeView) {
    const gl = this.gl;
    this._upload(this.edgeTex, gl.RG_INTEGER, gl.UNSIGNED_INT, this.E, edgeView, 'edge');
  }

  updateAttr(attrView) {
    const gl = this.gl;
    this._upload(this.attrTex, gl.RED_INTEGER, gl.UNSIGNED_INT, this.N, attrView, 'attr');
  }

  updatePositions(posView) {
    const gl = this.gl;
    this._upload(this.posTex, gl.RG, gl.FLOAT, this.N, posView, 'pos');
  }

  /** Encode + submit one frame. transform = {panX,panY,zoom,radius,vpW,vpH,colorMode}. */
  frame(transform) {
    const gl = this.gl;
    const w = this.canvas.width, h = this.canvas.height;

    // 32-byte Transform UBO — identical layout to the WebGPU pipeline, so the
    // same camera math drives both backends.
    const buf = new ArrayBuffer(32);
    const f = new Float32Array(buf);
    const u = new Uint32Array(buf);
    f[0] = transform.panX; f[1] = transform.panY;
    f[2] = transform.zoom; f[3] = transform.radius;
    f[4] = transform.vpW; f[5] = transform.vpH;
    u[6] = transform.colorMode | 0;
    gl.bindBuffer(gl.UNIFORM_BUFFER, this.transformUBO);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, buf);

    gl.viewport(0, 0, w, h);
    gl.clearColor(0.04, 0.05, 0.07, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.posTex);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.attrTex);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.edgeTex);

    gl.bindVertexArray(this.vao);
    // EDGES: 1 line-list draw (2 verts per edge).
    gl.useProgram(this.edgeProg);
    gl.drawArrays(gl.LINES, 0, 2 * this.E);
    // NODES: 1 instanced draw (6 verts x N instances).
    gl.useProgram(this.nodeProg);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.N);
    gl.bindVertexArray(null);
  }

  destroy() {
    const gl = this.gl;
    gl.deleteTexture(this.posTex);
    gl.deleteTexture(this.attrTex);
    gl.deleteTexture(this.edgeTex);
    gl.deleteBuffer(this.transformUBO);
    gl.deleteProgram(this.nodeProg);
    gl.deleteProgram(this.edgeProg);
    gl.deleteVertexArray(this.vao);
  }
}
