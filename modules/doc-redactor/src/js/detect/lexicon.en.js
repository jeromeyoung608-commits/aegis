// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
/**
 * English lexical resources for the name heuristics (mirrors lexicon.de.js).
 * Static and bundled — no lookups leave the page.
 */

export const FIRST_NAMES = new Set([
  'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph',
  'Thomas', 'Charles', 'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark',
  'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian',
  'George', 'Timothy', 'Ronald', 'Jason', 'Edward', 'Jeffrey', 'Ryan', 'Jacob',
  'Gary', 'Nicholas', 'Eric', 'Jonathan', 'Stephen', 'Larry', 'Justin', 'Scott',
  'Brandon', 'Benjamin', 'Samuel', 'Gregory', 'Alexander', 'Patrick', 'Frank',
  'Raymond', 'Jack', 'Dennis', 'Jerry', 'Mary', 'Patricia', 'Jennifer', 'Linda',
  'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen', 'Lisa', 'Nancy',
  'Betty', 'Sandra', 'Margaret', 'Ashley', 'Kimberly', 'Emily', 'Donna', 'Michelle',
  'Carol', 'Amanda', 'Melissa', 'Deborah', 'Stephanie', 'Rebecca', 'Laura', 'Sharon',
  'Cynthia', 'Kathleen', 'Amy', 'Angela', 'Shirley', 'Anna', 'Brenda', 'Emma',
  'Olivia', 'Sophia', 'Isabella', 'Mia', 'Charlotte', 'Amelia', 'Harper', 'Evelyn'
]);

/** Salutations / roles that introduce a natural person. */
export const SALUTATIONS = new Set([
  'Mr', 'Mrs', 'Ms', 'Miss', 'Mx', 'Dr', 'Prof', 'Sir', 'Madam', 'Rev', 'Hon',
  'Capt', 'Lt', 'Col', 'Mr.', 'Mrs.', 'Ms.', 'Miss.', 'Dr.', 'Prof.', 'Rev.',
  'Patient', 'Client', 'Customer', 'Applicant', 'Tenant', 'Landlord', 'Employee',
  'Employer', 'Beneficiary', 'Recipient', 'Witness', 'Guarantor', 'Cardholder',
  'Policyholder', 'Insured', 'Member', 'Student', 'Parent', 'Guardian', 'Attorney',
  'Proprietor', 'Director', 'Manager', 'Account', 'Account holder', 'Subject'
]);

/** Field labels followed by a person or organisation name. */
export const NAME_LABELS = new Set([
  'Name', 'First name', 'Last name', 'Surname', 'Given name', 'Full name',
  'Client', 'Client name', 'Patient', 'Patient name', 'Account holder', 'Customer',
  'Applicant', 'Tenant', 'Landlord', 'Employee', 'Employer', 'Beneficiary',
  'Recipient', 'Witness', 'Guarantor', 'Cardholder', 'Policyholder', 'Insured',
  'Member', 'Student', 'Parent', 'Guardian', 'Attorney', 'Proprietor', 'Director',
  'Manager', 'Subject', 'Son', 'Daughter', 'Mother', 'Father'
]);

/** Case-insensitive form so "name:" still matches. */
export const NAME_LABELS_CI = new Set([...NAME_LABELS].map((label) => label.toLowerCase()));

export const TITLES = new Set([
  'Dr', 'Dr.', 'Mr', 'Mr.', 'Mrs', 'Mrs.', 'Ms', 'Ms.', 'Prof', 'Prof.', 'Rev',
  'Rev.', 'MD', 'PhD', 'QC', 'Sir', 'Dame', 'Esq', 'Esq.'
]);

/** Capitalized words that must NOT be treated as names. */
export const STOPWORDS = new Set([
  'The', 'A', 'An', 'And', 'Or', 'But', 'If', 'When', 'With', 'Without', 'For',
  'To', 'From', 'At', 'By', 'On', 'In', 'Of', 'As', 'This', 'That', 'These',
  'Those', 'We', 'You', 'They', 'He', 'She', 'It', 'Also', 'Not', 'No', 'Yes',
  'Please', 'Thank', 'Dear', 'Sincerely', 'Regards', 'Kind', 'Best', 'Yours',
  'Re', 'Re:', 'Subject', 'Date', 'Page', 'Tel', 'Fax', 'Email', 'Phone', 'Mobile',
  'Address', 'Account', 'Invoice', 'Statement', 'Contract', 'Application', 'Report',
  'Annex', 'Attachment', 'Letter', 'Note', 'Total', 'Amount', 'Balance', 'Due',
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December', 'London', 'Manchester', 'Birmingham',
  'Leeds', 'Glasgow', 'Edinburgh', 'Liverpool', 'Bristol', 'New', 'York', 'Boston',
  'Chicago', 'Seattle', 'Denver', 'Austin', 'Miami', 'Atlanta', 'Houston', 'Dallas',
  'LLC', 'Inc', 'Ltd', 'Corp', 'PLC', 'LLP', 'Co', 'Bank', 'Trust', 'Insurance',
  'University', 'College', 'Hospital', 'Clinic', 'Foundation', 'Partners',
  'Associates', 'Holdings', 'Group', 'Limited'
]);

export const COMPANY_SUFFIXES = new Set([
  'LLC', 'Inc', 'Ltd', 'Corp', 'PLC', 'LLP', 'GP', 'LP', 'Co', 'Bank', 'Trust',
  'Holdings', 'Group', 'University', 'College', 'Hospital', 'Clinic', 'Insurance',
  'Foundation', 'Partners', 'Associates', 'Limited', 'Incorporated'
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
  return /^[A-Z][a-z\-']+$/u.test(token);
}
