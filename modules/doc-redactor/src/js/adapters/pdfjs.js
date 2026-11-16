// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * Vendor adapter: pdf.js.
 *
 * pdf.js is a vendored UMD bundle loaded as the `window.pdfjsLib` global by
 * `index.html` (`<script src="./vendor/pdfjs/pdf.min.js">`). This module is the
 * ONLY file under `src/` permitted to read that global; it also owns the single
 * worker-configuration side effect so it can never run twice.
 */

let configured = false;

/**
 * @returns {object} the pdf.js namespace (window.pdfjsLib)
 * @throws if pdf.js was not loaded
 */
export function getPdfjs() {
  if (typeof window === 'undefined' || !window.pdfjsLib) {
    throw new Error('pdf.js (window.pdfjsLib) is not loaded');
  }
  if (!configured) {
    // Local worker only — rendering never touches the network.
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = './vendor/pdfjs/pdf.worker.min.js';
    configured = true;
  }
  return window.pdfjsLib;
}

/** Open a PDF from raw bytes and return the pdf.js document proxy. */
export async function openPdf(arrayBuffer) {
  const pdfjsLib = getPdfjs();
  return pdfjsLib.getDocument({
    data: arrayBuffer,
    isEvalSupported: false,
    useWorkerFetch: false
  }).promise;
}
