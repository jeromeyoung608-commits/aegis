// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * PDF export.
 *
 * The output document is built from scratch: every page is a fresh page object
 * containing one full-bleed raster image (already redacted) and, optionally,
 * vector rectangles on top. Nothing from the source PDF is copied — no text
 * layer, no fonts, no annotations, no XMP metadata — so redacted content cannot
 * be recovered from the result.
 */

import { canvasToBytes } from '../core/utils.js';
import { renderPdfPage } from '../pdf/render.js';
import { getPDFLib } from '../adapters/pdf-lib.js';

const MAX_EXPORT_EDGE = 5200;
const JPEG_QUALITY = 0.92;

export async function exportRedactedPdf(pages, options, onProgress) {
  const { PDFDocument, rgb } = getPDFLib();
  const doc = await PDFDocument.create();

  doc.setTitle('');
  doc.setAuthor('');
  doc.setSubject('');
  doc.setKeywords([]);
  doc.setCreator('REDAKTOR');
  doc.setProducer('REDAKTOR — local redaction engine');

  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const { canvas, sizePt } = await renderExportCanvas(page, options.dpi);

    const type = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const bytes = await canvasToBytes(
      canvas,
      type,
      options.format === 'jpeg' ? JPEG_QUALITY : undefined
    );

    const image = options.format === 'jpeg'
      ? await doc.embedJpg(bytes)
      : await doc.embedPng(bytes);

    const target = doc.addPage([sizePt.w, sizePt.h]);
    target.drawImage(image, { x: 0, y: 0, width: sizePt.w, height: sizePt.h });

    if (options.vectorRects) drawVectorRects(target, page, sizePt, rgb);

    if (onProgress) onProgress(index + 1, pages.length);
  }

  const output = await doc.save();
  return new Blob([output], { type: 'application/pdf' });
}

async function renderExportCanvas(page, dpi) {
  if (page.kind === 'pdf') {
    const { canvas, sizePt } = await renderPdfPage(
      page.pdf,
      page.pageNumber,
      dpi / 72,
      MAX_EXPORT_EDGE
    );
    burnRedactions(canvas, page);
    return { canvas, sizePt };
  }

  const bitmap = page.bitmap;
  const targetWidth = page.sizePt.w * dpi / 72;
  const scale = Math.min(1, targetWidth / bitmap.width);

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));

  const context = canvas.getContext('2d', { alpha: false });
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  burnRedactions(canvas, page);
  return { canvas, sizePt: page.sizePt };
}

function burnRedactions(canvas, page) {
  const context = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  context.fillStyle = '#000000';
  for (const detection of page.detections) {
    if (detection.enabled === false) continue;
    const { x, y, w, h } = detection.box;
    context.fillRect(
      Math.floor(x * width),
      Math.floor(y * height),
      Math.ceil(w * width),
      Math.ceil(h * height)
    );
  }
}

function drawVectorRects(pdfPage, page, sizePt, rgb) {
  for (const detection of page.detections) {
    if (detection.enabled === false) continue;
    const { x, y, w, h } = detection.box;
    pdfPage.drawRectangle({
      x: x * sizePt.w,
      y: sizePt.h - (y + h) * sizePt.h,
      width: w * sizePt.w,
      height: h * sizePt.h,
      color: rgb(0, 0, 0),
      borderWidth: 0
    });
  }
}

/**
 * Content-free audit report. Deliberately excludes every recognized string —
 * only geometry counts and settings, safe to archive or hand to a client.
 */
export function buildAuditReport(pages, options) {
  const summary = {
    tool: 'REDAKTOR',
    engine: 'Tesseract.js (WASM) + pdf.js + pdf-lib',
    generatedAt: new Date().toISOString(),
    settings: {
      language: 'deu+eng',
      rasterDpi: options.dpi,
      imageFormat: options.format,
      vectorRects: Boolean(options.vectorRects)
    },
    totals: {
      pages: pages.length,
      redactions: 0,
      byCategory: {}
    },
    pages: []
  };

  for (const page of pages) {
    const active = page.detections.filter((detection) => detection.enabled !== false);
    const byCategory = {};
    for (const detection of active) {
      byCategory[detection.category] = (byCategory[detection.category] || 0) + 1;
      summary.totals.byCategory[detection.category] =
        (summary.totals.byCategory[detection.category] || 0) + 1;
    }

    summary.totals.redactions += active.length;
    summary.pages.push({
      document: page.docName,
      page: page.pageNumber,
      widthPt: round(page.sizePt.w),
      heightPt: round(page.sizePt.h),
      ocrStatus: page.status,
      redactions: active.length,
      byCategory
    });
  }

  return summary;
}

function round(value) {
  return Math.round(value * 100) / 100;
}
