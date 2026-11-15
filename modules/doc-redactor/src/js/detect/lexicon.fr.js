// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
/**
 * French lexical resources for the name heuristics (mirrors lexicon.de.js).
 * Static and bundled — no lookups leave the page.
 */

export const FIRST_NAMES = new Set([
  'Jean', 'Pierre', 'Michel', 'Philippe', 'André', 'Louis', 'Alain', 'Jacques',
  'François', 'Bernard', 'Robert', 'Nicolas', 'Claude', 'Olivier', 'Christian',
  'Christophe', 'Daniel', 'Patrick', 'Thierry', 'Pascal', 'Éric', 'David', 'Laurent',
  'Antoine', 'Henri', 'Paul', 'Marc', 'Julien', 'Bruno', 'Sébastien', 'Yves',
  'Stéphane', 'Jérôme', 'Hugo', 'Lucas', 'Thomas', 'Romain', 'Quentin', 'Florian',
  'Marie', 'Nathalie', 'Isabelle', 'Sophie', 'Catherine', 'Françoise', 'Martine',
  'Monique', 'Christine', 'Valérie', 'Hélène', 'Brigitte', 'Véronique', 'Sylvie',
  'Nicole', 'Sandrine', 'Claire', 'Anne', 'Céline', 'Julie', 'Laurence', 'Chantal',
  'Corinne', 'Caroline', 'Emilie', 'Manon', 'Léa', 'Camille', 'Sarah', 'Inès'
]);

/** Salutations / roles that introduce a natural person. */
export const SALUTATIONS = new Set([
  'M', 'Mme', 'Mlle', 'Dr', 'Prof', 'Me', 'Sr', 'Madame', 'Mademoiselle', 'Monsieur',
  'Docteur', 'Professeur', 'Maître', 'Patient', 'Client', 'Adhérent', 'Assuré',
  'Demandeur', 'Locataire', 'Propriétaire', 'Employé', 'Employeur', 'Bénéficiaire',
  'Titulaire', 'Membre', 'Étudiant', 'Parent', 'Tuteur', 'Mandataire', 'Directeur', 'Gérant'
]);

/** Field labels followed by a person or organisation name. */
export const NAME_LABELS = new Set([
  'Nom', 'Prénom', 'Nom de famille', 'Client', 'Patient', 'Compte', 'Adhérent',
  'Assuré', 'Demandeur', 'Locataire', 'Propriétaire', 'Employé', 'Employeur',
  'Bénéficiaire', 'Titulaire', 'Membre', 'Étudiant', 'Parent', 'Tuteur', 'Mandataire',
  'Directeur', 'Gérant', 'Enfant', 'Fils', 'Fille', 'Mère', 'Père'
]);

export const NAME_LABELS_CI = new Set([...NAME_LABELS].map((label) => label.toLowerCase()));

export const TITLES = new Set([
  'Dr', 'Dr.', 'M', 'M.', 'Mme', 'Mme.', 'Mlle', 'Mlle.', 'Prof', 'Prof.',
  'Me', 'Me.', 'MD', 'PhD', 'SARL', 'SAS'
]);

/** Capitalized words that must NOT be treated as names. */
export const STOPWORDS = new Set([
  'Le', 'La', 'Les', 'Un', 'Une', 'Des', 'Du', 'De', 'Et', 'Ou', 'Mais', 'Si', 'Quand',
  'Avec', 'Sans', 'Pour', 'Par', 'Sur', 'Dans', 'Chez', 'Sous', 'Entre', 'Pendant',
  'Depuis', 'Jusqu', 'Aussi', 'Pas', 'Non', 'Oui', 'Merci', 'Cher', 'Chère', 'Objet',
  'Date', 'Page', 'Tél', 'Tel', 'Fax', 'Courriel', 'Mail', 'Téléphone', 'Mobile',
  'Adresse', 'Compte', 'Facture', 'Relevé', 'Contrat', 'Demande', 'Rapport', 'Annexe',
  'Pièce', 'Lettre', 'Note', 'Total', 'Montant', 'Solde', 'À', 'A', 'Du', 'Paiement',
  'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche',
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre',
  'Octobre', 'Novembre', 'Décembre', 'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice',
  'Nantes', 'Montpellier', 'Strasbourg', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Saint',
  'SARL', 'SAS', 'SA', 'EURL', 'SCI', 'SNC', 'Banque', 'Assurance', 'Hôpital', 'Clinique',
  'Université', 'Collège', 'Cabinet', 'Société', 'Group', 'France', 'Euro', 'EUR'
]);

export const COMPANY_SUFFIXES = new Set([
  'SARL', 'SAS', 'SA', 'EURL', 'SCI', 'SNC', 'Banque', 'Assurance', 'Hôpital', 'Clinique',
  'Université', 'Collège', 'Cabinet', 'Société', 'Group'
]);

/** Role labels printed on one line that introduce a name on the NEXT line. */
export const NAME_LINE_LABEL = /^\s*(?:Client|Patient|Compte|Demandeur|Locataire|Propriétaire|Employé|Employeur|Bénéficiaire|Titulaire|Assuré|Membre|Étudiant|Nom|Prénom|M\.|Mme|Mlle)\b/i;

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
  return /^[A-ZÀ-Ý][a-zà-ÿ\-']+$/u.test(token);
}
