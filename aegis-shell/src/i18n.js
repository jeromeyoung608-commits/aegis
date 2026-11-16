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
    'compliance.statusOk': '✓ Compliance facts complete — filled documents may be issued.',
    'compliance.statusWarn': '⚠ Incomplete — filled documents are blocked (HTTP 409) until set:',
    'dsar.recorded': 'recorded ✓ (30-day deadline tracked)',
    'dsar.needEmail': 'subject email required',
    'dsar.resolved': 'resolved ✓',
    'dpia.required': 'DPIA required',
    'dpia.notRequired': 'DPIA not triggered by configured criteria (Art. 35).',
    'dpia.triggerPrefix': '— triggers: ',
    'status.unavailable': 'status unavailable',
    'compliance.statusOk': 'All compliance facts are set — ROPA / Privacy / DPA / SLA can be generated.',
    'compliance.statusWarn': 'Compliance facts still missing:',
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
    'compliance.statusOk': '✓ Compliance-Fakten vollständig — ausgefüllte Dokumente können ausgestellt werden.',
    'compliance.statusWarn': '⚠ Unvollständig — ausgefüllte Dokumente sind blockiert (HTTP 409), bis gesetzt:',
    'dsar.recorded': 'erfasst ✓ (30-Tage-Frist verfolgt)',
    'dsar.needEmail': 'E-Mail der Person erforderlich',
    'dsar.resolved': 'erledigt ✓',
    'dpia.required': 'DPIA erforderlich',
    'dpia.notRequired': 'DPIA nicht durch konfigurierte Kriterien ausgelöst (Art. 35).',
    'dpia.triggerPrefix': '— Auslöser: ',
    'status.unavailable': 'Status nicht verfügbar',
    'compliance.statusOk': 'Alle Compliance-Angaben gesetzt — Verzeichnis / Datenschutzerklärung / AVV / SLA können erzeugt werden.',
    'compliance.statusWarn': 'Fehlende Compliance-Angaben:',
    'dsar.resolve': 'Erledigen',
    'dsar.resolveNotes': 'Vermerk zur Erledigung (optional):',
    'dsar.due': 'fällig',
  },
};

