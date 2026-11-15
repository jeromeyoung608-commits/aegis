// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
/**
 * Rule catalogue for English-language paperwork (UK + US).
 * Inherits the language-agnostic SHARED_RULES (email / IBAN / phone / date /
 * amount) and adds Anglophone-specific identifiers. Used when the customer picks
 * "English" — or alongside German when the default "Deutsch + English" preset is
 * active, which is what makes previously-unmarked English PII get caught.
 */

import { SHARED_RULES } from './base.js';
import {
  SALUTATIONS, NAME_LABELS, NAME_LABELS_CI, TITLES, cleanToken, looksLikePersonName
} from './lexicon.en.js';

const RULES = [
  ...SHARED_RULES,

  {
    id: 'ssn',
    kind: 'regex',
    group: 'identity',
    label: 'US SSN',
    example: '123-45-6789',
    severity: 'high',
    defaultOn: true,
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g
  },
  {
    id: 'nino',
    kind: 'regex',
    group: 'identity',
    label: 'UK National Insurance No.',
    example: 'QQ123456C',
    severity: 'high',
    defaultOn: true,
    pattern: /\b[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-DFM]\b/g
  },
  {
    id: 'ukPostcode',
    kind: 'regex',
    group: 'location',
    label: 'UK postcode',
    example: 'SW1A 1AA',
    severity: 'mid',
    defaultOn: true,
    pattern: /\b[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}\b/g
  },
  {
    id: 'usZip',
    kind: 'regex',
    group: 'location',
    label: 'US ZIP',
    example: '90210',
    severity: 'low',
    defaultOn: false,
    pattern: /\b\d{5}(?:-\d{4})?\b/g
  },
  {
    // Label-driven fallback: a field name in English followed by a value. Redacts
    // the value even when there is no dedicated rule (covers "Account:", "SSN:",
    // "Date of birth:", "Name:", …). Strong label signal ⇒ safe to redact.
    id: 'labeledPiiEn',
    kind: 'regex',
    group: 'identity',
    label: 'Labelled PII (EN)',
    example: 'SSN: 123-45-6789',
    severity: 'high',
    defaultOn: true,
    pattern: /\b(?:SSN|Social Security|National Insurance|NINO|Account|Acc|Acct|IBAN|Sort code|Date of birth|DOB|Birth date|Passport|Driver'?s? licen[cs]e|Address|Phone|Mobile|Email|Client|Patient|Customer|Name|First name|Last name|Reference|Claim|Policy|Member)\b[ \u00A0]*[:#]?[ \u00A0]*([A-Za-z0-9][A-Za-z0-9 \u00A0.\-\/]{2,})/gi,
    groupIndex: 1
  },

  // Name heuristics — identical in shape to the German ones; the actual matching
  // is driven by the English lexicon (SALUTATIONS / FIRST_NAMES / STOPWORDS).
  {
    id: 'personNames',
    kind: 'heuristic',
    group: 'identity',
    label: 'Person name',
    example: 'Mr David Smith',
    severity: 'high',
    defaultOn: true
  },
  {
    id: 'personNamesLoose',
    kind: 'heuristic',
    group: 'identity',
    label: 'Name pair (heuristic)',
    example: 'David Smith',
    severity: 'low',
    defaultOn: false
  },
  {
    id: 'personNamesLabeled',
    kind: 'heuristic',
    group: 'identity',
    label: 'Person name (labelled)',
    example: 'Client: / David Smith',
    severity: 'high',
    defaultOn: true
  }
];

export { RULES, SALUTATIONS, NAME_LABELS, NAME_LABELS_CI, TITLES, cleanToken, looksLikePersonName };
