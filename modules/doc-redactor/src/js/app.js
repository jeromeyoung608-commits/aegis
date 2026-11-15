// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
/**
 * Application entry point: wires the DOM, owns the workflow and keeps the
 * derived UI in sync with core/state.js.
 *
 * Flow: files → pages → OCR queue → rule scan → review → destructive PDF export.
 */

import { audit, onAudit, probeExternalConnection } from './core/offline-guard.js';
import { state, getActivePage, getPageById, countDetections } from './core/state.js';
import { debounce, downloadBlob, uid } from './core/utils.js';
import { isSupportedFile, loadSource } from './ingest/sources.js';
import { buildPages, OCR_DPI } from './ingest/page-factory.js';
import { initEngine, recognizePage } from './ocr/engine.js';
import { RULES } from './detect/rules.de.js';
import { buildRuleState, scanPage, makeManualDetection } from './detect/scanner.js';
import { createPageView } from './view/page-view.js';
import { exportRedactedPdf, buildAuditReport } from './export/pdf-builder.js';
import { toast } from './ui/toast.js';
import { renderDocuments } from './ui/documents.js';
import { renderRules } from './ui/rules.js';
import { renderFindings } from './ui/findings.js';
import { createStatusController } from './ui/status.js';

const $ = (id) => document.getElementById(id);

/* ── DOM references ────────────────────────────────────────── */

const dom = {
  fileInput: $('fileInput'),
  pickBtn: $('pickBtn'),
  dropzone: $('dropzone'),
  docList: $('docList'),
  clearAll: $('clearAll'),
  pageCanvas: $('pageCanvas'),
  canvasWrap: $('canvasWrap'),
  canvasScroll: $('canvasScroll'),
  emptyState: $('emptyState'),
  pageChip: $('pageChip'),
  modeSelect: $('modeSelect'),
  modeDraw: $('modeDraw'),
  zoomIn: $('zoomIn'),
  zoomOut: $('zoomOut'),
  zoomFit: $('zoomFit'),
  zoomValue: $('zoomValue'),
  btnDocs: $('btnDocs'),
  railLeft: $('railLeft'),
  btnDrawer: $('btnDrawer'),
  railRight: $('railRight'),
  railScrim: $('railScrim'),
  ruleList: $('ruleList'),
  termInput: $('termInput'),
  hitList: $('hitList'),
  hitsMeta: $('hitsMeta'),
  clearHits: $('clearHits'),
  exportBtn: $('exportBtn'),
  reportBtn: $('reportBtn'),
  dpiChips: $('dpiChips'),
  formatChips: $('formatChips'),
  optVectorRects: $('optVectorRects'),
  auditReq: $('auditReq'),
  auditBlocked: $('auditBlocked'),
  auditReq2: $('auditReq2'),
  auditBlocked2: $('auditBlocked2'),
  netBadge: $('netBadge'),
  netCount: $('netCount'),
  statusText: $('statusText'),
  statusDot: $('statusDot'),
  statusProgress: $('statusProgress'),
  progressBar: $('progressBar'),
  progressText: $('progressText'),
  statPages: $('statPages'),
  statHits: $('statHits'),
  statEngine: $('statEngine'),
  helpBtn: $('helpBtn'),
  helpModal: $('helpModal'),
  hitSummary: $('hitSummary'),
  hitTabCount: $('hitTabCount'),
  auditTest: $('auditTest')
};

/* ── Status controller ─────────────────────────────────────── */

const status = createStatusController({
  statusText: dom.statusText,
  statusDot: dom.statusDot,
  progressWrap: dom.statusProgress,
  progressBar: dom.progressBar,
  progressText: dom.progressText,
  statPages: dom.statPages,
  statHits: dom.statHits,
  hitSummary: dom.hitSummary,
  hitTabCount: dom.hitTabCount
});

/* ── Preview view ──────────────────────────────────────────── */

const view = createPageView({
  canvas: dom.pageCanvas,
  wrap: dom.canvasWrap,
  onAddBox: addManualBox,
  onSelect: (id) => {
    state.selectedId = id;
    view.setSelected(id);
    renderAll();
  },
  onZoomChange: (zoom) => {
    dom.zoomValue.textContent = `${Math.round(zoom * 100)}%`;
  }
});

/* ── Workflow state ────────────────────────────────────────── */

let renderedPageId = null;
let ocrQueueRunning = false;
let ocrQueuedAgain = false;

/* ── Boot ──────────────────────────────────────────────────── */

state.rules = buildRuleState();
state.customTerms = [];
renderAll();
status.message('Ready', 'idle');
dom.statEngine.textContent = `OCR ready · ${state.engineLang}`;
bindAudit();

