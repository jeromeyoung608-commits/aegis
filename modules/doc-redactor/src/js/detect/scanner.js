// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * Turns recognized text into redaction rectangles.
 *
 * Strategy: every OCR line is rebuilt from word boxes with a character-offset
 * map, so a regex hit can be projected back onto the exact words that produced
 * it — no fuzzy coordinate guessing.
 */

import { uid } from '../core/utils.js';
import { unionBoxes, overlapRatio, padFor } from '../redact/geometry.js';
import { RULES } from './rules.de.js';
import {
  SALUTATIONS,
  NAME_LABELS,
  NAME_LABELS_CI,
  TITLES,
  cleanToken,
  looksLikePersonName
} from './lexicon.de.js';

const SEVERITY_SCORE = { high: 60, mid: 40, low: 20 };
const OVERLAP_THRESHOLD = 0.62;

// Role labels whose value is on the FOLLOWING line in German business forms.
const LABELLED_NAME_LINE = /^\s*(?:Auftraggeber(?:in)?|Wartungstechniker(?:in)?|Techniker(?:in)?|Mitarbeiter(?:in)?|Kunde|Kundin|Patient(?:in)?|Versicherungsnehmer(?:in)?|Ansprechpartner(?:in)?|Sachbearbeiter(?:in)?|Bearbeiter(?:in)?|Name|Vorname|Nachname)\b/i;

export function buildRuleState() {
  const map = {};
  for (const rule of RULES) map[rule.id] = rule.defaultOn !== false;
  return map;
}

/**
 * @param {object} page            page record with `lines` and `baseW`
 * @param {object} options
 * @param {object} options.ruleState  ruleId -> boolean
 * @param {string[]} options.terms     custom terms (case-insensitive)
 * @param {object[]} options.previous  previous detections (manual ones survive)
 */
export function scanPage(page, { ruleState = {}, terms = [], previous = [] } = {}) {
  const detections = previous.filter((item) => item.source === 'manual');
  const isOn = (id) => ruleState[id] !== false;
  const widthPx = page.baseW || 1200;

  const push = (detection) => detections.push(detection);

  for (const line of page.lines) {
    if (!line.words.length) continue;

    for (const rule of RULES) {
      if (rule.kind !== 'regex' || !isOn(rule.id)) continue;
      rule.pattern.lastIndex = 0;

      for (const match of line.text.matchAll(rule.pattern)) {
        const groupIndex = rule.groupIndex || 0;
        let value = match[groupIndex];
        if (!value) continue;

        let start = match.index + (groupIndex ? match[0].indexOf(value) : 0);
        let end = start + value.length;

        // Trim whitespace that OCR likes to attach to numbers.
        while (start < end && /\s/.test(line.text[start])) start += 1;
        while (end > start && /\s/.test(line.text[end - 1])) end -= 1;
        value = line.text.slice(start, end);
        if (!value) continue;

        if (rule.validate && !rule.validate(value)) continue;

        const box = boxForRange(line.words, start, end);
        if (!box) continue;

        push(makeDetection({
          ruleId: rule.id,
          category: rule.label,
          group: rule.group,
          severity: rule.severity,
          text: value,
          box: padFor(box, widthPx),
          confidence: 0.92,
          source: 'rule'
        }));
      }
    }
  }

  if (isOn('personNames')) {
    for (const line of page.lines) scanSalutationNames(line, push, widthPx);
  }

  if (isOn('personNamesLoose')) {
    for (const line of page.lines) scanLoosePairs(line, push, widthPx);
  }

  if (isOn('personNamesLabeled')) {
    scanLabelledNames(page.lines, push, widthPx);
  }

  if (terms.length) {
    for (const line of page.lines) scanCustomTerms(line, terms, push, widthPx);
  }

  return finalize(detections);
}

/* ── matching helpers ──────────────────────────────────────── */

function boxForRange(words, start, end) {
  const boxes = [];
  for (const word of words) {
    if (word.start >= end) break;
    if (word.end > start && word.start < end) boxes.push(word.box);
  }
  return boxes.length ? unionBoxes(boxes) : null;
}

function scanSalutationNames(line, push, widthPx) {
  const tokens = line.words;

  for (let i = 0; i < tokens.length; i += 1) {
    const token = cleanToken(tokens[i].text);
    const isLabel = NAME_LABELS.has(token) || NAME_LABELS_CI.has(token.toLowerCase());
    if (!SALUTATIONS.has(token) && !isLabel) continue;

    let j = i + 1;
    const collected = [];
    let personCount = 0;

    while (j < tokens.length && collected.length < 4) {
      const next = cleanToken(tokens[j].text);
      if (TITLES.has(next)) {
        collected.push(j);
        j += 1;
        continue;
      }
      if (looksLikePersonName(next)) {
        collected.push(j);
        personCount += 1;
        j += 1;
        continue;
      }
      break;
    }

    if (collected.length && personCount) {
      const box = unionBoxes(collected.map((index) => tokens[index].box));
      const text = collected.map((index) => tokens[index].text).join(' ');
      push(makeDetection({
        ruleId: 'personNames',
        category: 'Person name',
        group: 'identity',
        severity: 'high',
        text,
        box: padFor(box, widthPx),
        confidence: 0.86,
        source: 'rule'
      }));
      i = j - 1;
    }
  }
}

