// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
// Aegis/aegis-shell/src/i18n-dom.js — self-starting German/English layer.
//
// The console and the workbench wire the translator themselves (they own a
// language selector). Module pages are standalone demos: they only need
// `import './…/i18n-dom.js'` and their UI follows the saved operator language,
// defaulting to English. Included by every modules/*/index.html.
//
// Nothing here writes a translation when the locale is English: the phrase
// layer treats EN as "show the source bytes".
import { detectLocale, setLocale, translatePhrases, observePhrases } from './i18n.js';

function boot() {
  const locale = setLocale(detectLocale());
  translatePhrases(locale);
  observePhrases(() => locale);
  // Modules print their first state a few frames after load (OPFS probe, peer
  // handshake, scan summary). Two cheap sweeps cover anything rendered before
  // the observer settled.
  for (const ms of [400, 1200, 3000]) setTimeout(() => translatePhrases(locale), ms);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}

export { translatePhrases, observePhrases };
