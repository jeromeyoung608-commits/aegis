// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// Aegis/aegis-shell/src/windowing.js — make the workbench panels draggable and
// resizable. Each panel is "lifted" out of the static layout into a free-floating
// window the first time it is positioned (either restored from localStorage or
// floated at its natural spot), then moved by its header bar and resized by the
// bottom-right grip. Position/size persist per browser.
//
// The change is purely presentational: panels keep their ids and DOM children, so
// the iframe message-passing that drives the seven-step closed loop is untouched.
const KEY = 'aegis.win.v2'; // v2: discard any layout saved by the earlier broken builds
const MIN_W = 240;
const MIN_H = 160;

function loadAll() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function saveAll(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ }
}

function floatify(win) {
  const r = win.getBoundingClientRect();
  // .floated drives the CSS side (e.g. the redactor iframe flexes to fill the window
  // only once it is actually lifted, never while still in normal flow).
  win.classList.add('floated');
  if (r.width < 2 || r.height < 2) return false; // hidden (e.g. admin panel) — leave for now
  win.style.position = 'fixed';
  win.style.margin = '0';
  win.style.left = Math.round(r.left) + 'px';
  win.style.top = Math.round(r.top) + 'px';
  win.style.width = Math.round(r.width) + 'px';
  win.style.height = Math.round(r.height) + 'px';
  return true;
}

function makeWindow(id, win, handle) {
  if (!win || !handle) return;
  win.classList.add('win');

  const state = loadAll()[id];
  if (state) {
    win.classList.add('floated');
    win.style.position = 'fixed';
    win.style.left = state.left + 'px';
    win.style.top = state.top + 'px';
    win.style.width = state.width + 'px';
    win.style.height = state.height + 'px';
    win.style.margin = '0';
    win.style.zIndex = String(state.z || 10);
  }
  // No saved state → leave the panel in its normal layout and only "lift" it into a
  // floating window on the first grab (drag/resize handlers call floatify()). This
  // avoids stacking every panel at the same spot and keeps the default workspace intact.

  const grip = document.createElement('div');
  grip.className = 'win-resize';
  grip.setAttribute('aria-hidden', 'true');
  grip.title = 'Drag to resize';
  win.appendChild(grip);

  let z = parseInt(win.style.zIndex || '10', 10);
  const raise = () => { z += 1; win.style.zIndex = String(z); };
  win.addEventListener('pointerdown', raise, true);

  // Drag by grabbing the header strip. The listener is attached to `win` in the
  // CAPTURE phase (not the header node) so it survives any inner re-render of the
  // panel markup, and a press anywhere inside the top ~34px band starts the drag
  // unless it lands on an interactive control. Movement is tracked on `window` so it
  // keeps following even if the cursor outruns the element.
  let drag = null;
  win.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, a, input, select, textarea, [data-no-drag]')) return;
    if (!handle.contains(e.target)) return; // only the header bar starts a drag
    if (win.style.position !== 'fixed' && !floatify(win)) return;
    raise();
    drag = { dx: e.clientX - win.offsetLeft, dy: e.clientY - win.offsetTop };
    win.classList.add('dragging');
    e.preventDefault();
    const mm = (ev) => {
      if (!drag) return;
      let x = ev.clientX - drag.dx;
      let y = ev.clientY - drag.dy;
      x = Math.max(0, Math.min(x, window.innerWidth - 48));
      y = Math.max(0, Math.min(y, window.innerHeight - 28));
      win.style.left = x + 'px';
      win.style.top = y + 'px';
    };
    const mu = () => {
      drag = null;
      win.classList.remove('dragging');
      window.removeEventListener('pointermove', mm);
      window.removeEventListener('pointerup', mu);
      persist();
    };
    window.addEventListener('pointermove', mm);
    window.addEventListener('pointerup', mu);
  }, true);

  let rsz = null;
  grip.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    if (win.style.position !== 'fixed') floatify(win); // lift before resizing if still in-flow
    const r = win.getBoundingClientRect();
    rsz = { x: e.clientX, y: e.clientY, w: r.width, h: r.height };
    grip.classList.add('active');
    e.preventDefault();
    const mm = (ev) => {
      if (!rsz) return;
      win.style.width = Math.max(MIN_W, Math.round(rsz.w + (ev.clientX - rsz.x))) + 'px';
      win.style.height = Math.max(MIN_H, Math.round(rsz.h + (ev.clientY - rsz.y))) + 'px';
    };
    const mu = () => {
      rsz = null;
      grip.classList.remove('active');
      window.removeEventListener('pointermove', mm);
      window.removeEventListener('pointerup', mu);
      persist();
    };
    window.addEventListener('pointermove', mm);
    window.addEventListener('pointerup', mu);
  });

  function persist() {
    const s = loadAll();
    s[id] = {
      left: win.offsetLeft, top: win.offsetTop,
      width: win.offsetWidth, height: win.offsetHeight, z,
    };
    saveAll(s);
  }
}

function init() {
  // REDAKTOR spans a header (#redactHead), the action bar (#redactAction) and the
  // iframe wrapper (.redact-wrap) that are siblings inside the sidebar — group them
  // into one window so the whole redaction surface moves together.
  const rh = document.getElementById('redactHead');
  const ra = document.getElementById('redactAction');
  const rw = document.querySelector('.redact-wrap');
  let redactWin = null;
  if (rh && rw) {
    redactWin = document.createElement('div');
    redactWin.id = 'win-redact';
    rh.parentNode.insertBefore(redactWin, rh);
    redactWin.appendChild(rh);
    if (ra) redactWin.appendChild(ra);
    redactWin.appendChild(rw);
  }

  makeWindow('stage-topo', document.getElementById('stage-topo'), document.querySelector('#stage-topo .pane-head'));
  if (redactWin) makeWindow('win-redact', redactWin, rh);
  makeWindow('transfer-card', document.querySelector('.transfer-card'), document.querySelector('.transfer-card .pane-head'));
  makeWindow('vault-card', document.querySelector('.vault-card'), document.querySelector('.vault-card .pane-head'));
  makeWindow('audit-card', document.querySelector('.audit-card'), document.querySelector('.audit-card .pane-head'));
  makeWindow('adminPanel', document.getElementById('adminPanel'), document.querySelector('#adminPanel .pane-head'));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
