// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
/**
 * Bottom status bar and small counters shared with the header.
 */

export function createStatusController(elements) {
  const {
    statusText,
    statusDot,
    progressWrap,
    progressBar,
    progressText,
    statPages,
    statHits,
    hitSummary,
    hitTabCount
  } = elements;

  function message(text, tone = 'idle') {
    if (statusText) statusText.textContent = text;
    if (statusDot) {
      statusDot.className = 'dot';
      if (tone === 'busy') statusDot.classList.add('dot-amber');
      if (tone === 'error') statusDot.classList.add('dot-red');
    }
  }

  function progress(percent) {
    if (!progressWrap) return;
    if (percent == null) {
      progressWrap.hidden = true;
      return;
    }
    progressWrap.hidden = false;
    const value = Math.min(100, Math.max(0, Math.round(percent)));
    if (progressBar) progressBar.style.width = `${value}%`;
    if (progressText) progressText.textContent = `${value}%`;
  }

  function counts(pages, hits) {
    if (statPages) statPages.innerHTML = `${pages.length} <span>pages</span>`;
    if (statHits) statHits.innerHTML = `${hits} <span>redactions</span>`;
    if (hitSummary) hitSummary.textContent = `${hits} redaction${hits === 1 ? '' : 's'}`;
    if (hitTabCount) hitTabCount.textContent = String(hits);
  }

  return { message, progress, counts };
}