function scanLoosePairs(line, push, widthPx) {
  const tokens = line.words;

  for (let i = 0; i < tokens.length - 1; i += 1) {
    const first = cleanToken(tokens[i].text);
    const second = cleanToken(tokens[i + 1].text);
    if (!looksLikePersonName(first) || !looksLikePersonName(second)) continue;

    const box = unionBoxes([tokens[i].box, tokens[i + 1].box]);
    push(makeDetection({
      ruleId: 'personNamesLoose',
      category: 'Name pair',
      group: 'identity',
      severity: 'low',
      text: `${tokens[i].text} ${tokens[i + 1].text}`,
      box: padFor(box, widthPx),
      confidence: 0.55,
      source: 'rule'
    }));
    i += 1;
  }
}

/** Names printed on the line AFTER a role label, e.g. "Auftraggeber:" then "Hans Mueller". */
function scanLabelledNames(lines, push, widthPx) {
  for (let i = 0; i < lines.length - 1; i += 1) {
    if (!LABELLED_NAME_LINE.test(lines[i].text)) continue;
    const next = lines[i + 1];
    if (!next.words.length) continue;

    const indices = [];
    for (let w = 0; w < next.words.length && indices.length < 2; w += 1) {
      if (!looksLikePersonName(cleanToken(next.words[w].text))) break;
      indices.push(w);
    }
    if (indices.length < 2) continue;

    const box = unionBoxes(indices.map((w) => next.words[w].box));
    const text = indices.map((w) => next.words[w].text).join(' ');
    push(makeDetection({
      ruleId: 'personNamesLabeled',
      category: 'Person name (labelled)',
      group: 'identity',
      severity: 'high',
      text,
      box: padFor(box, widthPx),
      confidence: 0.9,
      source: 'rule'
    }));
  }
}

function scanCustomTerms(line, terms, push, widthPx) {
  const haystack = line.text.toLowerCase();

  for (const raw of terms) {
    const term = raw.trim();
    if (term.length < 2) continue;

    // Label mode: a trailing colon ("Steuer-ID:") redacts the VALUE that
    // follows the label on the same line - this is what lets a user plug the
    // gaps our built-in rules miss (any labelled field) without typing the
    // exact value. Literal mode (no colon) just redacts the keyword itself.
    if (term.endsWith(':')) {
      const label = term.slice(0, -1).trim().toLowerCase();
      if (label.length < 2) continue;

      let from = 0;
      while (from <= haystack.length - label.length) {
        const idx = haystack.indexOf(label, from);
        if (idx === -1) break;

        let valueStart = idx + label.length;
        while (valueStart < line.text.length && /[\s:]/.test(line.text[valueStart])) valueStart++;
        if (valueStart >= line.text.length) { from = idx + label.length; continue; }

        const box = boxForRange(line.words, valueStart, line.text.length);
        if (box) {
          push(makeDetection({
            ruleId: 'custom',
            category: 'Custom term',
            group: 'reference',
            severity: 'high',
            text: line.text.slice(valueStart),
            box: padFor(box, widthPx),
            confidence: 0.96,
            source: 'custom'
          }));
        }
        from = idx + label.length;
      }
      continue;
    }

    // Literal mode: redact the keyword itself.
    const needle = term.toLowerCase();
    let from = 0;
    while (from <= haystack.length - needle.length) {
      const index = haystack.indexOf(needle, from);
      if (index === -1) break;

      const end = index + needle.length;
      const box = boxForRange(line.words, index, end);
      if (box) {
        push(makeDetection({
          ruleId: 'custom',
          category: 'Custom term',
          group: 'reference',
          severity: 'high',
          text: line.text.slice(index, end),
          box: padFor(box, widthPx),
          confidence: 0.96,
          source: 'custom'
        }));
      }
      from = end;
    }
  }
}

/* ── construction & de-duplication ─────────────────────────── */

function makeDetection({ ruleId, category, group, severity, text, box, confidence, source }) {
  return {
    id: uid('d'),
    ruleId,
    category,
    group,
    severity,
    text,
    box,
    confidence,
    source,
    enabled: true
  };
}

export function makeManualDetection(box, widthPx) {
  return makeDetection({
    ruleId: 'manual',
    category: 'Manual area',
    group: 'reference',
    severity: 'high',
    text: '',
    box: padFor(box, widthPx),
    confidence: 1,
    source: 'manual'
  });
}

function score(detection) {
  if (detection.source === 'manual') return 1000;
  if (detection.source === 'custom') return 900;
  return (SEVERITY_SCORE[detection.severity] || 30) + detection.confidence * 20;
}

function finalize(detections) {
  const ranked = detections.slice().sort((a, b) => score(b) - score(a));
  const kept = [];

  for (const detection of ranked) {
    const clash = kept.some((other) => overlapRatio(other.box, detection.box) > OVERLAP_THRESHOLD);
    if (clash) continue;
    kept.push(detection);
  }

  return kept.sort((a, b) => (a.box.y - b.box.y) || (a.box.x - b.box.x));
}
