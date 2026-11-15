// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
/**
 * pdf.js helpers: open a document and render a page to a canvas.
 * The worker file is local, so rendering never touches the network.
 * Vendor access is delegated to ./adapters/pdfjs.js so this file never touches
 * the global directly.
 */

import { openPdf as openPdfImpl } from '../adapters/pdfjs.js';

export { openPdfImpl as openPdf };

/**
 * Renders a page with a white background.
 * @param {object} pdf         PDFDocumentProxy from pdf.js
 * @param {number} pageNumber  1-based page number
 * @param {number} scale       requested scale (dpi / 72)
 * @param {number} maxEdge     upper bound for the longest raster edge
 * @returns {Promise<{canvas: HTMLCanvasElement, sizePt: {w: number, h: number}}>}
 */
export async function renderPdfPage(pdf, pageNumber, scale, maxEdge = 4000) {
  const page = await pdf.getPage(pageNumber);
  const unit = page.getViewport({ scale: 1 });
  const longest = Math.max(unit.width, unit.height);
  const effectiveScale = Math.min(scale, maxEdge / longest);
  const viewport = page.getViewport({ scale: effectiveScale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(viewport.width));
  canvas.height = Math.max(1, Math.ceil(viewport.height));

  const context = canvas.getContext('2d', { alpha: false });
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: context, viewport }).promise;

  return {
    canvas,
    sizePt: { w: unit.width, h: unit.height }
  };
}