// ── Phrase catalogue + DOM translator ───────────────────────────────────────
// [data-i18n] keys cover only the console chrome. Everything else — tab labels,
// panel headings, buttons, hints, footers, region presets, and strings that
// JavaScript renders after load — used to stay English: switching the selector
// to DE translated the header and left the rest untouched, so "English + German
// interface" was only half true. The catalogue below is keyed by the English
// source text (whitespace-normalised) and applied to every text node and to
// placeholder/title/aria-label/alt. Coverage is enforced by
// src/i18n-coverage.test.js, which fails the build if a visible string in
// console.html or index.html has no German entry.
export const PHRASE_CATALOG = {
    'Aegis — Operator Console': 'Aegis — Betreiberkonsole',
    'Aegis Operator Console': 'Aegis Betreiberkonsole',
    'Audit · Revocation · Key Escrow · TSA verification': 'Audit · Sperrliste · Schlüsselhinterlegung · TSA-Prüfung',
    'Language': 'Sprache',
    'Sign out': 'Abmelden',
    'Workbench': 'Werkbank',
    'Operator sign-in': 'Betreiberanmeldung',
    'Username': 'Benutzername',
    'Password': 'Passwort',
    'Sign in': 'Anmelden',
    'Audit log': 'Audit-Protokoll',
    'Revocation': 'Sperrliste',
    'Key escrow': 'Schlüsselhinterlegung',
    'TSA verify': 'TSA prüfen',
    'System': 'System',
    'Compliance': 'Compliance',
    'Setup': 'Einrichtung',
    'Data subjects': 'Betroffene',
    'Sessions': 'Sitzungen',
    'Config': 'Konfiguration',
    'Audit trail': 'Audit-Spur',
    'Server-side, operator-facing log (survives restart). CSV export included.': 'Serverseitiges Protokoll für Betreiber (überlebt Neustart). CSV-Export enthalten.',
    'Refresh': 'Aktualisieren',
    'Audit JSON': 'Audit als JSON',
    'Audit CSV': 'Audit als CSV',
    'Revocation list': 'Sperrliste',
    'CRL/OCSP-style deny-list of signing/transport key fingerprints. Checked at session admission.': 'Sperrliste (CRL/OCSP-Stil) der Fingerabdrücke von Signatur- und Transportschlüsseln. Wird bei der Sitzungszulassung geprüft.',
    'Key fingerprint (hex / colon-separated)': 'Schlüsselfingerabdruck (Hex, durch Doppelpunkt getrennt)',
    'Reason': 'Grund',
    'Revoke key': 'Schlüssel sperren',
    'Active revocations': 'Aktive Sperrungen',
    'Fingerprint': 'Fingerabdruck',
    'Revoked': 'Gesperrt',
    'Key escrow (break-glass recovery)': 'Schlüsselhinterlegung (Notfallwiederherstellung)',
    'Opaque envelopes sealed by clients to the operator key. The server never sees key material.': 'Undurchsichtige Umschläge, von Clients mit dem Betreiberschlüssel versiegelt. Der Server sieht niemals Schlüsselmaterial.',
    'Room (optional)': 'Raum (optional)',
    'Retrieve': 'Abrufen',
    'Deposited envelopes': 'Hinterlegte Umschläge',
    'Room': 'Raum',
    'By': 'Von',
    'Sealed': 'Versiegelt',
    'RFC 3161 timestamp verification': 'RFC-3161-Zeitstempelprüfung',
    'Token (base64)': 'Token (Base64)',
    'Expected digest (hex)': 'Erwarteter Digest (Hex)',
    'Verify': 'Prüfen',
    'Session / integrity': 'Sitzung / Integrität',
    'Operator session details and quick links.': 'Details zur Betreibersitzung und Schnellzugriffe.',
    'Compliance & legal identity': 'Compliance & rechtliche Identität',
    'Controller (data controller)': 'Verantwortlicher (Datenverantwortlicher)',
    'Legal name': 'Firmenname',
    'Registered address': 'Eingetragene Anschrift',
    'Company registration no.': 'Handelsregisternummer',
    'Data Protection Officer': 'Datenschutzbeauftragter',
    'DPO name': 'Name des DSB',
    'DPO email': 'E-Mail des DSB',
    'DPO postal address': 'Postanschrift des DSB',
    'EU representative (GDPR Art. 27 — if no EU entity)': 'EU-Vertreter (DSGVO Art. 27 — falls keine EU-Niederlassung)',
    'Representative name': 'Name des Vertreters',
    'Representative address': 'Anschrift des Vertreters',
    'SLA & legal': 'SLA & Recht',
    'SLA contact mailbox': 'SLA-Kontaktadresse',
    'Operator timezone': 'Zeitzone des Betreibers',
    'Governing law': 'Anwendbares Recht',
    'Supervisory authority': 'Aufsichtsbehörde',
    'Region preset (suggests authority)': 'Regionsvorgabe (schlägt Aufsichtsbehörde vor)',
    '— none —': '— keine —',
    'ROPA structured register (GDPR Art. 30)': 'Strukturiertes Verarbeitungsverzeichnis (DSGVO Art. 30)',
    'Purpose of processing': 'Zweck der Verarbeitung',
    'Retention period': 'Aufbewahrungsfrist',
    'Recipients of the data': 'Empfänger der Daten',
    'Legal basis': 'Rechtsgrundlage',
    'Optional — TSA gateway': 'Optional — TSA-Gateway',
    'RFC 3161 TSA endpoint': 'RFC-3161-TSA-Endpunkt',
    'Test TSA connection': 'TSA-Verbindung testen',
    'Reload': 'Neu laden',
    'Save facts': 'Angaben speichern',
    'Upload filled compliance documents': 'Ausgefüllte Compliance-Dokumente hochladen',
    'Document type': 'Dokumenttyp',
    'ROPA (signed)': 'Verzeichnis (unterzeichnet)',
    'DPA (signed)': 'AVV (unterzeichnet)',
    'SLA (signed)': 'SLA (unterzeichnet)',
    'DPO appointment letter': 'Bestellschreiben des DSB',
    'Company logo': 'Firmenlogo',
    'Other': 'Sonstiges',
    'Upload': 'Hochladen',
    'Name': 'Name',
    'Kind': 'Art',
    'Size': 'Größe',
    'Uploaded': 'Hochgeladen',
    'Generate filled templates': 'Ausgefüllte Vorlagen erzeugen',
    'Download filled ROPA': 'Verzeichnis ausgefüllt herunterladen',
    'Download filled DPA': 'AVV ausgefüllt herunterladen',
    'Download filled SLA': 'SLA ausgefüllt herunterladen',
    'Download filled Privacy Policy': 'Datenschutzerklärung ausgefüllt herunterladen',
    'Download filled SCC': 'SCC ausgefüllt herunterladen',
    'Download filled DPIA': 'DSFA ausgefüllt herunterladen',
    '— or download a blank template to fill/sign by hand —': '— oder eine leere Vorlage zum Ausfüllen/Unterschreiben herunterladen —',
    'Blank ROPA': 'Leeres Verzeichnis',
    'Blank DPA': 'Leerer AVV',
    'Blank SLA': 'Leeres SLA',
    'Blank Privacy': 'Leere Datenschutzerklärung',
    'Blank SCC': 'Leere SCC',
    'Blank DPIA': 'Leere DSFA',
    'Pre-deploy setup checklist': 'Checkliste vor dem Produktivbetrieb',
    'Export sign-off': 'Freigabe exportieren',
    'Reset': 'Zurücksetzen',
    'DSAR request ledger (GDPR Art. 15 / 12)': 'Antragsregister betroffener Personen (DSGVO Art. 15 / 12)',
    'Subject name': 'Name der betroffenen Person',
    'Subject email': 'E-Mail der betroffenen Person',
    'Request type': 'Antragsart',
    'Access (Art. 15)': 'Auskunft (Art. 15)',
    'Erasure (Art. 17)': 'Löschung (Art. 17)',
    'Rectification (Art. 16)': 'Berichtigung (Art. 16)',
    'Portability (Art. 20)': 'Datenübertragbarkeit (Art. 20)',
    'Restriction (Art. 18)': 'Einschränkung (Art. 18)',
    'Detail': 'Details',
    'Record request': 'Antrag erfassen',
    'Email': 'E-Mail',
    'Type': 'Typ',
    'Status': 'Status',
    'Created': 'Erstellt',
    'DPIA trigger check (GDPR Art. 35)': 'Prüfung der DSFA-Pflicht (DSGVO Art. 35)',
    'Re-check': 'Erneut prüfen',
    'Data subject access (DSAR / Art.20)': 'Auskunft betroffener Personen (DSAR / Art. 20)',
    'Export bundle': 'Paket exportieren',
    'Erasure request (Art.17)': 'Löschungsantrag (Art. 17)',
    'Subject identifier': 'Kennung der betroffenen Person',
    'Requested by': 'Angefordert von',
    'Erase subject': 'Betroffene Person löschen',
    'Verify tombstone': 'Löschmarke prüfen',
    'Active operator sessions': 'Aktive Betreibersitzungen',
    'Token prefix': 'Token-Präfix',
    'Operator': 'Betreiber',
    'Deployment configuration': 'Deployment-Konfiguration',
    'Require key escrow for session admission': 'Schlüsselhinterlegung für Sitzungszulassung verlangen',
    'Enforce MFA for operators': 'MFA für Betreiber erzwingen',
    'SIEM / audit forward URL (webhook)': 'SIEM- / Audit-Weiterleitungs-URL (Webhook)',
    'Notification URL': 'Benachrichtigungs-URL',
    'Send incident test': 'Vorfalltest senden',
    'Database backup (operator)': 'Datenbank-Sicherung (Betreiber)',
    'Download DB backup': 'DB-Sicherung herunterladen',
    'Save toggles': 'Schalter speichern',
    'Admin: reset operator MFA': 'Admin: MFA des Betreibers zurücksetzen',
    'Reset MFA': 'MFA zurücksetzen',
    'Aegis — Privacy-First Local Data Cleansing Engine. Zero runtime dependencies. Server is server-blind for file bytes.': 'Aegis — datenschutzfreundliche lokale Datenbereinigung. Keine Laufzeitabhängigkeiten. Der Server ist blind gegenüber Dateiinhalten.',
    'These are your real legal facts — Aegis never fabricates them. Fill them once; they are rendered into ROPA / Privacy Policy / DPA / SLA and listed in the audit trail. Saved under the runtime volume (never shipped).': 'Das sind Ihre tatsächlichen rechtlichen Angaben — Aegis erfindet sie nie. Einmal ausfüllen; sie werden in Verzeichnis / Datenschutzerklärung / AVV / SLA eingesetzt und in der Audit-Spur aufgeführt. Gespeichert im Laufzeit-Volume (wird nie mitgeliefert).',
    'These four columns are the structured minimum expected by the supervisory authority and are rendered into the filled ROPA. Until set, issuing the filled ROPA is blocked by the factory gate.': 'Diese vier Spalten sind das strukturierte Minimum, das die Aufsichtsbehörde erwartet, und werden in das ausgefüllte Verzeichnis eingesetzt. Solange sie fehlen, blockiert das Werksgate die Ausgabe.',
    'Upload the executed versions (signed ROPA / DPA / SLA, DPO appointment letter, logo). Stored server-side, retrievable only by an operator. Use “Download filled …” to generate the template with your facts substituted.': 'Laden Sie die unterzeichneten Fassungen hoch (unterzeichnetes Verzeichnis / AVV / SLA, Bestellschreiben des DSB, Logo). Serverseitig gespeichert, nur für Betreiber abrufbar. Mit „… ausgefüllt herunterladen“ erzeugen Sie die Vorlage mit eingesetzten Angaben.',
    'Downloads the template with your facts substituted (unfilled fields show a “to be completed” marker).': 'Lädt die Vorlage mit eingesetzten Angaben herunter (leere Felder zeigen eine „auszufüllen“-Marke).',
    'Record data-subject requests and track the one-month (30-day) statutory deadline. Overdue rows are flagged. Resolving records the operator note and the completion time.': 'Erfasst Anträge betroffener Personen und überwacht die gesetzliche Frist von einem Monat (30 Tage). Überfällige Zeilen werden markiert. Beim Erledigen werden Vermerk und Abschlusszeit gespeichert.',
    'Advisory check based on the Controller\'s own dpia flags (set via the compliance facts JSON / API). Does not replace counsel\'s judgement.': 'Hinweisprüfung auf Basis der dpia-Kennzeichen des Verantwortlichen (gesetzt über Compliance-JSON / API). Ersetzt nicht die Beurteilung durch Rechtsberatung.',
    'Export a self-describing JSON bundle of audit records + operator metadata a data subject can retrieve (GDPR Art.20 portability). Contains no key material or file bytes.': 'Exportiert ein selbstbeschreibendes JSON-Paket aus Audit-Einträgen + Betreiber-Metadaten, das eine betroffene Person abrufen kann (DSGVO Art. 20). Enthält kein Schlüsselmaterial und keine Dateiinhalte.',
    'Erase a data-subject\'s personal references. Operator/system audit trail is protected and cannot be erased (B-04). Returns a salted tombstone hash so you can later prove the erasure without storing clear-text.': 'Löscht die personenbezogenen Verweise einer betroffenen Person. Betreiber-/System-Audit-Spur ist geschützt und kann nicht gelöscht werden (B-04). Liefert einen gesalzenen Löschmarken-Hash, mit dem sich die Löschung später belegen lässt, ohne Klartext zu speichern.',
    'Server-side sessions (TTL ≤ 1 h). Tokens are shown only as a prefix. Revoking a session forces its holder to re-authenticate.': 'Serverseitige Sitzungen (TTL ≤ 1 h). Token werden nur als Präfix angezeigt. Das Sperren einer Sitzung erzwingt erneute Anmeldung.',
    'Read-only reflection of boot-time config plus a small allowlist of safe toggles. Toggles are persisted to config/local.json and apply on the next restart.': 'Schreibgeschützte Wiedergabe der Startkonfiguration plus eine kleine Allowlist sicherer Schalter. Schalter werden in config/local.json gespeichert und greifen beim nächsten Neustart.',
    'Aegis - Secure Edge Collaboration Workbench': 'Aegis – Werkbank für sichere Edge-Zusammenarbeit',
    'Secure Edge Collaboration Workbench': 'Werkbank für sichere Edge-Zusammenarbeit',
    'Topology': 'Topologie',
    'Aegis-Topology': 'Aegis-Topologie',
    'Redact': 'Schwärzen',
    'Aegis-REDAKTOR': 'Aegis-REDAKTOR',
    'Sign': 'Signieren',
    'Aegis-Identity': 'Aegis-Identität',
    'P2P Send': 'P2P-Versand',
    'Aegis-Transport': 'Aegis-Transport',
    'Archive': 'Archivieren',
    'Aegis-Vault': 'Aegis-Tresor',
    'Audit': 'Audit',
    'Aegis-AuditTrail': 'Aegis-Audit-Spur',
    'Zero-Trust | Offline | Server-blind': 'Zero-Trust | offline | serverblind',
    'Role': 'Rolle',
    'Recipient': 'Empfänger',
    'Auditor': 'Auditor',
    'Admin': 'Admin',
    'External': 'Extern',
    'Show transfer': 'Transfer anzeigen',
    'WebGPU | 1M+ nodes | click a node to pull its contract': 'WebGPU | 1 Mio.+ Knoten | Knoten anklicken, um seinen Vertrag zu laden',
    'Local OCR | destructive PDF | nothing uploaded': 'Lokales OCR | destruktives PDF | nichts hochgeladen',
    'Load local file': 'Lokale Datei laden',
    'Waiting for a document': 'Warten auf ein Dokument',
    'Sign & Send to Peer': 'Signieren & an Peer senden',
    'Peer A | sender': 'Peer A | Absender',
    'Peer B | receiver': 'Peer B | Empfänger',
    'idle': 'inaktiv',
    'received file': 'Datei empfangen',
    'Archive to Vault': 'Im Tresor archivieren',
    'View redacted file': 'Geschwärzte Datei ansehen',
    'Download': 'Herunterladen',
    'OPFS | AES-GCM-256': 'OPFS | AES-GCM-256',
    'opening vault...': 'Tresor wird geöffnet …',
    'Open vault': 'Tresor öffnen',
    'No verified artifact yet.': 'Noch kein verifiziertes Artefakt.',
    'SHA-256 hash chain': 'SHA-256-Hashkette',
    'Review': 'Prüfen',
    'loading chain...': 'Kette wird geladen …',
    'Export': 'Exportieren',
    'Anchor TSA': 'TSA verankern',
    'Clear': 'Leeren',
    'Tamper-Evident Hash-Chained Audit Trail: A visual timeline for compliance reviews.': 'Manipulationssichere, hashverkettete Audit-Spur: eine visuelle Zeitleiste für Compliance-Prüfungen.',
    'Admin · Deploy Config': 'Admin · Deployment-Konfiguration',
    'Default role view': 'Standard-Rollenansicht',
    'Peer A · sender': 'Peer A · Absender',
    'Peer B · receiver': 'Peer B · Empfänger',
    'Archive to local vault': 'Im lokalen Tresor archivieren',
    'Vault passphrase (min 8 characters)': 'Tresor-Passphrase (mind. 8 Zeichen)',
    'Cancel': 'Abbrechen',
    'Seal to vault': 'Im Tresor versiegeln',
    'file': 'Datei',
    'Close': 'Schließen',
    'Local account (seeded by': 'Lokales Konto (angelegt durch',
    '; default password = the config issuer secret).': '; Standard-Passwort = das Issuer-Secret der Konfiguration).',
    'Paste a base64 token + the expected document SHA-256. Requires a configured trust store (see': 'Base64-Token und den erwarteten Dokument-SHA-256 einfügen. Erfordert einen konfigurierten Trust-Store (siehe',
    'These are': 'Das sind',
    'your': 'Ihre',
    'real legal facts — Aegis never fabricates them. Fill them once; they are rendered into ROPA / Privacy Policy / DPA / SLA and listed in the audit trail. Saved under the runtime volume (never shipped).': 'tatsächlichen rechtlichen Angaben — Aegis erfindet sie nie. Einmal ausfüllen; sie werden in Verzeichnis / Datenschutzerklärung / AVV / SLA eingesetzt und in der Audit-Spur aufgeführt. Gespeichert im Laufzeit-Volume (wird nie mitgeliefert).',
    'Germany (BfDI)': 'Deutschland (BfDI)',
    'France (CNIL)': 'Frankreich (CNIL)',
    'United Kingdom (ICO)': 'Vereinigtes Königreich (ICO)',
    'Other EU member state': 'Anderer EU-Mitgliedstaat',
    'United States': 'Vereinigte Staaten',
    'Tick each item as it is completed in your environment. State is kept in this browser (localStorage) and can be exported as a signed-off checklist. The authoritative list lives in': 'Jeden Punkt abhaken, sobald er in Ihrer Umgebung erledigt ist. Der Stand bleibt in diesem Browser (localStorage) und lässt sich als abgezeichnete Checkliste exportieren. Die verbindliche Liste steht in',
    'Advisory check based on the Controller\'s own': 'Hinweisprüfung auf Basis der eigenen',
    'flags (set via the compliance facts JSON / API). Does not replace counsel\'s judgement.': ' Kennzeichen des Verantwortlichen (gesetzt über Compliance-JSON / API). Ersetzt nicht die Beurteilung durch Rechtsberatung.',
    'Incident / breach notification (Art.33/34)': 'Vorfall- / Datenschutzverletzungs-Meldung (Art. 33/34)',
    'Aegis command center ready.': 'Aegis-Kommandozentrale bereit.',
    'Deploy-only panel. Role views change the UI only — a presentation aid, not an access-control boundary. Token-gated signaling and real-document loading are ON by default. CA / key recovery / cloud bucket / desktop packaging / mobile remain external adapters (see delivery checklist).': 'Nur-Deployment-Panel. Rollenansichten ändern ausschließlich die Oberfläche — eine Darstellungshilfe, keine Zugriffskontrollgrenze. Token-geschütztes Signaling und das Laden echter Dokumente sind standardmäßig AN. CA / Schlüsselwiederherstellung / Cloud-Bucket / Desktop-Paketierung / Mobile bleiben externe Adapter (siehe Liefercheckliste).',
    'Seals': 'Versiegelt',
    'and its signature metadata with AES-GCM-256 inside this browser\'s OPFS vault. The passphrase is used once and never stored; no bytes leave this device.': 'und seine Signatur-Metadaten mit AES-GCM-256 im OPFS-Tresor dieses Browsers. Die Passphrase wird einmal verwendet und nie gespeichert; kein Byte verlässt dieses Gerät.',
    'WebRTC | AES-GCM': 'WebRTC | AES-GCM',
    'Aegis-SignedDelivery': 'Aegis-SignedDelivery',
    'Confirm': 'Bestätigen',
    'Aegis command center ready. Click a topology node to start the seven-step closed loop.': 'Aegis-Kommandozentrale bereit. Klicken Sie auf einen Topologie-Knoten, um den siebenstufigen Kreislauf zu starten.',
    'Audit trail cleared — the next action starts a fresh genesis link.': 'Audit-Spur geleert — die nächste Aktion beginnt einen neuen Genesis-Link.',
    'Both P2P peers ready - connecting locally via BroadcastChannel.': 'Beide P2P-Peers bereit — lokale Verbindung über BroadcastChannel.',
    'No signed artifact is retained on the sender - verification skipped.': 'Beim Absender ist kein signiertes Artefakt gespeichert — Prüfung übersprungen.',
    'Sender handed the encrypted stream to the data channel.': 'Absender hat den verschlüsselten Stream an den Datenkanal übergeben.',
    'That file streamed straight to disk - reopen it from the chosen save location.': 'Diese Datei wurde direkt auf die Festplatte geschrieben — öffnen Sie sie am gewählten Speicherort.',
    'That file was written to disk via showSaveFilePicker; no in-memory copy to download.': 'Diese Datei wurde über showSaveFilePicker auf die Festplatte geschrieben; keine Kopie im Arbeitsspeicher zum Herunterladen.',
    'TSA anchor not configured. Set window.AEGIS_TSA_URL to a TSA gateway to anchor the chain head to a trusted timestamp.': 'TSA-Anker nicht konfiguriert. Setzen Sie window.AEGIS_TSA_URL auf ein TSA-Gateway, um den Kettenkopf an einen vertrauenswürdigen Zeitstempel zu binden.',
    'Verify a signed delivery before archiving.': 'Prüfen Sie eine signierte Lieferung, bevor Sie archivieren.',
    'Building destructive PDF...': 'Destruktives PDF wird erzeugt …',
    'Passphrase must be at least 8 characters.': 'Die Passphrase muss mindestens 8 Zeichen haben.',
    'Sealing...': 'Wird versiegelt …',
    'Signed & sent - archive below': 'Signiert & gesendet — unten archivieren',
    'Signed': 'Signiert',
    'Signing & sending...': 'Wird signiert & gesendet …',
    'The local vault is not ready yet - OPFS is still opening.': 'Der lokale Tresor ist noch nicht bereit — OPFS öffnet noch.',
    '⚠ connection lost — is the server up?': '⚠ Verbindung verloren — ist der Server erreichbar?',
    'enter endpoint first': 'zuerst Endpunkt eingeben',
    'fingerprint required': 'Fingerabdruck erforderlich',
    'subject required': 'betroffene Person erforderlich',
    'username required': 'Benutzername erforderlich',
    'no notification URL configured': 'keine Benachrichtigungs-URL konfiguriert',
    'TSA verify unavailable — ': 'TSA-Prüfung nicht verfügbar — ',
    'failed: ': 'fehlgeschlagen: ',
    'erased · tombstone ': 'gelöscht · Löschmarke ',
    'tombstone: ': 'Löschmarke: ',
    'downloaded ✓': 'heruntergeladen ✓',
    'Rejected: ': 'Abgelehnt: ',
    'OPFS unavailable: ': 'OPFS nicht verfügbar: ',
    'vault error: ': 'Tresor-Fehler: ',
    'Seven-step closed loop': 'Siebenstufiger Kreislauf',
    'Switch view by role': 'Ansicht nach Rolle wechseln',
    'Aegis-Topology - WebGPU digital twin, select a node': 'Aegis-Topologie — WebGPU-Digitaler Zwilling, Knoten auswählen',
    'Aegis-REDAKTOR - local destructive redaction': 'Aegis-REDAKTOR — lokale destruktive Schwärzung',
    'Aegis-Identity - SHA-256 hash and ECDSA signature': 'Aegis-Identität — SHA-256-Hash und ECDSA-Signatur',
    'Aegis-Transport - AES-GCM encrypted WebRTC transfer': 'Aegis-Transport — AES-GCM-verschlüsselter WebRTC-Transfer',
    'Aegis-Identity - verify the retained signed artifact': 'Aegis-Identität — gespeichertes signiertes Artefakt prüfen',
    'Aegis-Vault - seal the verified artifact in OPFS': 'Aegis-Tresor — verifiziertes Artefakt in OPFS versiegeln',
    'Aegis-AuditTrail - tamper-evident SHA-256 hash chain': 'Aegis-Audit-Spur — manipulationssichere SHA-256-Hashkette',
    'Language selection': 'Sprachauswahl',
    '> Aegis command center ready.': '> Aegis-Kommandozentrale bereit.',
    'Controller legal name + registered address (ROPA)': 'Firmenname + eingetragene Anschrift des Verantwortlichen (Verzeichnis)',
    'Company registration number': 'Handelsregisternummer',
    'Lead supervisory authority': 'Federführende Aufsichtsbehörde',
    'DPO details completed or explicitly "not appointed"': 'DSB-Angaben vollständig oder ausdrücklich „nicht bestellt“',
    'EU representative completed or confirmed not required': 'EU-Vertreter eingetragen oder nachweislich nicht erforderlich',
    'Signed ROPA / DPA / SLA uploaded': 'Unterzeichnetes Verzeichnis / AVV / SLA hochgeladen',
    '"Download filled" documents reviewed by counsel': 'Ausgefüllte Dokumente anwaltlich geprüft',
    'AUTH_JWT_SECRET / issuer secret set unique per environment': 'AUTH_JWT_SECRET / Issuer-Secret je Umgebung eindeutig gesetzt',
    'Image pushed to your own registry; secrets via env/secret, not baked in': 'Image in eigene Registry geladen; Secrets über Env/Secret, nicht eingebacken',
    'Operator accounts created (npm run setup)': 'Betreiberkonten angelegt (npm run setup)',
    'TLS / reverse proxy configured': 'TLS / Reverse-Proxy konfiguriert',
};

