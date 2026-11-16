// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * ============================================================================
 * aegis-shell/src/sdk.js - AegisSDK: the public embedding facade.
 * ============================================================================
 *
 * PURPOSE
 * -------
 * Aegis is a microkernel: `aegis-shell` owns the EventBus, the shared Context and
 * every Adapter, while the independent projects under `modules/` never import one
 * another. A host application (an intranet portal, a case-management system, a
 * document scanner integration) still needs a stable, documented way to configure
 * the workbench, observe what happens, and push documents into it. This module is
 * that seam. It is deliberately thin: it holds no business state of its own and
 * reimplements no cryptography, vault, or transport logic.
 *
 * LIFECYCLE
 * ---------
 * `app.js` creates the one and only `EventBus`, then calls `installAegisSDK(bus)`.
 * That function builds the SDK object, assigns it to `window.AegisSDK`, and returns
 * it. Because the SDK closes over the *real* shell bus (not a copy), an external
 * `on()` subscription sees exactly the same events the internal state machine sees,
 * including module events forwarded by the `aegis` postMessage bridge.
 *
 * EVENT CATALOG (non-exhaustive; any namespaced event can be observed)
 * --------------------------------------------------------------------
 *   topology:node-selected   { nodeId, x, y }              from Aegis-Topology
 *   redaktor:load-doc        { file, name, source }         shell intake seam
 *   redaktor:export-ready    { name, blob }                 from Aegis-REDAKTOR
 *   identity:signed          { hash, signature, publicKey } shell produced
 *   p2p:file-sent            {}                             from Aegis-Transport
 *   p2p:file-received        { name, size, blob }           from Aegis-Transport
 *   signed:verified          { ok, hash, signers, artifact } shell produced
 *   signed:rejected          { reason, name }               shell produced
 *   vault:sealed             { id, size, containerSize }    shell produced
 *   audit:append             { index, prev, hash, payload } shell produced
 *   sdk:initialized          { theme, locale, version }     SDK produced
 *   sdk:file-injected        { name, size, type }           SDK produced
 *
 * SECURITY MODEL
 * --------------
 * - `authToken` is accepted for host-system correlation, stored only in a closure,
 *   and NEVER logged, emitted on the bus, or exposed on the public SDK object.
 * - `init()` publishes `sdk:initialized` with theme/locale/version only.
 * - `injectFile()` does not read the file contents. The `File` object is handed to
 *   the shell bus, which posts it to the REDAKTOR iframe; bytes stay in the browser.
 * - No npm dependency, no global mutable state beyond `window.AegisSDK`, and no
 *   direct import of any submodule from this file.
 *
 * THREADING / ORDERING
 * --------------------
 * `bus.emit()` is synchronous. `on()` subscribers run in registration order inside
 * the emitter's call stack and their exceptions are contained by the EventBus, so a
 * failing host callback cannot break the seven-stage loop. `injectFile()` is async
 * only so callers can `await` a receipt; the intake event itself is emitted before
 * the returned promise resolves.
 *
 * @module aegis-shell/src/sdk
 */

/** Default values applied when `init()` receives a partial configuration. */
const DEFAULT_CONFIG = Object.freeze({
  theme: 'dark',
  locale: 'en',
  authToken: null,
});

/** Semantic version of the public facade. Bump on any breaking API change. */
export const SDK_VERSION = '1.0.0';

/**
 * Merge a host-supplied configuration over the defaults. Unknown keys are retained
 * so a host can carry its own correlation fields, but they are never emitted.
 *
 * @param {object} [config] Raw configuration from the host application.
 * @returns {{theme:string,locale:string,authToken:string|null,[key:string]:unknown}}
 *   A fresh, normalised configuration object.
 */
function normalizeConfig(config) {
  if (config === undefined || config === null) return { ...DEFAULT_CONFIG };
  if (typeof config !== 'object' || Array.isArray(config)) {
    throw new TypeError('AegisSDK.init(config): config must be a plain object.');
  }
  const merged = { ...DEFAULT_CONFIG, ...config };
  if (typeof merged.theme !== 'string' || merged.theme.length === 0) {
    throw new TypeError('AegisSDK.init(config): theme must be a non-empty string.');
  }
  if (typeof merged.locale !== 'string' || merged.locale.length === 0) {
    throw new TypeError('AegisSDK.init(config): locale must be a non-empty string.');
  }
  if (merged.authToken !== null && typeof merged.authToken !== 'string') {
    throw new TypeError('AegisSDK.init(config): authToken must be a string or null.');
  }
  return merged;
}

/**
 * Build and install the public SDK on `window.AegisSDK`.
 *
 * The function is intentionally named `install...` rather than exporting a singleton:
 * the shell must pass its own EventBus instance, which guarantees there is exactly
 * one source of truth for events. Calling this twice simply replaces the global with
 * a new facade bound to the supplied bus; subscriptions from the previous facade are
 * not migrated, so hosts should call it once during bootstrap.
 *
 * @param {import('./bus.js').EventBus} bus The shell's internal EventBus. It must
 *   provide `on(type, callback)` returning an unsubscribe function, and
 *   `emit(type, payload)`.
 * @returns {object} The installed SDK object (also available as `window.AegisSDK`).
 * @throws {TypeError} If `bus` does not expose `on` and `emit` functions.
 */
