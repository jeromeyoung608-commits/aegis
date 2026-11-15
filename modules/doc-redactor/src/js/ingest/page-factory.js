// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
/**
 * Page factory: produces the page records the rest of the app works with.
 *
 * Each page keeps a normalized preview/OCR raster (`baseCanvas`) plus a
 * reference to the original source. The exporter re-renders from the source at
 * the requested DPI, so nothing is lost by the 150-dpi working copy.
 */

import { uid } from '../core/utils.js';
import { renderPdfPage } from '../pdf/render.js';

export const OCR_DPI = 150;
export const PREVIEW_MAX_EDGE = 2600;

const A4 = { w: 595.28, h: 841.89 };
const LETTER = { w: 612, h: 792 };

export async function buildPages(source) {
  if (source.kind === 'pdf') {
    const pages = [];
    for (let pageNumber = 1; pageNumber <= source.pageCount; pageNumber += 1) {
      const { canvas, sizePt } = await renderPdfPage(
        source.pdf,
        pageNumber,
        OCR_DPI / 72,
        PREVIEW_MAX_EDGE
      );
      pages.push(makePage(source, {
        pageNumber,
        sizePt,
        baseCanvas: canvas
      }));
    }
    return pages;
  }

  const bitmap = source.bitmap;
  const scale = Math.min(1, PREVIEW_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));

  const context = canvas.getContext('2d', { alpha: false });
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  return [makePage(source, {
    pageNumber: 1,
    sizePt: guessPaperSize(bitmap.width, bitmap.height),
    baseCanvas: canvas,
    bitmap
  })];
}

function makePage(source, { pageNumber, sizePt, baseCanvas, bitmap = null }) {
  return {
    id: uid('page'),
    docId: source.docId,
    docName: source.name,
    kind: source.kind,
    pdf: source.pdf || null,
    bitmap,
    pageNumber,
    sizePt,
    baseCanvas,
    baseW: baseCanvas.width,
    baseH: baseCanvas.height,
    thumbUrl: makeThumbnail(baseCanvas),
    lines: [],
    words: [],
    detections: [],
    status: 'idle', // idle | ocr | done | error
    lang: null
  };
}

function guessPaperSize(width, height) {
  const ratio = height / width;
  const tolerance = 0.035;

  if (Math.abs(ratio - A4.h / A4.w) < tolerance) return { ...A4 };
  if (Math.abs(ratio - A4.w / A4.h) < tolerance) return { w: A4.h, h: A4.w };
  if (Math.abs(ratio - LETTER.h / LETTER.w) < tolerance) return { ...LETTER };
  if (Math.abs(ratio - LETTER.w / LETTER.h) < tolerance) return { w: LETTER.h, h: LETTER.w };

  // Unknown format: assume a 200-dpi scan, which yields sane physical sizes.
  return { w: width * 72 / 200, h: height * 72 / 200 };
}

function makeThumbnail(canvas) {
  const targetHeight = 100;
  const scale = targetHeight / canvas.height;
  const thumb = document.createElement('canvas');
  thumb.width = Math.max(1, Math.round(canvas.width * scale));
  thumb.height = targetHeight;
  thumb.getContext('2d').drawImage(canvas, 0, 0, thumb.width, thumb.height);
  return thumb.toDataURL('image/jpeg', 0.7);
}
