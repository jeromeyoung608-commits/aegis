// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * Small shared helpers. No dependencies on other modules.
 */

export function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function debounce(fn, wait = 300) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Display-safe preview of a sensitive string: keeps a few edge characters. */
export function maskValue(value) {
  const raw = String(value == null ? '' : value).trim();
  if (!raw) return '';
  if (raw.length <= 4) return '\u2022'.repeat(Math.max(3, raw.length));
  const edge = Math.min(3, Math.floor(raw.length / 3));
  return `${raw.slice(0, edge)}${'\u2022'.repeat(6)}${raw.slice(-edge)}`;
}

export function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const pow = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, pow);
  return `${size.toFixed(pow === 0 ? 0 : 1)} ${units[pow]}`;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function canvasToBlob(canvas, type = 'image/png', quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas could not be encoded'));
    }, type, quality);
  });
}

export function canvasToBytes(canvas, type = 'image/png', quality) {
  return canvasToBlob(canvas, type, quality).then((blob) => blob.arrayBuffer());
}

export function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