export function installAegisSDK(bus) {
  if (!bus || typeof bus.on !== 'function' || typeof bus.emit !== 'function') {
    throw new TypeError('installAegisSDK(bus): a shell EventBus with on/emit is required.');
  }

  /** @type {{theme:string,locale:string,authToken:string|null,[key:string]:unknown}|null} */
  let config = null;

  /**
   * Initialise the workbench integration.
   *
   * Applies the host's theme and locale to the document element, stores the config
   * in a closure (including `authToken`, which is never exposed), and publishes
   * `sdk:initialized`. Safe to call more than once: later calls replace the config
   * and publish another initialisation event.
   *
   * Supported fields:
   *   - `theme` (`string`, default `'dark'`): written to
   *     `document.documentElement.dataset.theme` for host stylesheets to react to.
   *   - `locale` (`string`, default `'en'`): written to
   *     `document.documentElement.lang`.
   *   - `authToken` (`string|null`, default `null`): opaque host credential, kept
   *     in memory only. Aegis does not validate, transmit, or persist it.
   *   - any additional keys are retained in the closure but never emitted.
   *
   * @param {{theme?:string,locale?:string,authToken?:string|null,[key:string]:unknown}} [config]
   *   Host configuration. Omit to apply the defaults.
   * @returns {object} This SDK object, so calls can be chained
   *   (`AegisSDK.init(...).on(...)`).
   * @throws {TypeError} If `config` is not an object, or `theme` / `locale` /
   *   `authToken` have the wrong type.
   * @example
   *   AegisSDK.init({ theme: 'dark', locale: 'en', authToken: '<your-token>' });
   */
  function init(hostConfig) {
    config = normalizeConfig(hostConfig);

    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.dataset.theme = config.theme;
      document.documentElement.lang = config.locale;
    }

    bus.emit('sdk:initialized', {
      theme: config.theme,
      locale: config.locale,
      version: SDK_VERSION,
    });
    return sdk;
  }

  /**
   * Subscribe to any shell or module event.
   *
   * This is a direct, zero-copy exposure of the shell's internal EventBus. Callbacks
   * receive the exact payload the state machine saw. The EventBus contains callback
   * exceptions, so a throwing host listener cannot interrupt the closed loop.
   *
   * @param {string} eventName Namespaced event name, for example `audit:append`,
   *   `identity:signed`, `p2p:file-received` or `vault:sealed`.
   * @param {(payload:any)=>void} callback Invoked synchronously on every emission.
   * @returns {()=>void} An unsubscribe function. Call it to remove this listener;
   *   calling it more than once is harmless.
   * @throws {TypeError} If `eventName` is empty or `callback` is not a function.
   * @example
   *   const off = AegisSDK.on('audit:append', (entry) => {
   *     console.log('link', entry.index, entry.hash);
   *   });
   *   off();
   */
  function on(eventName, callback) {
    if (typeof eventName !== 'string' || eventName.trim().length === 0) {
      throw new TypeError('AegisSDK.on(eventName, callback): eventName must be a non-empty string.');
    }
    if (typeof callback !== 'function') {
      throw new TypeError('AegisSDK.on(eventName, callback): callback must be a function.');
    }
    return bus.on(eventName, callback);
  }

  /**
   * Inject an external document into the redaction workbench.
   *
   * Emits `redaktor:load-doc` on the shell bus. `app.js` owns the single listener
   * for that event and forwards the `File` to the `Aegis-REDAKTOR` iframe, which
   * means an SDK-injected document enters exactly the same audited seven-stage
   * loop (hash, sign, deliver, verify, archive, audit) as a document selected from
   * the topology. The SDK does not read the file bytes.
   *
   * A `Blob` without a `name` is accepted and given a neutral filename; pass a real
   * `File` whenever possible so the exported PDF keeps a meaningful name.
   *
   * @param {File|Blob} file The document to redact. Must be a `File` or `Blob`.
   * @returns {Promise<{name:string,size:number,type:string,source:string}>} A receipt
   *   describing what was handed to the shell. Resolving this promise does NOT mean
   *   redaction finished: observe `redaktor:export-ready` for that.
   * @throws {TypeError} If `file` is not a `File` or `Blob`.
   * @example
   *   const input = document.querySelector('input[type=file]');
   *   const receipt = await AegisSDK.injectFile(input.files[0]);
   *   console.log('injected', receipt.name);
   */
  async function injectFile(file) {
    const isBlob = (typeof Blob !== 'undefined' && file instanceof Blob)
      || (typeof File !== 'undefined' && file instanceof File);
    if (!isBlob) {
      throw new TypeError('AegisSDK.injectFile(file): file must be a File or Blob.');
    }

    const name = (typeof file.name === 'string' && file.name.length > 0)
      ? file.name
      : 'injected-document';
    const type = file.type || 'application/octet-stream';
    const size = typeof file.size === 'number' ? file.size : 0;

    bus.emit('redaktor:load-doc', { file, name, source: 'sdk' });
    bus.emit('sdk:file-injected', { name, size, type, source: 'sdk' });

    return { name, size, type, source: 'sdk' };
  }

  /** @type {object} */
  const sdk = {
    init,
    on,
    injectFile,
    /** @type {string} Semantic version of this facade. */
    version: SDK_VERSION,
  };

  if (typeof window !== 'undefined') {
    window.AegisSDK = sdk;
  }
  return sdk;
}
