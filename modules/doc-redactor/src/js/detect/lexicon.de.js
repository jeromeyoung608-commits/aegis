// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * German lexical resources used by the name heuristics.
 * Everything is static and bundled — no lookups leave the page.
 */

export const FIRST_NAMES = new Set([
  // female
  'Anna', 'Anja', 'Andrea', 'Angelika', 'Anke', 'Antje', 'Astrid', 'Barbara', 'Beate', 'Bettina',
  'Birgit', 'Brigitte', 'Carina', 'Carmen', 'Clara', 'Claudia', 'Cornelia', 'Christina', 'Christine',
  'Daniela', 'Doris', 'Elena', 'Elisabeth', 'Elke', 'Emilia', 'Emma', 'Erika', 'Eva', 'Franziska',
  'Frauke', 'Gabriele', 'Gisela', 'Hannah', 'Heike', 'Helga', 'Ida', 'Ines', 'Ingrid', 'Iris',
  'Jana', 'Janina', 'Johanna', 'Julia', 'Jutta', 'Karin', 'Katharina', 'Kathrin', 'Katja', 'Kerstin',
  'Klara', 'Kristin', 'Laura', 'Lea', 'Lena', 'Leonie', 'Lilly', 'Lisa', 'Luisa', 'Maren',
  'Maria', 'Marie', 'Marion', 'Martina', 'Melanie', 'Mia', 'Miriam', 'Monika', 'Nadine', 'Nina',
  'Nicole', 'Nora', 'Petra', 'Pia', 'Ramona', 'Rebecca', 'Regina', 'Renate', 'Rita', 'Sabine',
  'Sandra', 'Sarah', 'Saskia', 'Silke', 'Simone', 'Sophie', 'Stefanie', 'Susanne', 'Tanja', 'Teresa',
  'Theresa', 'Ursula', 'Uta', 'Vanessa', 'Verena', 'Vera', 'Waltraud', 'Yvonne',
  // male
  'Achim', 'Adrian', 'Alexander', 'Andreas', 'Anton', 'Armin', 'Arne', 'Axel', 'Bastian', 'Ben',
  'Bernd', 'Bernhard', 'Björn', 'Bodo', 'Carsten', 'Christoph', 'Christian', 'Claus', 'Daniel', 'David',
  'Detlef', 'Dieter', 'Dietmar', 'Dirk', 'Dominik', 'Elias', 'Emil', 'Erik', 'Ernst', 'Fabian',
  'Felix', 'Finn', 'Florian', 'Frank', 'Franz', 'Friedrich', 'Gerd', 'Gerald', 'Gerhard', 'Günter',
  'Gunnar', 'Gustav', 'Hannes', 'Hans', 'Harald', 'Heiko', 'Heinrich', 'Heinz', 'Helmut', 'Henning',
  'Herbert', 'Holger', 'Horst', 'Hubert', 'Ingo', 'Jan', 'Jens', 'Joachim', 'Jochen', 'Johannes',
  'Jonas', 'Julian', 'Jürgen', 'Kai', 'Karl', 'Karsten', 'Klaus', 'Konrad', 'Kurt', 'Lars',
  'Leon', 'Linus', 'Lorenz', 'Lothar', 'Lukas', 'Magnus', 'Malte', 'Manfred', 'Marcel', 'Marco',
  'Marius', 'Markus', 'Martin', 'Matthias', 'Maximilian', 'Max', 'Michael', 'Moritz', 'Niklas', 'Nils',
  'Norbert', 'Ole', 'Oliver', 'Oskar', 'Otto', 'Patrick', 'Paul', 'Peter', 'Philipp', 'Rainer',
  'Ralf', 'Reiner', 'Reinhard', 'René', 'Richard', 'Robert', 'Rolf', 'Rudolf', 'Sebastian', 'Siegfried',
  'Simon', 'Stefan', 'Steffen', 'Sven', 'Thomas', 'Thorsten', 'Tobias', 'Torsten', 'Udo', 'Uli',
  'Ulrich', 'Uwe', 'Volker', 'Werner', 'Wilfried', 'Wilhelm', 'Wolfgang', 'Wolfram'
]);

/** Salutations / roles that introduce a natural person. */
export const SALUTATIONS = new Set([
  'Herr', 'Herrn', 'Frau', 'Patient', 'Patientin', 'Mandant', 'Mandantin', 'Klient', 'Klientin',
  'Versicherter', 'Versicherte', 'Bewerber', 'Bewerberin', 'Zeuge', 'Zeugin', 'Mitarbeiter',
  'Mitarbeiterin', 'Kollege', 'Kollegin', 'Ansprechpartner', 'Ansprechpartnerin', 'Sohn', 'Tochter',
  'Ehefrau', 'Ehemann', 'Ehepartner', 'Ehepartnerin', 'Mutter', 'Vater', 'Vormund', 'Betreuer',
  'Betreuerin', 'Sachbearbeiter', 'Sachbearbeiterin', 'Antragsteller', 'Antragstellerin',
  'Versicherungsnehmer', 'Versicherungsnehmerin', 'Arbeitgeber', 'Arbeitnehmer'
]);

