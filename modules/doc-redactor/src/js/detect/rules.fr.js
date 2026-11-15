// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
/**
 * Rule catalogue for French-language paperwork. Inherits SHARED_RULES and adds
 * Francophone identifiers. NOTE: French OCR needs the `fra.traineddata.gz` model
 * in vendor/tessdata (not bundled by default — see vendor/MANIFEST.json); the
 * rule logic below is ready and runs the moment the model is present.
 */

import { SHARED_RULES } from './base.js';
import {
  SALUTATIONS, NAME_LABELS, NAME_LABELS_CI, TITLES, cleanToken, looksLikePersonName
} from './lexicon.fr.js';

const RULES = [
  ...SHARED_RULES,

  {
    id: 'frPostcode',
    kind: 'regex',
    group: 'location',
    label: 'Code postal',
    example: '75008',
    severity: 'mid',
    defaultOn: true,
    pattern: /\b\d{5}\b/g
  },
  {
    id: 'secu',
    kind: 'regex',
    group: 'identity',
    label: 'N° Sécurité sociale',
    example: '1 84 05 74 123 456 78',
    severity: 'high',
    defaultOn: true,
    pattern: /\b[12]\d{2}[0-1]\d[0-3]\d[ \u00A0]?\d{3}[ \u00A0]?\d{3}[ \u00A0]?\d{2}\b/g
  },
  {
    id: 'labeledPiiFr',
    kind: 'regex',
    group: 'identity',
    label: 'Donnée étiquetée (FR)',
    example: 'N° de Sécurité sociale: 1 84 05 74 123 456 78',
    severity: 'high',
    defaultOn: true,
    pattern: /\b(?:N°? de Sécurité sociale|Sécurité sociale|Compte|RIB|IBAN|Date de naissance|Né(?:e)? le|Adresse|Téléphone|Mobile|Portable|Email|Nom|Prénom|Client|Patient|Référence|Numéro de client|Membre)\b[ \u00A0]*[:#]?[ \u00A0]*([A-Za-z0-9][A-Za-z0-9 \u00A0.\-\/]{2,})/gi,
    groupIndex: 1
  },

  {
    id: 'personNames',
    kind: 'heuristic',
    group: 'identity',
    label: 'Nom de personne',
    example: 'M David Martin',
    severity: 'high',
    defaultOn: true
  },
  {
    id: 'personNamesLoose',
    kind: 'heuristic',
    group: 'identity',
    label: 'Paire de noms (heuristique)',
    example: 'David Martin',
    severity: 'low',
    defaultOn: false
  },
  {
    id: 'personNamesLabeled',
    kind: 'heuristic',
    group: 'identity',
    label: 'Nom de personne (étiqueté)',
    example: 'Client : / David Martin',
    severity: 'high',
    defaultOn: true
  }
];

export { RULES, SALUTATIONS, NAME_LABELS, NAME_LABELS_CI, TITLES, cleanToken, looksLikePersonName };
