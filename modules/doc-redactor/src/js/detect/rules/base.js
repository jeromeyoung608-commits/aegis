// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * Shared detection rules — language-agnostic PII that looks the same in every
 * European language: email, IBAN, monetary amounts, dates and phone numbers.
 * Locale files (rules.de.js / rules.en.js / rules.fr.js) import SHARED_RULES and
 * append their country-specific patterns on top, so every locale inherits these.
 *
 * Shape of a rule: see rules.de.js header.
 */

export const GROUP_ORDER = ['identity', 'contact', 'location', 'financial', 'reference', 'date'];

export const GROUP_LABELS = {
  identity: 'Identity & numbers',
  contact: 'Contact details',
  location: 'Addresses',
  financial: 'Financial data',
  reference: 'Reference numbers',
  date: 'Dates'
};

const digitsOf = (value) => String(value).replace(/\D/g, '');

/* ── validators (shared across locales) ─────────────────────── */

export function isValidIban(value) {
  const compact = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (compact.length < 15 || compact.length > 34) return false;
  if (!/^[A-Z]{2}\d{2}/.test(compact.slice(0, 4))) return false;
  const rearranged = compact.slice(4) + compact.slice(0, 4);
  let mod = 0;
  for (const character of rearranged) {
    const code = character >= 'A' && character <= 'Z'
      ? character.charCodeAt(0) - 55
      : character.charCodeAt(0) - 48;
    if (code < 0 || code > 35) return false;
    mod = (mod * (code >= 10 ? 100 : 10) + code) % 97;
  }
  return mod === 1;
}

export function isValidPhone(value) {
  const digits = digitsOf(value);
  return digits.length >= 7 && digits.length <= 16;
}

function plausibleDate(day, month, year) {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;
  const daysInMonth = new Date(year, month, 0).getDate();
  return day <= daysInMonth;
}

// Accepts ISO (yyyy-mm-dd), German dotted (dd.mm.yyyy) and English slashed
// (mm/dd/yyyy or dd/mm/yyyy) — either slash ordering is accepted if plausible.
export function isValidDate(value) {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (iso) return plausibleDate(Number(iso[3]), Number(iso[2]), Number(iso[1]));
  const dotted = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/.exec(value);
  if (dotted) {
    const day = Number(dotted[1]);
    const month = Number(dotted[2]);
    const year = dotted[3].length === 2 ? 2000 + Number(dotted[3]) : Number(dotted[3]);
    return plausibleDate(day, month, year);
  }
  const slashed = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(value);
  if (!slashed) return false;
  const a = Number(slashed[1]);
  const b = Number(slashed[2]);
  const year = slashed[3].length === 2 ? 2000 + Number(slashed[3]) : Number(slashed[3]);
  // Try US (mm/dd) first, then European (dd/mm).
  if (a <= 12 && plausibleDate(b, a, year)) return true;
  if (b <= 12 && plausibleDate(a, b, year)) return true;
  return false;
}

/* ── shared catalogue ───────────────────────────────────────── */

export const SHARED_RULES = [
  {
    id: 'email',
    kind: 'regex',
    group: 'contact',
    label: 'Email address',
    example: 'anna.schmidt@example.de',
    severity: 'high',
    defaultOn: true,
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g
  },
  {
    id: 'iban',
    kind: 'regex',
    group: 'financial',
    label: 'IBAN',
    example: 'DE89 3704 0044 0532 0130 00',
    severity: 'high',
    defaultOn: true,
    pattern: /\b(?:DE|AT|CH|FR|NL|BE|LU|IT|ES|PT|PL|CZ|SK|DK|SE|FI|NO|GB|IE|US)\d{2}(?:[ \u00A0]?\d{4}){3,7}(?:[ \u00A0]?\d{1,4})?\b/g,
    validate: isValidIban
  },
  {
    id: 'phone',
    kind: 'regex',
    group: 'contact',
    label: 'Phone number',
    example: '+49 30 1234567',
    severity: 'high',
    defaultOn: true,
    // Generic international phone: optional +, 7–16 digits after stripping
    // separators. Catches +49 / +1 / +44 / 0xx alike across locales.
    pattern: /(?:^|[\s(])\+?\d[\d \u00A0.\-()\/]{6,18}\d/g,
    validate: isValidPhone
  },
  {
    id: 'date',
    kind: 'regex',
    group: 'date',
    label: 'Date',
    example: '12.03.1985',
    severity: 'mid',
    defaultOn: true,
    pattern: /\b(?:\d{1,2}\.\d{1,2}\.\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})\b/g,
    validate: isValidDate
  },
  {
    id: 'amount',
    kind: 'regex',
    group: 'financial',
    label: 'Amount',
    example: '1.250,00 €',
    severity: 'mid',
    defaultOn: true,
    // € / EUR / Euro, £ / GBP, $ / USD — both "1.250,00 €" and "$1,250.00" forms.
    pattern: /\b\d{1,3}(?:\.\d{3})*(?:,\d{2})?[ \u00A0]?(?:€|EUR|Euro)(?!\w)|\b(?:€|EUR|£|GBP|\$)[ \u00A0]?\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\b\d{1,3}(?:\.\d{3})*(?:\.\d{2})?[ \u00A0]?\$(?!\w)/gi
  },
  {
    id: 'longDigits',
    kind: 'regex',
    group: 'reference',
    label: 'Long digit string',
    example: '1234567890',
    severity: 'low',
    defaultOn: false,
    pattern: /\b\d{7,}\b/g
  }
];
