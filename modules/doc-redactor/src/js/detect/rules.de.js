// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * Rule catalogue for German business, legal and medical paperwork.
 *
 * Adding a rule = adding one object here. The scanner, the rules panel and the
 * findings panel are all driven by this list.
 *
 * Shape:
 *   id           stable identifier (also used as state key)
 *   kind         'regex' | 'heuristic'
 *   group        UI grouping key (see GROUP_ORDER)
 *   label        English label shown in the findings list
 *   example      short sample rendered under the rule name
 *   severity     'high' | 'mid' | 'low' (drives de-duplication priority)
 *   defaultOn    initial toggle state
 *   pattern      global RegExp (regex rules only)
 *   groupIndex   capture group that carries the sensitive value (default 0)
 *   validate     optional predicate for false-positive reduction
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

/* ── validators ────────────────────────────────────────────── */

function isValidIban(value) {
  const compact = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (compact.length < 15 || compact.length > 34) return false;
  if (!/^[A-Z]{2}\d{2}$/.test(compact.slice(0, 4))) return false;
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

/** Official ISO 7064 MOD 11,10 check for the German tax identification number. */
function isValidTaxId(value) {
  const digits = digitsOf(value);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  let product = 10;
  for (let i = 0; i < 10; i += 1) {
    let sum = (Number(digits[i]) + product) % 10;
    if (sum === 0) sum = 10;
    product = (sum * 2) % 11;
  }
  let check = 11 - product;
  if (check === 10) check = 0;
  return check === Number(digits[10]);
}

/** German social-security number: DDMMYY must be a plausible birth date. */
function isValidSocialSecurity(value) {
  const digits = digitsOf(value);
  if (digits.length !== 11) return false;
  const day = Number(digits.slice(2, 4));
  const month = Number(digits.slice(4, 6));
  return day >= 1 && day <= 31 && month >= 1 && month <= 12;
}

function isValidDate(value) {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (iso) {
    const [, year, month, day] = iso;
    return plausibleDate(Number(day), Number(month), Number(year));
  }
  const dotted = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/.exec(value);
  if (!dotted) return false;
  const [, day, month, year] = dotted;
  const fullYear = year.length === 2 ? 2000 + Number(year) : Number(year);
  return plausibleDate(Number(day), Number(month), fullYear);
}

function plausibleDate(day, month, year) {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;
  const daysInMonth = new Date(year, month, 0).getDate();
  return day <= daysInMonth;
}

function isValidPhone(value) {
  const digits = digitsOf(value);
  return digits.length >= 7 && digits.length <= 16;
}

/* ── catalogue ─────────────────────────────────────────────── */

export const RULES = [
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
    id: 'vatId',
    kind: 'regex',
    group: 'financial',
    label: 'VAT ID (DE)',
    example: 'DE 123 456 789',
    severity: 'high',
    defaultOn: true,
    pattern: /\bDE[ \u00A0]?\d{3}[ \u00A0]?\d{3}[ \u00A0]?\d{3}\b/g,
    validate: (value) => digitsOf(value).length === 9
  },
  {
    id: 'taxId',
    kind: 'regex',
    group: 'identity',
    label: 'Tax ID (Steuer-ID)',
    example: '12 345 678 903', // ISO 7064 MOD 11,10 valid
    severity: 'high',
    defaultOn: true,
    pattern: /\b\d{2}[ \u00A0]?\d{3}[ \u00A0]?\d{3}[ \u00A0]?\d{3}\b/g,
    validate: isValidTaxId
  },
  {
    id: 'socialSecurity',
    kind: 'regex',
    group: 'identity',
    label: 'Social security no.',
    example: '12 010190 A 123',
    severity: 'high',
    defaultOn: true,
    pattern: /\b\d{2}[ \u00A0]?\d{6}[ \u00A0]?[A-ZÄÖÜ][ \u00A0]?\d{3}\b/g,
    validate: isValidSocialSecurity
  },
  {
    id: 'healthInsuranceId',
    kind: 'regex',
    group: 'identity',
    label: 'Health insurance no.',
    example: 'A1234567890',
    severity: 'high',
    defaultOn: true,
    pattern: /\b[A-HJ-NP-Z]\d{9,10}\b/g
  },
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
    id: 'phone',
    kind: 'regex',
    group: 'contact',
    label: 'Phone number',
    example: '+49 30 1234567',
    severity: 'high',
    defaultOn: true,
    pattern: /(?:^|\s)(?:\+49|0049|0)[\u00A0 ]*[\d][\d \u00A0\-/()]{6,20}/g,
    validate: isValidPhone
  },
  {
    id: 'streetAddress',
    kind: 'regex',
    group: 'location',
    label: 'Street address',
    example: 'Hauptstraße 12a',
    severity: 'mid',
    defaultOn: true,
    pattern: /\b[A-ZÄÖÜ][A-Za-zÄÖÜäöüß.\-']{1,40}(?:straße|strasse|str\.|weg|gasse|allee|platz|ring|damm|ufer|hof|berg|feld|park)[ \u00A0]?\d{1,4}[a-zA-Z]?\b/g
  },
  {
    id: 'postalCity',
    kind: 'regex',
    group: 'location',
    label: 'Postcode + city',
    example: '10115 Berlin',
    severity: 'mid',
    defaultOn: true,
    pattern: /\b\d{5}[ \u00A0]+[A-ZÄÖÜ][a-zäöüß\-]{2,}(?:[ \u00A0]+[A-ZÄÖÜ][a-zäöüß\-]{2,})?\b/g
  },
  {
    id: 'date',
    kind: 'regex',
    group: 'date',
    label: 'Date',
    example: '12.03.1985',
    severity: 'mid',
    defaultOn: true,
    pattern: /\b(?:\d{1,2}\.\d{1,2}\.\d{2,4}|\d{4}-\d{2}-\d{2})\b/g,
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
    pattern: /\b\d{1,3}(?:\.\d{3})*(?:,\d{2})?[ \u00A0]?(?:€|EUR|Euro)(?!\w)|\b(?:€|EUR)[ \u00A0]?\d{1,3}(?:\.\d{3})*(?:,\d{2})?/gi
  },
  {
    id: 'caseNumber',
    kind: 'regex',
    group: 'reference',
    label: 'Case / file number',
    example: 'Az. 4 C 123/25',
    severity: 'mid',
    defaultOn: true,
    pattern: /\b(?:Az\.|Aktenzeichen|Aktz\.|Fall(?:-|\s)?Nr\.|Fallnummer|Vorgangs(?:-|\s)?Nr\.|Vorgangsnummer|Rechnungs(?:-|\s)?Nr\.|Rechnungsnummer|Patienten(?:-|\s)?Nr\.|Versicherten(?:-|\s)?Nr\.|Kunden(?:-|\s)?Nr\.|Kundennummer|Vertrags(?:-|\s)?Nr\.|Vertragsnummer|Debitoren(?:-|\s)?Nr\.|Personal(?:-|\s)?Nr\.)[ \u00A0]*[:#]?[ \u00A0]*([A-Za-z0-9][A-Za-z0-9/\-.]{0,})/gi,
    groupIndex: 1
  },
  {
    // Label-driven fallback for high-risk identifiers that the strict checksum
    // rules can reject (e.g. a sample Steuer-ID with an invalid check digit) or
    // that have no dedicated rule at all (Personalausweis, Kontonummer,
    // Versichertennummer). The label itself is a strong enough signal: redact
    // the value even when its format or checksum is not verifiable.
    id: 'labeledPii',
    kind: 'regex',
    group: 'identity',
    label: 'Labelled PII number',
    example: 'Steuer-ID: 12 345 678 901',
    severity: 'high',
    defaultOn: true,
    pattern: /\b(?:Steuer[ \u00A0-]?(?:ID|Id|Nr\.?|Identifikationsnummer|nummer)|Steuernummer|Steueridentifikationsnummer|Versicherten[ \u00A0-]?(?:nummer|Nr\.?)|Versicherungsnummer|Sozialversicherungs[ \u00A0-]?(?:nummer|Nr\.?)|Personalausweis(?:[ \u00A0-]?(?:nummer|Nr\.?))?|Ausweis[ \u00A0-]?(?:nummer|Nr\.?)|Bankverbindung|Kontonummer|Konto[ \u00A0-]?(?:nummer|Nr\.?)|Konto)\b[ \u00A0]*[:#]?[ \u00A0]*(?:Konto[ \u00A0]+)?([A-Za-z0-9][A-Za-z0-9 \u00A0.\-\/]{3,})/gi,
    groupIndex: 1
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
  },
  {
    id: 'personNames',
    kind: 'heuristic',
    group: 'identity',
    label: 'Person name',
    example: 'Frau Dr. Anna Schmidt',
    severity: 'high',
    defaultOn: true
  },
  {
    id: 'personNamesLoose',
    kind: 'heuristic',
    group: 'identity',
    label: 'Name pair (heuristic)',
    example: 'Anna Schmidt',
    severity: 'low',
    defaultOn: false
  },
  {
    // German forms often put the role on one line and the person's name on the
    // NEXT line ("Auftraggeber:" / "Hans Mueller"). Same-line name heuristics
    // cannot see that, so scan the following line for a name pair instead.
    id: 'personNamesLabeled',
    kind: 'heuristic',
    group: 'identity',
    label: 'Person name (labelled)',
    example: 'Auftraggeber: / Hans Mueller',
    severity: 'high',
    defaultOn: true
  }
];

export const RULE_BY_ID = new Map(RULES.map((rule) => [rule.id, rule]));
