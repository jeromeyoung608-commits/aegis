// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * Minimal toast queue. Non-blocking, auto-dismissing, no dependency.
 */

export function toast(message, variant = 'info', timeout = 4200) {
  const stack = document.getElementById('toastStack');
  if (!stack) return;

  const element = document.createElement('div');
  element.className = `toast is-${variant}`;
  element.textContent = message;
  stack.appendChild(element);

  setTimeout(() => {
    element.classList.add('is-leaving');
    setTimeout(() => element.remove(), 220);
  }, timeout);
}