// Strings that must never be translated: the brand mark required by SDK.md,
// the product names, the language codes and the protocol labels.
export const PHRASE_KEEP_EN = new Set([
  'ENGINE BY JEROME YOUNG', 'Aegis', 'EN', 'DE',
  'Aegis-Topology', 'Aegis-REDAKTOR', 'Aegis-Identity', 'Aegis-Transport',
  'Aegis-Vault', 'Aegis-AuditTrail', 'Aegis-SignedDelivery',
  'WebRTC | AES-GCM', 'OPFS | AES-GCM-256', 'SHA-256 hash chain',
  // Code identifiers and repository paths stay verbatim: translating a command
  // or a file path would make it wrong.
  'npm run setup', 'adapters/tsa-rfc3161', 'docs/compliance/CONFIGURE-BEFORE-DEPLOY.md', 'dpia',
]);

const PHRASE_ORIG = new WeakMap();
const PHRASE_SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'PRE', 'CODE', 'TEXTAREA', 'NOSCRIPT']);
const PHRASE_SKIP_SEL = '[data-i18n],[data-i18n-placeholder],[data-no-i18n]';
const PHRASE_ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
const normalise = (s) => String(s).replace(/\s+/g, ' ').trim();

// Some UI text is a label plus a value ("signed in: admin", "3/14 done",
// "failed: timeout"). Exact matching cannot see those, so labels ending in
// a colon and a short list of suffixes are translated separately.
const PHRASE_PREFIX_KEYS = Object.keys(PHRASE_CATALOG).filter((k) => k.endsWith(': '));
const PHRASE_SUFFIXES = [[' done', ' erledigt']];

