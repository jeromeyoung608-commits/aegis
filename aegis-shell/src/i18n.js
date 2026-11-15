// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
// Aegis/aegis-shell/src/i18n.js — minimal, dependency-free i18n (Phase 7+).
//
// Real working primitive: English + German catalogs and a clear
// extension point. Module UIs opt into t() via [data-i18n] attributes (see
// console.js applyI18n). Missing keys fall back to the key itself (visible, not
// silent), so partial translations never break the UI.
const CATALOGS = {
  en: {
    'console.title': 'Aegis Operator Console',
    'console.sub': 'Audit · Revocation · Key Escrow · TSA verification',
    'console.signin': 'Operator sign-in',
    'audit.title': 'Audit trail',
    'revoke.title': 'Revocation list',
    'escrow.title': 'Key escrow (break-glass recovery)',
    'tsa.title': 'RFC 3161 timestamp verification',
    'common.refresh': 'Refresh',
    'common.verify': 'Verify',
    'lang.label': 'Language',
    'compliance.title': 'Compliance & legal identity',
    'compliance.intro': 'These are your real legal facts — Aegis never fabricates them. Fill them once; they are rendered into ROPA / Privacy Policy / DPA / SLA and listed in the audit trail.',
    'compliance.controller': 'Controller (data controller)',
    'compliance.dpo': 'Data Protection Officer',
    'compliance.eurep': 'EU representative (GDPR Art. 27 — if no EU entity)',
    'compliance.sla': 'SLA & legal',
    'compliance.optional': 'Optional — TSA gateway',
    'compliance.save': 'Save facts',
    'compliance.reload': 'Reload',
    'compliance.uploadTitle': 'Upload filled compliance documents',
    'compliance.uploadHint': 'Upload the executed versions (signed ROPA / DPA / SLA, DPO appointment letter, logo). Stored server-side, retrievable only by an operator.',
    'compliance.upload': 'Upload',
    'compliance.files': 'Uploaded documents',
    'compliance.genTitle': 'Generate filled templates',
    'compliance.genHint': 'Downloads the template with your facts substituted (unfilled fields show a “to be completed” marker).',
    'compliance.dlRopa': 'Download filled ROPA',
    'compliance.dlDpa': 'Download filled DPA',
    'compliance.dlSla': 'Download filled SLA',
    'compliance.dlPrivacy': 'Download filled Privacy Policy',
    'compliance.ropa': 'ROPA structured register (GDPR Art. 30)',
    'compliance.ropaHint': 'These four columns are the structured minimum expected by the supervisory authority and are rendered into the filled ROPA. Until set, issuing the filled ROPA is blocked by the factory gate.',
    'compliance.dlScc': 'Download filled SCC',
    'compliance.dlDpia': 'Download filled DPIA',
    'compliance.blankHint': '— or download a blank template to fill/sign by hand —',
    'compliance.dlRopaTpl': 'Blank ROPA',
    'compliance.dlDpaTpl': 'Blank DPA',
    'compliance.dlSlaTpl': 'Blank SLA',
    'compliance.dlPrivacyTpl': 'Blank Privacy Policy',
    'compliance.dlSccTpl': 'Blank SCC',
    'compliance.dlDpiaTpl': 'Blank DPIA',
    'dsar.title': 'DSAR request ledger (GDPR Art. 15 / 12)',
    'dsar.hint': 'Record data-subject requests and track the one-month (30-day) statutory deadline. Overdue rows are flagged. Resolving records the operator note and the completion time.',
    'dsar.name': 'Subject name',
    'dsar.email': 'Subject email',
    'dsar.type': 'Request type',
    'dsar.detail': 'Detail',
    'dsar.record': 'Record request',
    'dsar.thName': 'Name',
    'dsar.thEmail': 'Email',
    'dsar.thType': 'Type',
    'dsar.thStatus': 'Status',
    'dsar.thCreated': 'Created',
    'dsar.empty': 'no DSAR requests recorded',
    'dpia.title': 'DPIA trigger check (GDPR Art. 35)',
    'dpia.hint': 'Advisory check based on the Controller’s own dpia flags (set via the compliance facts JSON / API). Does not replace counsel’s judgement.',
    'export.title': 'Data subject access (DSAR / Art.20)',
    'export.hint': 'Export a self-describing JSON bundle of audit records + operator metadata a data subject can retrieve (GDPR Art.20 portability). Contains no key material or file bytes.',
    'export.btn': 'Export bundle',
    'erase.title': 'Erasure request (Art.17)',
    'erase.hint': 'Erase a data-subject’s personal references. Operator/system audit trail is protected and cannot be erased (B-04). Returns a salted tombstone hash so you can later prove the erasure without storing clear-text.',
    'erase.subject': 'Subject identifier',
    'erase.reason': 'Reason',
    'erase.by': 'Requested by',
    'compStatusOk': '✓ Compliance facts complete — filled documents may be issued.',
    'compStatusWarn': '⚠ Incomplete — filled documents are blocked (HTTP 409) until set:',
    'dsar.recorded': 'recorded ✓ (30-day deadline tracked)',
    'dsar.needEmail': 'subject email required',
    'dsar.resolved': 'resolved ✓',
    'dpia.required': 'DPIA required',
    'dpia.notRequired': 'DPIA not triggered by configured criteria (Art. 35).',
    'dpia.triggerPrefix': '— triggers: ',
    'status.unavailable': 'status unavailable',
    'dsar.resolve': 'resolve',
    'dsar.resolveNotes': 'Resolution notes (optional):',
    'dsar.due': 'due',
  },
  de: {
    'console.title': 'Aegis Operator-Konsole',
    'console.sub': 'Audit · Sperrliste · Schlüssel-Hinterlegung · TSA-Verifikation',
    'console.signin': 'Operator-Anmeldung',
    'audit.title': 'Audit-Protokoll',
    'revoke.title': 'Sperrliste',
    'escrow.title': 'Schlüssel-Hinterlegung (Break-Glass-Wiederherstellung)',
    'tsa.title': 'RFC 3161 Zeitstempel-Verifikation',
    'common.refresh': 'Aktualisieren',
    'common.verify': 'Verifizieren',
    'lang.label': 'Sprache',
    'compliance.title': 'Compliance & rechtliche Identität',
    'compliance.intro': 'Dies sind Ihre echten rechtlichen Fakten — Aegis erfindet sie nicht. Einmal ausfüllen; sie werden in ROPA / Datenschutzerklärung / DPA / SLA eingesetzt und im Audit-Protokoll geführt.',
    'compliance.controller': 'Verantwortlicher (Controller)',
    'compliance.dpo': 'Datenschutzbeauftragter',
    'compliance.eurep': 'EU-Vertreter (DSGVO Art. 27 — falls keine EU-Niederlassung)',
    'compliance.sla': 'SLA & Rechtliches',
    'compliance.optional': 'Optional — TSA-Gateway',
    'compliance.save': 'Fakten speichern',
    'compliance.reload': 'Neu laden',
    'compliance.uploadTitle': 'Ausgefüllte Compliance-Dokumente hochladen',
    'compliance.uploadHint': 'Laden Sie die unterzeichneten Versionen hoch (ROPA / DPA / SLA, DPO-Bestellung, Logo). Server-seitig gespeichert, nur für Operator abrufbar.',
    'compliance.upload': 'Hochladen',
    'compliance.files': 'Hochgeladene Dokumente',
    'compliance.genTitle': 'Ausgefüllte Vorlagen erzeugen',
    'compliance.genHint': 'Lädt die Vorlage mit Ihren Fakten ersetzt herunter (leere Felder zeigen einen „auszufüllen“-Hinweis).',
    'compliance.dlRopa': 'Ausgefüllte ROPA',
    'compliance.dlDpa': 'Ausgefüllte DPA',
    'compliance.dlSla': 'Ausgefüllte SLA',
    'compliance.dlPrivacy': 'Ausgefüllte Datenschutzerklärung',
    'compliance.ropa': 'ROPA – strukturiertes Verzeichnis (DSGVO Art. 30)',
    'compliance.ropaHint': 'Diese vier Spalten sind das strukturierte Minimum, das die Aufsichtsbehörde erwartet, und werden in die ausgefüllte ROPA eingesetzt. Bis sie gesetzt sind, wird die ausgefüllte ROPA durch das Werkstor blockiert.',
    'compliance.dlScc': 'Ausgefüllte SCC',
    'compliance.dlDpia': 'Ausgefüllte DPIA',
    'compliance.blankHint': '— oder laden Sie eine leere Vorlage zum Ausfüllen/Unterschreiben von Hand herunter —',
    'compliance.dlRopaTpl': 'Leere ROPA',
    'compliance.dlDpaTpl': 'Leere DPA',
    'compliance.dlSlaTpl': 'Leere SLA',
    'compliance.dlPrivacyTpl': 'Leere Datenschutzerklärung',
    'compliance.dlSccTpl': 'Leere SCC',
    'compliance.dlDpiaTpl': 'Leere DPIA',
    'dsar.title': 'DSAR-Antragsregister (DSGVO Art. 15 / 12)',
    'dsar.hint': 'Erfassen Sie Anträge von betroffenen Personen und verfolgen Sie die einmonatige (30-Tage-) Frist. Überfällige Zeilen werden markiert. Die Erledigung protokolliert den Operator-Vermerk und den Zeitpunkt.',
    'dsar.name': 'Name der Person',
    'dsar.email': 'E-Mail der Person',
    'dsar.type': 'Antragsart',
    'dsar.detail': 'Details',
    'dsar.record': 'Antrag erfassen',
    'dsar.thName': 'Name',
    'dsar.thEmail': 'E-Mail',
    'dsar.thType': 'Art',
    'dsar.thStatus': 'Status',
    'dsar.thCreated': 'Erstellt',
    'dsar.empty': 'keine DSAR-Anträge erfasst',
    'dpia.title': 'DPIA-Auslöseprüfung (DSGVO Art. 35)',
    'dpia.hint': 'Beratende Prüfung anhand der dpia-Flags des Verantwortlichen (über die Compliance-Fakten-JSON / API). Ersetzt nicht die Beurteilung durch den Datenschutzbeauftragten.',
    'export.title': 'Auskunft betroffener Personen (DSAR / Art. 20)',
    'export.hint': 'Exportiert ein selbstbeschreibendes JSON-Paket aus Audit-Einträgen + Operator-Metadaten, das eine betroffene Person abrufen kann (DSGVO Art. 20 Portabilität). Enthält keine Schlüsselmaterialien oder Datei-Bytes.',
    'export.btn': 'Paket exportieren',
    'erase.title': 'Löschungsantrag (Art. 17)',
    'erase.hint': 'Löscht die Personenbezüge einer betroffenen Person. Die Operator-/System-Audit-Spur ist geschützt und kann nicht gelöscht werden (B-04). Liefert einen gesalzenen Tombstone-Hash, mit dem sich die Löschung später nachweisen lässt, ohne Klartext zu speichern.',
    'erase.subject': 'Kennung der Person',
    'erase.reason': 'Grund',
    'erase.by': 'Angefragt von',
    'compStatusOk': '✓ Compliance-Fakten vollständig — ausgefüllte Dokumente können ausgestellt werden.',
    'compStatusWarn': '⚠ Unvollständig — ausgefüllte Dokumente sind blockiert (HTTP 409), bis gesetzt:',
    'dsar.recorded': 'erfasst ✓ (30-Tage-Frist verfolgt)',
    'dsar.needEmail': 'E-Mail der Person erforderlich',
    'dsar.resolved': 'erledigt ✓',
    'dpia.required': 'DPIA erforderlich',
    'dpia.notRequired': 'DPIA nicht durch konfigurierte Kriterien ausgelöst (Art. 35).',
    'dpia.triggerPrefix': '— Auslöser: ',
    'status.unavailable': 'Status nicht verfügbar',
    'dsar.resolve': 'Erledigen',
    'dsar.resolveNotes': 'Vermerk zur Erledigung (optional):',
    'dsar.due': 'fällig',
  },
};

export function detectLocale() {
  try {
    const saved = localStorage.getItem('aegis_locale');
    if (saved && CATALOGS[saved]) return saved;
    const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return CATALOGS[nav] ? nav : 'en';
  } catch {
    return 'en';
  }
}

export function setLocale(locale) {
  const l = CATALOGS[locale] ? locale : 'en';
  try { localStorage.setItem('aegis_locale', l); } catch { /* ignore */ }
  document.documentElement.lang = l;
  return l;
}

// Returns a translator for the given locale. Falls back to the key (so missing
// translations are visible, not silent) and supports {var} interpolation.
export function getT(locale) {
  const dict = CATALOGS[locale] || CATALOGS.en;
  return (key, vars) => {
    let s = Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : key;
    if (vars) for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  };
}