// When embedded in the Aegis shell the document is always injected by the shell
// (a topology node or a received artifact), so the local file picker is
// redundant. Worse, clicking the dropzone would pop the browser's native
// chooser whose labels follow the OS language (e.g. "Choose file" on an English
// system) and clash with the otherwise-English UI. Hide that entry point here.
if (window.parent !== window) {
  const dz = document.getElementById('dropzone');
  if (dz) dz.hidden = true;
}

/* ── Workflow: intake ──────────────────────────────────────── */

async function addFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  for (const file of files) {
    if (!isSupportedFile(file)) {
      toast(`Unsupported file type: ${file.name}`, 'error');
      continue;
    }

    status.message(`Reading ${file.name}…`, 'busy');

    try {
      const source = await loadSource(file);
      source.docId = uid('doc');
      const pages = await buildPages(source);

      state.pages.push(...pages);
      // Always focus the newly added pages. Appending while a document was
      // already open used to keep the view on the old page with zero visible
      // feedback — the shell's "Open in REDAKTOR" looked like it did nothing.
      if (pages.length) {
        state.activePageId = pages[0].id;
        renderedPageId = null;
      }

      renderAll();
      toast(`${file.name} · ${pages.length} page${pages.length === 1 ? '' : 's'} added`, 'ok');
    } catch (err) {
      console.error('[intake]', err);
      toast(`Could not read ${file.name}: ${err.message || err}`, 'error');
    }
  }

  status.message('Ready', 'idle');
  startOcrQueue();
}

/* ── Workflow: OCR queue ───────────────────────────────────── */

async function startOcrQueue() {
  if (ocrQueueRunning) {
    ocrQueuedAgain = true;
    return;
  }

  const candidates = state.pages.filter(
    (page) => page.status !== 'done' || page.lang !== state.engineLang
  );
  if (!candidates.length) return;

  ocrQueueRunning = true;
  dom.pickBtn.setAttribute('aria-busy', 'true');

  try {
    status.message('Loading OCR engine (WebAssembly)…', 'busy');
    status.progress(0);

    await initEngine(state.engineLang, (message) => {
      if (message.status === 'recognizing text' && message.progress != null) {
        // Engine-level progress is refined per page below.
      }
    });

    dom.statEngine.textContent = `OCR ready · ${state.engineLang}`;
    const attempted = new Set();

    for (;;) {
      const page = state.pages.find(
        (item) =>
          !attempted.has(item.id) &&
          (item.status !== 'done' || item.lang !== state.engineLang)
      );
      if (!page) break;
      attempted.add(page.id);

      page.status = 'ocr';
      renderDocuments(dom.docList, state.pages, state.activePageId);
      status.message(`Scanning ${page.docName} · page ${page.pageNumber}`, 'busy');

      try {
        const result = await recognizePage(page, (message) => {
          if (message.status !== 'recognizing text' || message.progress == null) return;
          const total = Math.max(1, state.pages.length);
          const finished = state.pages.filter((item) => item.status === 'done').length;
          status.progress(((finished + message.progress) / total) * 100);
        });

        page.lines = result.lines;
        page.words = result.lines.flatMap((line) => line.words);
        page.status = 'done';
        page.lang = state.engineLang;
        rescanPage(page);
      } catch (err) {
        console.error('[ocr]', err);
        page.status = 'error';
        toast(`OCR failed on ${page.docName} · page ${page.pageNumber}`, 'error');
      }

      renderAll();
    }

    status.progress(null);
    status.message('Scan complete', 'ok');
  } catch (err) {
    console.error('[ocr-engine]', err);
    status.progress(null);
    status.message('OCR engine failed to start', 'error');
    toast(`OCR engine error: ${err.message || err}`, 'error');
  } finally {
    ocrQueueRunning = false;
    state.ocrBusy = false;
    dom.pickBtn.setAttribute('aria-busy', 'false');

    if (ocrQueuedAgain) {
      ocrQueuedAgain = false;
      startOcrQueue();
    }
  }
}

/* ── Workflow: scanning & selection ───────────────────────── */

function rescanPage(page) {
  page.detections = scanPage(page, {
    ruleState: state.rules,
    terms: state.customTerms,
    previous: page.detections
  });
}

function rescanAll() {
  for (const page of state.pages) {
    if (page.lines.length) rescanPage(page);
  }
  state.selectedId = null;
  renderAll();
}

function addManualBox(box) {
  const page = getActivePage();
  if (!page) return;

  const detection = makeManualDetection(box, page.baseW);
  page.detections.push(detection);
  state.selectedId = detection.id;

  view.setSelected(detection.id);
  renderAll();
  toast('Manual redaction added', 'ok', 2000);
}

