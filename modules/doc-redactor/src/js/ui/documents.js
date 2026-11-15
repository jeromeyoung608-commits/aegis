// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
/**
 * Left rail: documents and their pages, with live OCR status.
 */

import { escapeHtml } from '../core/utils.js';

export function renderDocuments(container, pages, activePageId) {
  if (!container) return;

  if (!pages.length) {
    container.innerHTML = '';
    return;
  }

  const groups = new Map();
  for (const page of pages) {
    if (!groups.has(page.docId)) groups.set(page.docId, []);
    groups.get(page.docId).push(page);
  }

  let html = '';

  for (const [, docPages] of groups) {
    const first = docPages[0];
    const icon = first.kind === 'pdf' ? '#i-doc' : '#i-image';

    html += `
      <div class="doc-item">
        <div class="doc-head">
          <span class="doc-ico"><svg><use href="${icon}"/></svg></span>
          <span class="doc-name" title="${escapeHtml(first.docName)}">${escapeHtml(first.docName)}</span>
          <span class="doc-tag">${docPages.length} ${docPages.length === 1 ? 'PAGE' : 'PAGES'}</span>
        </div>`;

    for (const page of docPages) {
      const active = page.id === activePageId ? ' is-active' : '';
      const count = page.detections.filter((item) => item.enabled !== false).length;
      const badge = badgeFor(page, count);
      const subtitle = subtitleFor(page, count);

      html += `
        <button class="page-item${active}" data-page="${page.id}" type="button">
          <span class="page-thumb" style="background-image:url('${page.thumbUrl}')"></span>
          <span class="page-info">
            <span class="page-title">Page ${page.pageNumber}</span>
            <span class="page-sub">${subtitle}</span>
          </span>
          ${badge}
        </button>`;
    }

    html += '</div>';
  }

  container.innerHTML = html;
}

function badgeFor(page, count) {
  if (page.status === 'ocr') return '<span class="badge badge-run">SCAN</span>';
  if (page.status === 'done') {
    return count
      ? `<span class="badge badge-hits">${count}</span>`
      : '<span class="badge badge-ok">CLEAN</span>';
  }
  if (page.status === 'error') return '<span class="badge">ERROR</span>';
  return '<span class="badge">IDLE</span>';
}

function subtitleFor(page, count) {
  if (page.status === 'ocr') return 'Recognizing text…';
  if (page.status === 'done') {
    return count ? `${count} redaction${count === 1 ? '' : 's'}` : 'No sensitive areas found';
  }
  if (page.status === 'error') return 'OCR failed — retry by re-dropping';
  return 'Waiting for OCR';
}
