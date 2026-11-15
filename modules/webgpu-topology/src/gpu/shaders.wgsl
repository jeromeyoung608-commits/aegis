// src/gpu/shaders.wgsl — native WGSL shaders.
//
// Two render paths share one uniform "Transform" and the storage `pos` buffer:
//   • NODES : instanced quads (6 verts x N instances) -> 1 draw call.
//   • EDGES : line-list (2 verts per edge, endpoint looked up by index) -> 1 draw call.
// Total: 2 draw calls (well under the 3-draw target).
//
// Data-driven coloring: the `attr` buffer (status + focus bits) is read on the GPU
// and mapped to colors there — no per-frame CPU color recomputation. Focus subgraph
// is encoded in the same buffer and simply dims non-focused nodes/edges.

struct Transform {
  pan : vec2f,    // world coord at screen center
  zoom : f32,     // pixels per world unit
  radius : f32,   // node radius in pixels
  vp : vec2f,     // viewport size in pixels
  colorMode : u32,
  _pad : u32,
};

@group(0) @binding(0) var<uniform> T : Transform;
@group(0) @binding(1) var<storage, read> pos : array<vec2f>;
@group(0) @binding(2) var<storage, read> attr : array<u32>;   // status + focus (nodes)
@group(0) @binding(3) var<storage, read> edge : array<u32>;   // endpoint indices (edges)

const HEALTHY  = vec3f(0.25, 0.85, 0.45);
const WARNING  = vec3f(0.96, 0.66, 0.12);
const CRITICAL = vec3f(0.96, 0.25, 0.20);

fn statusColor(s : u32) -> vec3f {
  if (s == 1u) { return WARNING; }
  if (s == 2u) { return CRITICAL; }
  return HEALTHY;
}

fn hue2rgb(h : f32) -> vec3f {
  let r = abs(h * 6.0 - 3.0) - 1.0;
  let g = 2.0 - abs(h * 6.0 - 2.0);
  let b = 2.0 - abs(h * 6.0 - 4.0);
  return clamp(vec3f(r, g, b), vec3f(0.0), vec3f(1.0));
}

fn worldToClip(p : vec2f) -> vec4f {
  let c = (p - T.pan) * T.zoom;        // pixels relative to center
  let ndc = c / (T.vp * 0.5);
  return vec4f(ndc, 0.0, 1.0);
}

// focus bits: bit2 = inFocus, bit3 = focusActive
fn dimFactor(a : u32) -> f32 {
  let focusActive = (a >> 3u) & 1u;
  let inFocus = (a >> 2u) & 1u;
  return select(1.0, 0.10, focusActive == 1u && inFocus == 0u);
}

// ----------------------------- NODES ---------------------------------------
struct NodeOut {
  @builtin(position) clip : vec4f,
  @location(0) corner : vec2f,
  @location(1) color : vec3f,
  @location(2) dim : f32,
};

@vertex
fn vs_node(@builtin(vertex_index) vi : u32,
           @builtin(instance_index) ii : u32) -> NodeOut {
  var corner : vec2f;
  switch vi {
    case 0u: { corner = vec2f(-1.0, -1.0); }
    case 1u: { corner = vec2f( 1.0, -1.0); }
    case 2u: { corner = vec2f( 1.0,  1.0); }
    case 3u: { corner = vec2f(-1.0, -1.0); }
    case 4u: { corner = vec2f( 1.0,  1.0); }
    default: { corner = vec2f(-1.0,  1.0); }
  }
  let a = attr[ii];
  let hover = (a >> 4u) & 1u;
  // hovered nodes grow slightly so the cursor target is obviously highlighted
  let rscale = select(1.0, 1.7, hover == 1u);
  let center = worldToClip(pos[ii]).xy;
  // corner is in unit space; convert pixel radius to NDC offset
  let ndcCorner = corner * (T.radius * rscale / (T.vp * 0.5));
  var o : NodeOut;
  o.clip = vec4f(center + ndcCorner, 0.0, 1.0);
  o.corner = corner;

  var base : vec3f;
  if (T.colorMode == 1u) {
    let h = f32(ii % 360u) / 360.0;
    base = hue2rgb(h);
  } else {
    base = statusColor(a & 3u);
  }
  // brighten on hover for an unambiguous "this is clickable" cue
  o.color = mix(base, vec3f(1.0), f32(hover) * 0.55);
  o.dim = dimFactor(a);
  return o;
}

@fragment
fn fs_node(i : NodeOut) -> @location(0) vec4f {
  if (length(i.corner) > 1.0) { discard; }   // round nodes
  return vec4f(i.color * i.dim, 1.0);
}

// ----------------------------- EDGES ---------------------------------------
struct EdgeOut {
  @builtin(position) clip : vec4f,
  @location(0) dim : f32,
};

@vertex
fn vs_edge(@builtin(vertex_index) vi : u32) -> EdgeOut {
  let idx = edge[vi];
  let p = pos[idx];
  var o : EdgeOut;
  o.clip = worldToClip(p);
  o.dim = dimFactor(attr[idx]);
  return o;
}

@fragment
fn fs_edge(i : EdgeOut) -> @location(0) vec4f {
  // Translucent cool-blue lines; overlapping edges accumulate into glowing webs.
  return vec4f(0.55, 0.66, 0.85, 0.25 * i.dim);
}
