/*
 * sample-data.js — données d'exemple (fictives) pour voir le rendu de l'app.
 * Les dates sont calculées par rapport à aujourd'hui, pour qu'il y ait
 * toujours des événements passés ET à venir.
 * Toutes portent isSample: true → on peut les supprimer d'un coup dans les réglages.
 */
import { todayISO, addDays } from './format.js';

export function buildSampleData() {
  const today = todayISO();
  const d = (offset) => addDays(today, offset);

  // --- Événements -----------------------------------------------------------
  const event = (n, fields) => ({
    id: `sample_evt_${n}`,
    country: 'France',
    website: '',
    wsdcLevel: 'Registry',
    participation: 'confirmed',
    passType: 'Full pass',
    statuses: { registration: 'paid', lodging: 'paid', transport: 'paid', competitions: 'paid' },
    tasks: [],
    rating: null,
    notes: '',
    isSample: true,
    ...fields,
  });

  const events = [
    event(1, {
      name: 'Swing Riviera', city: 'Nice', startDate: d(-400), endDate: d(-397),
      rating: { music: 5, social: 4, compLevel: 3, organisation: 4, venue: 5, value: 3, verdict: 'yes' },
      notes: "Hôtel à 5 min à pied de la salle. Plage entre les compétitions !",
    }),
    event(2, {
      name: 'Toulouse Swing Days', city: 'Toulouse', startDate: d(-300), endDate: d(-298),
      wsdcLevel: 'Trial',
      rating: { music: 4, social: 5, compLevel: 3, organisation: 4, venue: 3, value: 5, verdict: 'yes' },
    }),
    event(3, {
      name: 'Milano Swing Weekend', city: 'Milan', country: 'Italie', startDate: d(-200), endDate: d(-198),
      participation: 'cancelled',
      statuses: { registration: 'refunded', lodging: 'na', transport: 'na', competitions: 'na' },
      notes: 'Annulé (entorse). Pass remboursé par les organisateurs.',
    }),
    event(4, {
      name: 'Lyon Westie Weekend', city: 'Lyon', startDate: d(-130), endDate: d(-128),
      rating: { music: 3, social: 4, compLevel: 4, organisation: 3, venue: 2, value: 4, verdict: 'maybe' },
      notes: 'Salle trop petite pour le social du samedi.',
    }),
    event(5, {
      name: 'Berlin WCS Open', city: 'Berlin', country: 'Allemagne', startDate: d(-45), endDate: d(-42),
      rating: { music: 5, social: 5, compLevel: 5, organisation: 4, venue: 4, value: 3, verdict: 'yes' },
      tasks: [
        { id: 'sample_t_1', label: 'Envoyer les photos à Camille', area: 'competitions', dueDate: d(-40), done: true },
      ],
    }),
    event(6, {
      name: 'Bordeaux Swing Fest', city: 'Bordeaux', startDate: d(18), endDate: d(20),
      statuses: { registration: 'paid', lodging: 'partial', transport: 'todo', competitions: 'booked' },
      tasks: [
        { id: 'sample_t_2', label: 'Acheter le pass', area: 'registration', dueDate: d(-60), done: true },
        { id: 'sample_t_3', label: 'Payer le solde du logement', area: 'lodging', dueDate: d(-2), done: false },
        { id: 'sample_t_4', label: 'Réserver le train aller-retour', area: 'transport', dueDate: d(4), done: false },
        { id: 'sample_t_5', label: "S'inscrire au Strictly avec Camille", area: 'competitions', dueDate: d(12), done: false },
      ],
    }),
    event(7, {
      name: 'Barcelona Westie Days', city: 'Barcelone', country: 'Espagne', startDate: d(70), endDate: d(73),
      participation: 'considered', passType: '',
      statuses: { registration: 'todo', lodging: 'todo', transport: 'todo', competitions: 'todo' },
      tasks: [
        { id: 'sample_t_6', label: 'Acheter le pass early bird', area: 'registration', dueDate: d(25), done: false },
        { id: 'sample_t_7', label: 'Trouver des colocs pour le logement', area: 'lodging', dueDate: d(40), done: false },
      ],
    }),
    event(8, {
      name: 'Geneva Swing Classic', city: 'Genève', country: 'Suisse', startDate: d(150), endDate: d(152),
      wsdcLevel: 'Trial', participation: 'no', passType: '',
      statuses: { registration: 'na', lodging: 'na', transport: 'na', competitions: 'na' },
    }),
  ];

  // --- Dépenses -------------------------------------------------------------
  let n = 0;
  const expense = (eventId, category, date, totalAmount, people, comment, kind = 'expense') => ({
    id: `sample_exp_${++n}`,
    eventId: eventId ? `sample_evt_${eventId}` : null,
    category, date, totalAmount, people, kind, comment, isSample: true,
  });

  const expenses = [
    expense(1, 'pass', d(-470), 220, 1, 'Full pass early bird'),
    expense(1, 'lodging', d(-460), 390, 3, 'Appartement partagé à 3'),
    expense(1, 'transport', d(-450), 85, 1, 'Train aller-retour'),
    expense(1, 'competition', d(-400), 25, 1, 'Inscription J&J'),
    expense(1, 'privateLesson', d(-398), 90, 1, 'Cours privé pendant le week-end'),

    expense(2, 'pass', d(-360), 180, 1, ''),
    expense(2, 'lodging', d(-340), 240, 2, 'Chambre partagée'),
    expense(2, 'transport', d(-300), 120, 2, 'Covoiturage, essence + péages'),
    expense(2, 'competition', d(-300), 20, 1, 'J&J Advanced'),

    expense(3, 'pass', d(-260), 200, 1, ''),
    expense(3, 'pass', d(-205), 200, 1, 'Remboursement du pass', 'refund'),

    expense(4, 'pass', d(-190), 160, 1, ''),
    expense(4, 'lodging', d(-170), 300, 3, 'Airbnb'),
    expense(4, 'transport', d(-135), 45, 1, 'Train'),
    expense(4, 'competition', d(-130), 25, 1, 'J&J Advanced'),

    expense(5, 'pass', d(-120), 210, 1, ''),
    expense(5, 'lodging', d(-100), 450, 3, 'Appartement à Kreuzberg'),
    expense(5, 'transport', d(-90), 180, 1, 'Vol Paris – Berlin'),
    expense(5, 'competition', d(-45), 25, 1, 'J&J Advanced'),
    expense(5, 'competition', d(-45), 40, 1, 'Strictly Advanced'),
    expense(5, 'privateLesson', d(-44), 120, 2, 'Cours privé avec Camille'),

    expense(6, 'pass', d(-60), 190, 1, ''),
    expense(6, 'lodging', d(-30), 180, 3, 'Acompte 50 % de l\'appartement'),

    expense(null, 'privateLesson', d(-60), 70, 1, 'Cours avec un pro local'),
    expense(null, 'privateLesson', d(-20), 70, 1, 'Cours avec un pro local'),
  ];

  // --- Compétitions ---------------------------------------------------------
  const judges = ['Alex Moreau', 'Sam Keller', 'Nina Rossi', 'Tom Becker', 'Julie Vidal', 'Marco Lenz', 'Eva Lindqvist'];
  const marks = (names, values) => names.map((judge, i) => ({ judge, mark: values[i] }));
  const places = (names, values) => names.map((judge, i) => ({ judge, place: values[i] }));
  const panelA = judges.slice(0, 5);
  const panelB = judges.slice(2, 7);

  const comp = (k, fields) => ({
    id: `sample_cmp_${k}`,
    type: 'jj',
    division: 'Advanced',
    role: 'leader',
    partner: '',
    roundReached: 'prelims',
    placement: null,
    points: 0,
    tier: null,
    rounds: { prelims: [], quarters: [], semis: [], final: [] },
    videoUrl: '',
    feeling: '',
    isSample: true,
    ...fields,
  });

  const competitions = [
    comp(1, {
      eventId: 'sample_evt_1', division: 'Intermediate', partner: 'Chloé',
      roundReached: 'final', placement: 2, points: 12,
      rounds: {
        prelims: marks(panelA, ['yes', 'yes', 'alt1', 'yes', 'yes']),
        quarters: [],
        semis: marks(panelA, ['yes', 'alt2', 'yes', 'yes', 'alt1']),
        final: places(panelA, [2, 1, 3, 2, 2]),
      },
      feeling: 'Super connexion en finale, très bonne musique.',
    }),
    comp(2, {
      eventId: 'sample_evt_2', partner: 'Inès', roundReached: 'semis',
      rounds: {
        prelims: marks(panelB, ['yes', 'alt1', 'yes', 'yes', 'alt3']),
        quarters: [],
        semis: marks(panelB, ['no', 'alt2', 'no', 'alt3', 'no']),
        final: [],
      },
      feeling: 'Trop dans ma tête en demi. Travailler les breaks.',
    }),
    comp(3, {
      eventId: 'sample_evt_4', partner: 'Marta', roundReached: 'final', placement: 4, points: 4,
      rounds: {
        prelims: marks(panelA, ['yes', 'yes', 'yes', 'alt1', 'yes']),
        quarters: marks(panelA, ['yes', 'alt1', 'yes', 'yes', 'no']),
        semis: marks(panelA, ['alt1', 'yes', 'alt2', 'yes', 'yes']),
        final: places(panelA, [4, 3, 5, 4, 4]),
      },
    }),
    comp(4, {
      eventId: 'sample_evt_5', partner: 'Inès', roundReached: 'final', placement: 2, points: 10,
      rounds: {
        prelims: marks(panelB, ['yes', 'yes', 'yes', 'yes', 'alt1']),
        quarters: marks(panelB, ['yes', 'yes', 'alt1', 'yes', 'yes']),
        semis: marks(panelB, ['yes', 'yes', 'yes', 'alt1', 'yes']),
        final: places(panelB, [1, 2, 2, 3, 2]),
      },
      feeling: 'Meilleur résultat de la saison ! Musique lente parfaite pour nous.',
    }),
    comp(5, {
      eventId: 'sample_evt_5', type: 'strictly', partner: 'Camille',
      roundReached: 'final', placement: 1, points: 0,
      rounds: { prelims: [], quarters: [], semis: [], final: places(panelB, [1, 1, 2, 1, 1]) },
      feeling: 'Notre routine de breaks a bien marché.',
    }),
  ];

  return { events, expenses, competitions };
}
