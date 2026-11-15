// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
/**
 * Vendor adapter: Tesseract.js.
 *
 * Tesseract.js is a vendored UMD bundle loaded as the `window.Tesseract` global
 * by `index.html` (`<script src="./vendor/tesseract/tesseract.min.js">`). This
 * module is the ONLY file under `src/` permitted to read that global; the OCR
 * engine wrapper imports `getTesseract()` instead of touching `window` directly.
 */

/**
 * @returns {object} the Tesseract.js namespace (window.Tesseract)
 * @throws if Tesseract.js was not loaded
 */
export function getTesseract() {
  if (typeof window === 'undefined' || !window.Tesseract) {
    throw new Error('Tesseract.js (window.Tesseract) is not loaded');
  }
  return window.Tesseract;
}