function selectDetection(pageId, detectionId) {
  if (pageId && pageId !== state.activePageId) {
    state.activePageId = pageId;
    renderedPageId = null;
  }
  state.selectedId = detectionId;
  renderAll();
}

function removeDetection(pageId, detectionId) {
  const page = getPageById(pageId);
  if (!page) return;

  page.detections = page.detections.filter((item) => item.id !== detectionId);
  if (state.selectedId === detectionId) state.selectedId = null;
  renderAll();
}

function removeSelected() {
  const page = getActivePage();
  if (!page || !state.selectedId) return;
  removeDetection(page.id, state.selectedId);
}

/* ── Workflow: export ──────────────────────────────────────── */

async function runExport() {
  if (!state.pages.length || state.exporting) return;

  const unscanned = state.pages.filter((page) => page.status !== 'done');
  if (unscanned.length) {
    const proceed = window.confirm(
      `${unscanned.length} page(s) have not been scanned yet. Export anyway?`
    );
    if (!proceed) return;
  }

  state.exporting = true;
  dom.exportBtn.disabled = true;
  dom.exportBtn.setAttribute('aria-busy', 'true'); // N-04: expose long-task state to assistive tech
  status.message('Building PDF…', 'busy');
  status.progress(0);

  try {
    const blob = await exportRedactedPdf(state.pages, state.export, (done, total) => {
      status.message(`Building PDF · page ${done} of ${total}`, 'busy');
      status.progress((done / total) * 100);
    });

    downloadBlob(blob, outputFilename());
    toast('Redacted PDF exported', 'ok');
    status.message('Export complete', 'ok');
  } catch (err) {
    console.error('[export]', err);
    toast(`Export failed: ${err.message || err}`, 'error');
    status.message('Export failed', 'error');
  } finally {
    state.exporting = false;
    dom.exportBtn.setAttribute('aria-busy', 'false');
    status.progress(null);
    renderAll();
  }
}

