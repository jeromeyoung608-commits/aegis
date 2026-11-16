// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * File intake: turns dropped files into page sources.
 * PDFs are opened with pdf.js, raster images are decoded via createImageBitmap.
 */

import { openPdf } from '../pdf/render.js';

const IMAGE_EXTENSION = /\.(png|jpe?g|webp|bmp|gif)$/i;

export function isSupportedFile(file) {
  if (!file) return false;
  const name = file.name || '';
  if (file.type === 'application/pdf' || /\.pdf$/i.test(name)) return true;
  if (file.type.startsWith('image/') && !/tiff?/i.test(file.type)) return true;
  return IMAGE_EXTENSION.test(name);
}

export async function loadSource(file) {
  const name = file.name || 'document';

  if (file.type === 'application/pdf' || /\.pdf$/i.test(name)) {
    const buffer = await file.arrayBuffer();
    const pdf = await openPdf(buffer);
    return { kind: 'pdf', name, pdf, pageCount: pdf.numPages };
  }

  const bitmap = await createImageBitmap(file);
  return { kind: 'image', name, bitmap, pageCount: 1 };
}
