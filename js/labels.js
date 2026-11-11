/*
 * labels.js — les textes affichés pour chaque valeur stockée.
 * Ex. la base contient "confirmed", l'écran affiche "Confirmé".
 * Pour renommer un libellé, modifie le texte à droite des deux-points.
 */
export const PARTICIPATION = {
  considered: 'Envisagé',
  confirmed: 'Confirmé',
  cancelled: 'Annulé',
  no: 'Non',
};
export const PARTICIPATION_COLOR = {
  considered: 'orange', confirmed: 'green', cancelled: 'red', no: 'gray',
};

// Les 4 volets d'un événement
export const AREAS = {
  registration: 'Inscription / pass',
  lodging: 'Logement',
  transport: 'Transport',
  competitions: 'Compétitions',
};

export const STATUS = {
  todo: 'À faire',
  booked: 'Réservé',
  partial: 'Payé partiellement',
  paid: 'Payé',
  refunded: 'Annulé / remboursé',
  na: 'Non concerné',
};
export const STATUS_COLOR = {
  todo: 'red', booked: 'orange', partial: 'yellow', paid: 'green', refunded: 'gray', na: 'gray',
};

export const CATEGORIES = {
  pass: 'Pass',
  lodging: 'Logement',
  transport: 'Transport',
  competition: 'Compétition',
  privateLesson: 'Cours particuliers',
};

export const COMP_TYPES = { jj: 'Jack & Jill', strictly: 'Strictly' };
export const ROLES = { leader: 'Leader', follower: 'Follower' };
export const ROUNDS = { prelims: 'Prélims', quarters: 'Quarts', semis: 'Demi', final: 'Finale' };
export const MARKS = { yes: 'Yes', alt1: 'Alt 1', alt2: 'Alt 2', alt3: 'Alt 3', no: 'No' };

export const RATING_CRITERIA = {
  music: 'DJ / musique',
  social: 'Ambiance social',
  compLevel: 'Niveau des compétitions',
  organisation: 'Organisation',
  venue: 'Lieu / salle',
  value: 'Rapport qualité-prix',
};
export const VERDICT = { yes: 'Oui', maybe: 'Peut-être', no: 'Non' };