function downloadReport() {
  const report = buildAuditReport(state.pages, state.export);
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${baseName()}-redaction-report.json`);
  toast('Audit report saved', 'ok');
}

function baseName() {
  const first = state.pages[0];
  const raw = first ? first.docName : 'document';
  return raw.replace(/\.(pdf|png|jpe?g|webp|bmp|gif)$/i, '') || 'document';
}

function outputFilename() {
  return `${baseName()}-redacted.pdf`;
}

/* ── Rendering ────────────────────────────────────────────── */

function ruleCounts() {
  const counts = {};
  for (const page of state.pages) {
    for (const detection of page.detections) {
      if (detection.enabled === false) continue;
      counts[detection.ruleId] = (counts[detection.ruleId] || 0) + 1;
    }
  }
  return counts;
}

function renderAll() {
  renderDocuments(dom.docList, state.pages, state.activePageId);
  renderRules(dom.ruleList, RULES, state.rules, ruleCounts());
  renderFindings(dom.hitList, state.pages, state.activePageId, state.selectedId);

  const hits = countDetections();
  status.counts(state.pages, hits);
  updateMeta(hits);
  updateEmptyState();
  syncView();

  dom.exportBtn.disabled = !state.pages.length || state.exporting;
  dom.reportBtn.disabled = !state.pages.length;
  // N-03 (final): make the produce/export entry point unmissable for legal users
  // who work in the default Rules pane. Signal readiness in BOTH the active panel
  // (contextual callout) and on the Export tab (badge) — never hide the deliverable.
  const ready = !!(state.pages.length && !state.exporting);
  const exportTab = document.querySelector('.tab[data-tab="export"]');
  if (exportTab) exportTab.dataset.ready = ready ? '1' : '';
  const exportHint = document.getElementById('exportHint');
  if (exportHint) exportHint.hidden = !ready;
}

function updateMeta(hits) {
  const page = getActivePage();

  if (page) {
    const total = state.pages.filter((item) => item.docId === page.docId).length;
    dom.pageChip.textContent = `${page.docName} · page ${page.pageNumber} of ${total}`;
    dom.hitsMeta.textContent = `${hits} finding${hits === 1 ? '' : 's'} across ${state.pages.filter((item) => item.status === 'done').length} scanned page(s).`;
  } else {
    dom.pageChip.textContent = 'No page';
    dom.hitsMeta.textContent = 'No page has been scanned yet.';
  }
}

function updateEmptyState() {
  const page = getActivePage();
  dom.emptyState.hidden = Boolean(page);
  dom.canvasScroll.hidden = !page;
}

function syncView() {
  const page = getActivePage();

  if (!page) {
    renderedPageId = null;
    view.setPage(null);
    return;
  }

  if (page.id !== renderedPageId) {
    renderedPageId = page.id;
    view.setPage(page);
  }

  view.setSelected(state.selectedId);
  view.render();
}

/* ── UI bindings ──────────────────────────────────────────── */

function bindAudit() {
  onAudit((counters) => {
    const blocked = counters.blocked;
    dom.netCount.textContent = String(counters.external);
    if (dom.auditReq) dom.auditReq.textContent = String(counters.external);
    if (dom.auditBlocked) dom.auditBlocked.textContent = String(blocked);
    if (dom.auditReq2) dom.auditReq2.textContent = String(counters.external);
    if (dom.auditBlocked2) dom.auditBlocked2.textContent = String(blocked);
  });
}

function setMode(mode) {
  state.mode = mode;
  dom.modeSelect.classList.toggle('is-active', mode === 'review');
  dom.modeDraw.classList.toggle('is-active', mode === 'mark');
  view.setMode(mode);
}

function clearWorkspace() {
  if (!state.pages.length) return;
  if (!window.confirm('Remove all documents and redactions from this session?')) return;

  const disposed = new Set();
  for (const page of state.pages) {
    if (disposed.has(page.docId)) continue;
    disposed.add(page.docId);
    if (page.kind === 'pdf' && page.pdf) page.pdf.destroy().catch(() => {});
    if (page.bitmap) page.bitmap.close();
  }

  state.pages = [];
  state.activePageId = null;
  state.selectedId = null;
  state.customTerms = [];
  dom.termInput.value = '';
  renderedPageId = null;

  view.setPage(null);
  status.message('Ready', 'idle');
  status.progress(null);
  renderAll();
}

/* File picker & drag and drop */
dom.pickBtn.addEventListener('click', (event) => {
  event.stopPropagation();
  dom.fileInput.click();
});

dom.dropzone.addEventListener('click', () => dom.fileInput.click());

dom.dropzone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    dom.fileInput.click();
  }
});

dom.fileInput.addEventListener('change', () => {
  addFiles(dom.fileInput.files);
  dom.fileInput.value = '';
});

['dragenter', 'dragover'].forEach((type) => {
  dom.dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    dom.dropzone.classList.add('is-over');
  });
});

['dragleave', 'drop'].forEach((type) => {
  dom.dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    dom.dropzone.classList.remove('is-over');
  });
});

dom.dropzone.addEventListener('drop', (event) => {
  const files = event.dataTransfer ? event.dataTransfer.files : null;
  if (files && files.length) addFiles(files);
});

window.addEventListener('dragover', (event) => event.preventDefault());
window.addEventListener('drop', (event) => event.preventDefault());

/* Document list */
dom.docList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-page]');
  if (!button) return;
  state.activePageId = button.dataset.page;
  state.selectedId = null;
  renderedPageId = null;
  renderAll();
});

dom.clearAll.addEventListener('click', clearWorkspace);

/* Rules */
dom.ruleList.addEventListener('click', (event) => {
  const row = event.target.closest('[data-rule]');
  if (!row) return;
  const id = row.dataset.rule;
  state.rules[id] = !(state.rules[id] !== false);
  rescanAll();
});

dom.ruleList.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const row = event.target.closest('[data-rule]');
  if (!row) return;
  event.preventDefault();
  state.rules[row.dataset.rule] = !(state.rules[row.dataset.rule] !== false);
  rescanAll();
});

/* Custom terms */
dom.termInput.addEventListener('input', debounce(() => {
  state.customTerms = dom.termInput.value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length >= 2);
  rescanAll();
}, 380));

/* Findings */
dom.hitList.addEventListener('click', (event) => {
  const remove = event.target.closest('[data-del]');
  if (remove) {
    removeDetection(remove.dataset.page, remove.dataset.del);
    return;
  }

  const item = event.target.closest('[data-hit]');
  if (!item) return;
  selectDetection(item.dataset.page, item.dataset.hit);
});

dom.clearHits.addEventListener('click', () => {
  const total = countDetections();
  if (!total) return;
  if (!window.confirm(`Delete all ${total} redactions?`)) return;
  for (const page of state.pages) page.detections = [];
  state.selectedId = null;
  renderAll();
});

/* Tabs */
function activateTab(name) {
  document.querySelectorAll('.tab').forEach((item) => {
    item.classList.toggle('is-active', item.dataset.tab === name);
  });
  document.querySelectorAll('.pane').forEach((pane) => {
    pane.classList.toggle('is-active', pane.dataset.pane === name);
  });
}

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => activateTab(tab.dataset.tab));
});

dom.netBadge.addEventListener('click', () => activateTab('export'));

/* Mode & zoom */
dom.modeSelect.addEventListener('click', () => setMode('review'));
dom.modeDraw.addEventListener('click', () => setMode('mark'));
dom.zoomIn.addEventListener('click', () => view.setZoom(view.getZoom() * 1.18));
dom.zoomOut.addEventListener('click', () => view.setZoom(view.getZoom() * 0.85));
dom.zoomFit.addEventListener('click', () => view.fit());
dom.zoomValue.addEventListener('click', () => view.fit());

/* Responsive side-panel drawer. Below 980px the 3-column layout collapses and
   the right rail (Rules / Findings / Export — incl. Custom terms) slides
   off-screen; this toggle is the only way to reach it when REDAKTOR is embedded
   in a narrow shell sidebar. Manual redaction is the high-frequency path, so it
   must stay one tap away. */
function setDrawer(which, open) {
  dom.railLeft.classList.toggle('is-open', which === 'left' && open);
  dom.railRight.classList.toggle('is-open', which === 'right' && open);
  dom.railScrim.hidden = !open;
}
if (dom.btnDocs) dom.btnDocs.addEventListener('click', () =>
  setDrawer('left', !dom.railLeft.classList.contains('is-open')));
if (dom.btnDrawer) dom.btnDrawer.addEventListener('click', () =>
  setDrawer('right', !dom.railRight.classList.contains('is-open')));
if (dom.railScrim) dom.railScrim.addEventListener('click', () => setDrawer(null, false));

/* Export settings */
dom.dpiChips.addEventListener('click', (event) => {
  const chip = event.target.closest('[data-dpi]');
  if (!chip) return;
  state.export.dpi = Number(chip.dataset.dpi);
  dom.dpiChips.querySelectorAll('.chip').forEach((item) => {
    item.classList.toggle('is-active', item === chip);
  });
});

dom.formatChips.addEventListener('click', (event) => {
  const chip = event.target.closest('[data-format]');
  if (!chip) return;
  state.export.format = chip.dataset.format;
  dom.formatChips.querySelectorAll('.chip').forEach((item) => {
    item.classList.toggle('is-active', item === chip);
  });
});

dom.optVectorRects.addEventListener('change', () => {
  state.export.vectorRects = dom.optVectorRects.checked;
});

dom.exportBtn.addEventListener('click', runExport);
dom.reportBtn.addEventListener('click', downloadReport);

/* Offline audit */
dom.auditTest.addEventListener('click', async () => {
  dom.auditTest.setAttribute('aria-busy', 'true');
  try {
    status.message('Testing outbound connection…', 'busy');
    const result = await probeExternalConnection();
    if (result.blocked) {
      status.message('Offline guard active', 'ok');
      toast('Connection attempt blocked by the local guard — as intended.', 'ok');
    } else {
      status.message('Guard inactive', 'error');
      toast('Unexpected: an outbound request succeeded.', 'error');
    }
  } finally {
    dom.auditTest.setAttribute('aria-busy', 'false');
  }
});

/* Help modal */
dom.helpBtn.addEventListener('click', () => {
  dom.helpModal.hidden = false;
});

dom.helpModal.addEventListener('click', (event) => {
  if (event.target.closest('[data-close]') || event.target.classList.contains('modal-backdrop')) {
    dom.helpModal.hidden = true;
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') dom.helpModal.hidden = true;

  const tag = (event.target.tagName || '').toLowerCase();
  if (tag === 'textarea' || tag === 'input') return;

  if (event.key === '1') setMode('review');
  if (event.key === '2') setMode('mark');

  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (state.selectedId) {
      event.preventDefault();
      removeSelected();
    }
  }
});

/* Expose a tiny debug surface for maintenance — and for the Aegis shell. */
window.REDAKTOR = {
  state,
  audit,
  ocrDpi: OCR_DPI,
  scanPage,
  // Load a File/Blob into the intake queue (used by the Aegis integration).
  addFiles,
  // Build the destructive redacted PDF and hand the Blob to the parent shell so it
  // can forward the file into the P2P transfer module. Returns the Blob too.
  async exportToParent() {
    if (!state.pages.length) { toast('No document loaded', 'error'); return null; }
    const blob = await exportRedactedPdf(state.pages, state.export, () => {});
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        channel: 'aegis', type: 'redaktor:export-ready',
        name: outputFilename(), blob,
      }, '*');
    }
    return blob;
  },
};