/** Field labels that are followed by a person or organisation name. */
export const NAME_LABELS = new Set([
  'Name', 'Nachname', 'Vorname', 'Geburtsname', 'Familienname', 'Patientenname', 'Klientenname',
  'Arbeitnehmer', 'Arbeitgeber', 'Ansprechpartner', 'Ansprechpartnerin', 'Sachbearbeiter',
  'Bearbeiter', 'Antragsteller', 'Versicherungsnehmer', 'Hauptversicherter', 'Ehegatte', 'Ehegattin',
  'Kind', 'Mutter', 'Vater', 'Sohn', 'Tochter', 'Zeuge', 'Zeugin', 'Bewerber', 'Bewerberin'
]);

/** Case-insensitive form so English form labels ("Client name") still match. */
export const NAME_LABELS_CI = new Set([...NAME_LABELS].map((label) => label.toLowerCase()));

export const TITLES = new Set([
  'Dr', 'Dr.', 'Prof', 'Prof.', 'Dipl', 'Dipl.', 'Ing', 'Ing.', 'med', 'med.', 'jur', 'jur.',
  'RA', 'RÄin', 'Rechtsanwalt', 'Rechtsanwältin', 'Notar', 'Notarin', 'StB', 'WP', 'Mr', 'Mrs', 'Ms'
]);

/** Capitalized words that must not be treated as names. */
export const STOPWORDS = new Set([
  'Der', 'Die', 'Das', 'Den', 'Dem', 'Des', 'Ein', 'Eine', 'Einer', 'Eines', 'Einen', 'Und', 'Oder',
  'Aber', 'Wenn', 'Falls', 'Nach', 'Vor', 'Bei', 'Mit', 'Ohne', 'Für', 'Über', 'Unter', 'Zwischen',
  'Im', 'In', 'Am', 'An', 'Auf', 'Aus', 'Zum', 'Zur', 'Vom', 'Von', 'Seit', 'Bis', 'Auch', 'Nicht',
  'Nur', 'Sowie', 'Hiermit', 'Hiervon', 'Gemäß', 'Laut', 'Bitte', 'Vielen', 'Sehr', 'Geehrte',
  'Geehrter', 'Freundlichen', 'Grüßen', 'Anlage', 'Betreff', 'Datum', 'Seite', 'Tel', 'Fax',
  'Mail', 'Unterschrift', 'Ort', 'Stand', 'Zeit', 'Nr', 'Abs', 'Art', 'Haus', 'Wohnung',
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober',
  'November', 'Dezember', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag',
  'Sonntag', 'Berlin', 'München', 'Hamburg', 'Köln', 'Frankfurt', 'Stuttgart', 'Düsseldorf',
  'Leipzig', 'Dresden', 'Hannover', 'Bremen', 'Nürnberg', 'Dortmund', 'Essen', 'Bonn', 'Münster',
  'Karlsruhe', 'Wiesbaden', 'Augsburg', 'Freiburg', 'Kiel', 'Mainz', 'Erfurt', 'Rostock',
  'GmbH', 'AG', 'KG', 'OHG', 'UG', 'GbR', 'SE', 'PartG', 'mbB', 'Inc', 'Ltd', 'LLP', 'Bank',
  'Kanzlei', 'Praxis', 'Klinik', 'Klinikum', 'Krankenhaus', 'Universität', 'Hochschule',
  'Vertrag', 'Rechnung', 'Antrag', 'Bescheid', 'Anlage', 'Anhang', 'Anschreiben', 'Protokoll',
  'Befund', 'Diagnose', 'Therapie', 'Medikament', 'Station', 'Aufnahme', 'Entlassung'
]);

export const COMPANY_SUFFIXES = new Set([
  'GmbH', 'AG', 'KG', 'OHG', 'UG', 'GbR', 'SE', 'PartG', 'mbB', 'Inc', 'Ltd', 'LLP', 'Co', 'Bank',
  'Kanzlei', 'Praxis', 'Klinik', 'Klinikum', 'Krankenhaus', 'Versicherung', 'Holding'
]);

/** Remove surrounding punctuation and whitespace from an OCR token. */
export function cleanToken(value) {
  return String(value || '')
    .replace(/^[^\p{L}]+/u, '')
    .replace(/[^\p{L}]+$/u, '');
}

export function looksLikePersonName(token) {
  if (!token || token.length < 2) return false;
  if (STOPWORDS.has(token) || COMPANY_SUFFIXES.has(token)) return false;
  if (FIRST_NAMES.has(token)) return true;
  return /^[A-ZÄÖÜ][a-zäöüß\-']+$/u.test(token);
}