function translateString(text, locale) {
  if (locale === 'en') return null;
  const key = normalise(text);
  if (!key || PHRASE_KEEP_EN.has(key)) return null;
  if (PHRASE_CATALOG[key]) return PHRASE_CATALOG[key];
  for (const prefix of PHRASE_PREFIX_KEYS) {
    if (key.startsWith(prefix)) return PHRASE_CATALOG[prefix] + key.slice(prefix.length);
  }
  for (const [suffix, german] of PHRASE_SUFFIXES) {
    if (key.endsWith(suffix)) {
      const stem = key.slice(0, -suffix.length);
      const hit = PHRASE_CATALOG[stem];
      if (hit) return hit + german;
      return stem + german;
    }
  }
  return null;
}

// Translate the DOM under `root`. Originals are remembered per node/attribute,
// so switching back to EN restores the source bytes instead of re-translating.
export function translatePhrases(locale, root) {
  const scope = root || (typeof document !== 'undefined' ? document.body : null);
  if (!scope || typeof document === 'undefined') return;
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent || PHRASE_SKIP_TAGS.has(parent.tagName) || parent.closest(PHRASE_SKIP_SEL)) continue;
    if (!PHRASE_ORIG.has(node)) PHRASE_ORIG.set(node, node.nodeValue);
    const orig = PHRASE_ORIG.get(node);
    const key = normalise(orig);
    if (!key || PHRASE_KEEP_EN.has(key)) { node.nodeValue = orig; continue; }
    const hit = translateString(orig, locale);
    if (!hit) { node.nodeValue = orig; continue; }
    const lead = (orig.match(/^\s*/) || [''])[0];
    const tail = (orig.match(/\s*$/) || [''])[0];
    node.nodeValue = lead + hit + tail;
  }
  for (const el of scope.querySelectorAll('*')) {
    if (PHRASE_SKIP_TAGS.has(el.tagName)) continue;
    for (const attr of PHRASE_ATTRS) {
      if (!el.hasAttribute(attr)) continue;
      let store = PHRASE_ORIG.get(el);
      if (!store) { store = {}; PHRASE_ORIG.set(el, store); }
      const slot = '@' + attr;
      if (!store[slot]) store[slot] = el.getAttribute(attr);
      const orig = store[slot];
      const key = normalise(orig);
      const hit = translateString(orig, locale);
      el.setAttribute(attr, hit || orig);
    }
  }
}

// Content rendered after boot (audit rows, uploads, toasts) is translated as it
// appears. Without this the first screen would be German and every later refresh
// English again.
let phraseObserver = null;
export function observePhrases(getLocale, root) {
  if (phraseObserver || typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
  const scope = root || document.body;
  let applying = false;
  phraseObserver = new MutationObserver((records) => {
    if (applying) return;
    applying = true;
    try {
      const locale = getLocale();
      for (const rec of records) {
        for (const n of rec.addedNodes || []) {
          if (n.nodeType === 1) translatePhrases(locale, n);
          else if (n.nodeType === 3 && n.parentElement) translatePhrases(locale, n.parentElement);
        }
      }
    } finally {
      setTimeout(() => { applying = false; }, 0);
    }
  });
  phraseObserver.observe(scope, { childList: true, subtree: true });
}

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
