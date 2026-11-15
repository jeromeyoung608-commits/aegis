// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
/**
 * Canvas preview with interaction.
 *
 * The view owns rendering only: it draws the page raster, burns preview
 * rectangles and reports back user intent (select a hit, draw a manual box,
 * zoom). All state lives in core/state.js.
 */

import { boxFromPoints, pointInBox } from '../redact/geometry.js';

const ACCENT = '#d5b165';

export function createPageView({ canvas, wrap, onAddBox, onSelect, onZoomChange }) {
  const context = canvas.getContext('2d');

  let page = null;
  let zoom = 1;
  let zoomMode = 'fit';
  let mode = 'review';
  let selectedId = null;
  let hoverId = null;
  let drag = null;
  let frame = 0;

  function setPage(nextPage) {
    page = nextPage;
    if (page) {
      canvas.width = page.baseW;
      canvas.height = page.baseH;
      fit();
    }
    render();
  }

  function setMode(nextMode) {
    mode = nextMode;
    canvas.classList.toggle('is-drawing', nextMode === 'mark');
  }

  function setSelected(id) {
    selectedId = id;
    scheduleRender();
  }

  function setZoom(value) {
    zoomMode = 'manual';
    zoom = Math.min(4, Math.max(0.12, value));
    applyZoom();
  }

  function fit() {
    zoomMode = 'fit';
    applyZoom();
  }

  function applyZoom() {
    if (!page) return;

    if (zoomMode === 'fit') {
      const padding = 48;
      const availableWidth = Math.max(120, wrap.clientWidth - padding);
      const availableHeight = Math.max(120, wrap.clientHeight - padding);
      zoom = Math.min(availableWidth / page.baseW, availableHeight / page.baseH, 2.6);
      zoom = Math.max(0.12, zoom);
    }

    canvas.style.width = `${Math.round(page.baseW * zoom)}px`;
    canvas.style.height = `${Math.round(page.baseH * zoom)}px`;
    if (onZoomChange) onZoomChange(zoom);
  }

  function scheduleRender() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      render();
    });
  }

  function render() {
    const width = canvas.width;
    const height = canvas.height;

    context.clearRect(0, 0, width, height);
    if (!page) return;

    context.drawImage(page.baseCanvas, 0, 0);

    for (const detection of page.detections) {
      if (detection.enabled === false) continue;
      const { x, y, w, h } = detection.box;
      const peek = detection.id === selectedId || detection.id === hoverId;
      context.fillStyle = peek ? 'rgba(0, 0, 0, .32)' : '#000';
      context.fillRect(x * width, y * height, w * width, h * height);
    }

    for (const detection of page.detections) {
      if (detection.enabled === false) continue;
      if (detection.id !== selectedId && detection.id !== hoverId) continue;
      const { x, y, w, h } = detection.box;
      context.save();
      context.strokeStyle = ACCENT;
      context.lineWidth = 2;
      context.setLineDash(detection.id === selectedId ? [] : [5, 4]);
      context.strokeRect(x * width, y * height, w * width, h * height);
      context.restore();
    }

    if (drag) {
      const box = boxFromPoints(drag.start.x, drag.start.y, drag.current.x, drag.current.y);
      context.save();
      context.fillStyle = 'rgba(213, 177, 101, .18)';
      context.fillRect(box.x * width, box.y * height, box.w * width, box.h * height);
      context.strokeStyle = ACCENT;
      context.lineWidth = 2;
      context.setLineDash([6, 4]);
      context.strokeRect(box.x * width, box.y * height, box.w * width, box.h * height);
      context.restore();
    }
  }

  /* ── pointer interaction ─────────────────────────────────── */

  function pointFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / Math.max(1, rect.width),
      y: (event.clientY - rect.top) / Math.max(1, rect.height)
    };
  }

  function hitTest(point) {
    if (!page) return null;
    for (let i = page.detections.length - 1; i >= 0; i -= 1) {
      const detection = page.detections[i];
      if (detection.enabled === false) continue;
      if (pointInBox(detection.box, point.x, point.y)) return detection;
    }
    return null;
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (!page) return;
    const point = pointFromEvent(event);

    if (mode === 'mark') {
      drag = { start: point, current: point };
      canvas.setPointerCapture(event.pointerId);
      scheduleRender();
      return;
    }

    const hit = hitTest(point);
    selectedId = hit ? hit.id : null;
    if (onSelect) onSelect(selectedId);
    scheduleRender();
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!page) return;
    const point = pointFromEvent(event);

    if (drag) {
      drag.current = point;
      scheduleRender();
      return;
    }

    if (mode !== 'review') return;
    const hit = hitTest(point);
    const nextHover = hit ? hit.id : null;
    if (nextHover !== hoverId) {
      hoverId = nextHover;
      canvas.style.cursor = hit ? 'pointer' : 'default';
      scheduleRender();
    }
  });

  function finishDrag(event) {
    if (!drag) return;
    const box = boxFromPoints(drag.start.x, drag.start.y, drag.current.x, drag.current.y);
    drag = null;
    scheduleRender();

    if (box.w < 0.005 || box.h < 0.005) return;
    if (onAddBox) onAddBox(box);
  }

  canvas.addEventListener('pointerup', finishDrag);
  canvas.addEventListener('pointercancel', () => {
    drag = null;
    scheduleRender();
  });
  canvas.addEventListener('pointerleave', () => {
    if (hoverId) {
      hoverId = null;
      scheduleRender();
    }
  });

  wrap.addEventListener('wheel', (event) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    setZoom(zoom * (event.deltaY > 0 ? 0.9 : 1.1));
  }, { passive: false });

  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() => {
      if (zoomMode === 'fit') {
        applyZoom();
        scheduleRender();
      }
    });
    observer.observe(wrap);
  }

  return {
    setPage,
    setMode,
    setSelected,
    setZoom,
    fit,
    render,
    getZoom: () => zoom
  };
}
