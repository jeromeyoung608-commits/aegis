// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * Vendor adapter: pdf-lib.
 *
 * pdf-lib is a vendored UMD bundle loaded as the `window.PDFLib` global by
 * `index.html` (`<script src="./vendor/pdf-lib/pdf-lib.min.js">`). This module
 * is the ONLY file under `src/` permitted to read that global. Everything else
 * imports `getPDFLib()` so the rest of the codebase stays vendor-free, lazy and
 * unit-testable (the global is resolved on first use, never at import time).
 */

let cached = undefined; // undefined = not yet resolved, null = resolved-but-absent

function resolve() {
  if (cached === undefined) {
    cached = (typeof window !== 'undefined' && window.PDFLib) ? window.PDFLib : null;
  }
  return cached;
}

/**
 * @returns {object} the pdf-lib namespace (window.PDFLib)
 * @throws if pdf-lib was not loaded
 */
export function getPDFLib() {
  const lib = resolve();
  if (!lib) throw new Error('pdf-lib (window.PDFLib) is not loaded');
  return lib;
}

/** True when pdf-lib is available in the current environment. */
export function hasPDFLib() {
  return Boolean(resolve());
}
