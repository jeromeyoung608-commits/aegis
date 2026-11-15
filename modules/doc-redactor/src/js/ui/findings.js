// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
/**
 * Right rail, "Findings" tab.
 *
 * Values are masked by default; the full string never needs to be printed on
 * screen to review a hit.
 */

import { escapeHtml, maskValue } from '../core/utils.js';

export function renderFindings(container, pages, activePageId, selectedId) {
  if (!container) return;

  const rows = [];
  for (const page of pages) {
    for (const detection of page.detections) {
      if (detection.enabled === false) continue;
      rows.push({ page, detection });
    }
  }

  if (!rows.length) {
    container.innerHTML = '<p class="empty-note">No findings yet. Once OCR runs, source positions appear here.</p>';
    return;
  }

  let html = '';

  for (const { page, detection } of rows) {
    const activeClass = detection.id === selectedId ? ' is-active' : '';
    const sourceClass = detection.source === 'custom' ? 'src-custom' : detection.source === 'manual' ? 'src-manual' : '';
    const value = detection.text ? maskValue(detection.text) : 'Drawn area';

    html += `
      <div class="hit-item${activeClass}" data-hit="${detection.id}" data-page="${page.id}">
        <div class="hit-top">
          <span class="hit-cat ${sourceClass}">${escapeHtml(detection.category)}</span>
          <span class="hit-page">P${page.pageNumber}</span>
          <span class="hit-actions">
            <button class="mini-btn" data-del="${detection.id}" data-page="${page.id}" type="button" title="Remove">
              <svg><use href="#i-trash"/></svg>
            </button>
          </span>
        </div>
        <div class="hit-value">${escapeHtml(value)}</div>
      </div>`;
  }

  container.innerHTML = html;
}
