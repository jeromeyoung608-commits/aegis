// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
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
import { detectLocale, setLocale, translatePhrases, observePhrases, translateString } from './i18n.js';

function boot() {
  const locale = setLocale(detectLocale());
  translatePhrases(locale);
  observePhrases(() => locale);
  // Modules print their first state a few frames after load (OPFS probe, peer
  // handshake, scan summary). Two cheap sweeps cover anything rendered before
  // the observer settled.
  for (const ms of [400, 1200, 3000]) setTimeout(() => translatePhrases(locale), ms);
  // Bridge for module code that paints strings itself (canvas labels, buttons
  // built in JS). Modules stay zero-dependency: they read this global when the
  // shared runtime happens to be present and fall back to their English literals
  // when the module is copied out standalone.
  window.AEGIS_MODULE_I18N = {
    locale,
    translate: (text) => translateString(text, locale) || text,
  };
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}

export { translatePhrases, observePhrases };
