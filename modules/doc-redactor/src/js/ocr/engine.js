// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * Tesseract worker wrapper.
 *
 * The worker, its WebAssembly core and the language models are served from
 * ./vendor — no CDN, no network. The worker is created lazily and reused for
 * every page; switching languages restarts it.
 */

/**
 * Absolute URLs matter here: the worker resolves importScripts() and fetch()
 * against its own location, not the document, so relative paths would break.
 */
import { getTesseract } from '../adapters/tesseract.js';

const PATHS = {
  workerPath: new URL('vendor/tesseract/worker.min.js', document.baseURI).href,
  corePath: new URL('vendor/tesseract-core', document.baseURI).href,
  langPath: new URL('vendor/tessdata', document.baseURI).href
};

let worker = null;
let workerLang = null;
let logSink = null;

export function isEngineReady() {
  return Boolean(worker);
}

export function getEngineLang() {
  return workerLang;
}

export async function initEngine(lang = 'deu+eng', onLog = null) {
  if (worker && workerLang === lang) {
    logSink = onLog;
    return worker;
  }

  await terminateEngine();
  logSink = onLog;

  const Tesseract = getTesseract();

  worker = await Tesseract.createWorker(lang, 1, {
    workerPath: PATHS.workerPath,
    corePath: PATHS.corePath,
    langPath: PATHS.langPath,
    gzip: true,
    workerBlobURL: false,
    logger: (message) => {
      if (logSink) logSink(message);
    }
  });

  await worker.setParameters({
    tessedit_pageseg_mode: '3',
    preserve_interword_spaces: '1'
  });

  workerLang = lang;
  return worker;
}

export async function terminateEngine() {
  if (worker) {
    try {
      await worker.terminate();
    } catch (err) {
      console.warn('[ocr] terminate failed', err);
    }
  }
  worker = null;
  workerLang = null;
}

/**
 * Recognizes a single page canvas and returns line/word geometry normalized to
 * the page (x, y, w, h ∈ [0, 1]).
 */
export async function recognizePage(page, onLog = null) {
  if (!worker) throw new Error('OCR engine is not initialised');
  logSink = onLog;
  try {
    const { data } = await worker.recognize(page.baseCanvas);
    return normalizeResult(data, page.baseW, page.baseH);
  } finally {
    logSink = null;
  }
}

/* ── result normalization ──────────────────────────────────── */

function readBBox(bbox) {
  if (Array.isArray(bbox) && bbox.length >= 4) {
    return { x: bbox[0], y: bbox[1], w: bbox[2], h: bbox[3] };
  }
  if (bbox && typeof bbox === 'object') {
    return {
      x: bbox.x0 ?? 0,
      y: bbox.y0 ?? 0,
      w: (bbox.x1 ?? 0) - (bbox.x0 ?? 0),
      h: (bbox.y1 ?? 0) - (bbox.y0 ?? 0)
    };
  }
  return null;
}

function addLine(target, rawLine, width, height) {
  const words = [];
  let cursor = 0;

  for (const rawWord of rawLine.words || []) {
    if (!rawWord.text || !rawWord.text.trim()) continue;
    const bbox = readBBox(rawWord.bbox);
    if (!bbox || bbox.w <= 0 || bbox.h <= 0) continue;

    const text = rawWord.text.trim();
    if (words.length) cursor += 1;

    const start = cursor;
    cursor += text.length;

    words.push({
      text,
      start,
      end: cursor,
      conf: rawWord.confidence ?? 0,
      box: {
        x: bbox.x / width,
        y: bbox.y / height,
        w: bbox.w / width,
        h: bbox.h / height
      }
    });
  }

  if (!words.length) return;

  target.push({
    text: words.map((word) => word.text).join(' '),
    conf: rawLine.confidence ?? 0,
    words
  });
}

export function normalizeResult(data, width, height) {
  const lines = [];
  const blocks = Array.isArray(data.blocks) ? data.blocks : [];

  for (const block of blocks) {
    for (const paragraph of block.paragraphs || []) {
      for (const line of paragraph.lines || []) {
        addLine(lines, line, width, height);
      }
    }
  }

  if (!lines.length && Array.isArray(data.lines)) {
    for (const line of data.lines) addLine(lines, line, width, height);
  }

  if (!lines.length && Array.isArray(data.words)) {
    addLine(lines, { words: data.words, confidence: data.confidence }, width, height);
  }

  return {
    lines,
    text: data.text || '',
    confidence: data.confidence || 0
  };
}
