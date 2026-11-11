/*
 * store.js — les données de l'app et les règles de calcul.
 *
 * Au démarrage, tout est chargé depuis IndexedDB dans l'objet `state`.
 * Les écrans lisent `state` directement ; chaque modification passe par
 * une fonction save…/delete… qui met à jour `state` ET la base.
 */
import * as db from './db.js';
import { buildSampleData } from './sample-data.js';
import { daysSince } from './format.js';

export const APP_VERSION = '0.1.0 (étape 0)';

export const DEFAULT_SETTINGS = {
  id: 'app',
  season: new Date().getFullYear(),   // saison affichée (une année, ou "all")
  lastBackupAt: null,                 // date de la dernière sauvegarde exportée
  sampleDataEnabled: true,            // données d'exemple affichées ?
  myDivision: 'Advanced',             // ma division actuelle en Jack & Jill
  passTypes: ['Full pass', 'Party pass', 'Comp only', 'Day pass'],
  wsdcLevels: ['Non-WSDC', 'Trial', 'Registry'],
  divisions: ['Newcomer', 'Novice', 'Intermediate', 'Advanced', 'All-Star', 'Champion'],
  // Seuils de passage de division (points Jack & Jill dans la division de départ).
  // « allowed » = je peux monter ; « required » = je dois monter.
  thresholds: [
    { from: 'Novice', to: 'Intermediate', allowed: 16, required: 30 },
    { from: 'Intermediate', to: 'Advanced', allowed: 30, required: 45 },
    { from: 'Advanced', to: 'All-Star', allowed: 60, required: 90 },
  ],
  startingPoints: {},                 // points obtenus avant l'app, par division
};

export const state = {
  events: [],
  expenses: [],
  competitions: [],
  settings: { ...DEFAULT_SETTINGS },
};

const clone = (obj) => JSON.parse(JSON.stringify(obj));

// ---------------------------------------------------------------------------
// Chargement
// ---------------------------------------------------------------------------
export async function loadAll() {
  const [events, expenses, competitions, saved] = await Promise.all([
    db.getAll('events'),
    db.getAll('expenses'),
    db.getAll('competitions'),
    db.get('settings', 'app'),
  ]);
  state.events = events;
  state.expenses = expenses;
  state.competitions = competitions;
  state.settings = { ...clone(DEFAULT_SETTINGS), ...(saved || {}) };

  // Tout premier lancement : on enregistre les réglages et on ajoute les exemples.
  if (!saved) {
    await db.put('settings', state.settings);
    if (state.settings.sampleDataEnabled) await addSampleData();
  }
}

// ---------------------------------------------------------------------------
// Identifiants uniques
// ---------------------------------------------------------------------------
export function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// ---------------------------------------------------------------------------
// Enregistrement / suppression
// ---------------------------------------------------------------------------
function upsert(list, item) {
  const i = list.findIndex((x) => x.id === item.id);
  if (i >= 0) list[i] = item; else list.push(item);
}

export async function saveSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  await db.put('settings', state.settings);
}

export async function saveEvent(event) {
  await db.put('events', event);
  upsert(state.events, event);
}

// Supprimer un événement supprime aussi ses dépenses et compétitions.
export async function deleteEvent(id) {
  const expenseIds = state.expenses.filter((x) => x.eventId === id).map((x) => x.id);
  const compIds = state.competitions.filter((x) => x.eventId === id).map((x) => x.id);
  await db.deleteMany('expenses', expenseIds);
  await db.deleteMany('competitions', compIds);
  await db.remove('events', id);
  state.expenses = state.expenses.filter((x) => x.eventId !== id);
  state.competitions = state.competitions.filter((x) => x.eventId !== id);
  state.events = state.events.filter((x) => x.id !== id);
}

export async function saveExpense(expense) {
  await db.put('expenses', expense);
  upsert(state.expenses, expense);
}

export async function deleteExpense(id) {
  await db.remove('expenses', id);
  state.expenses = state.expenses.filter((x) => x.id !== id);
}

export async function saveCompetition(comp) {
  await db.put('competitions', comp);
  upsert(state.competitions, comp);
}

export async function deleteCompetition(id) {
  await db.remove('competitions', id);
  state.competitions = state.competitions.filter((x) => x.id !== id);
}

// ---------------------------------------------------------------------------
// Saisons
// ---------------------------------------------------------------------------
export const getEvent = (id) => state.events.find((e) => e.id === id);

export const eventYear = (event) => Number(event.startDate.slice(0, 4));

// Une dépense appartient à la saison de son événement
// (ou à l'année de son paiement si elle est « hors événement »).
export function expenseYear(expense) {
  const event = expense.eventId && getEvent(expense.eventId);
  return event ? eventYear(event) : Number(expense.date.slice(0, 4));
}

export function competitionYear(comp) {
  const event = getEvent(comp.eventId);
  return event ? eventYear(event) : null;
}

const matches = (year, season) => season === 'all' || year === Number(season);

export const eventsInSeason = (season = state.settings.season) =>
  state.events.filter((e) => matches(eventYear(e), season));

export const expensesInSeason = (season = state.settings.season) =>
  state.expenses.filter((x) => matches(expenseYear(x), season));

export const competitionsInSeason = (season = state.settings.season) =>
  state.competitions.filter((c) => matches(competitionYear(c), season));

// Liste des années à proposer dans le sélecteur (plus récente d'abord).
export function availableSeasons() {
  const years = new Set([new Date().getFullYear()]);
  state.events.forEach((e) => years.add(eventYear(e)));
  state.expenses.forEach((x) => years.add(expenseYear(x)));
  const current = state.settings.season;
  if (current !== 'all') years.add(Number(current));
  return [...years].sort((a, b) => b - a);
}

// ---------------------------------------------------------------------------
// Calculs
// ---------------------------------------------------------------------------
// Ma part d'une dépense (négative pour un remboursement).
export function myShare(expense) {
  const people = Math.max(1, Number(expense.people) || 1);
  const share = Math.round((Number(expense.totalAmount) || 0) / people * 100) / 100;
  return expense.kind === 'refund' ? -share : share;
}

// ---------------------------------------------------------------------------
// Sauvegarde (export / import JSON)
// ---------------------------------------------------------------------------
const realOnly = (list) => list.filter((x) => !x.isSample);

export const hasRealData = () =>
  realOnly(state.events).length + realOnly(state.expenses).length + realOnly(state.competitions).length > 0;

// État de la sauvegarde : { lastAt, days, overdue }
export function backupStatus() {
  const lastAt = state.settings.lastBackupAt;
  if (!lastAt) return { lastAt: null, days: null, overdue: hasRealData() };
  const days = daysSince(lastAt);
  return { lastAt, days, overdue: days > 30 };
}

// Contenu du fichier de sauvegarde (sans les données d'exemple).
export function buildBackup() {
  return {
    app: 'wcs-tracker',
    format: 1,
    exportedAt: new Date().toISOString(),
    events: realOnly(state.events),
    expenses: realOnly(state.expenses),
    competitions: realOnly(state.competitions),
    settings: state.settings,
  };
}

// Vérifie un fichier de sauvegarde et renvoie un petit résumé.
export function checkBackup(data) {
  const ok = data && data.app === 'wcs-tracker'
    && Array.isArray(data.events) && Array.isArray(data.expenses) && Array.isArray(data.competitions);
  if (!ok) throw new Error("Ce fichier n'est pas une sauvegarde WCS Tracker.");
  return {
    exportedAt: data.exportedAt,
    events: data.events.length,
    expenses: data.expenses.length,
    competitions: data.competitions.length,
  };
}

// Remplace toutes les données par celles de la sauvegarde.
export async function importBackup(data) {
  checkBackup(data);
  const settings = {
    ...clone(DEFAULT_SETTINGS),
    ...(data.settings || {}),
    id: 'app',
    sampleDataEnabled: false,
    lastBackupAt: data.exportedAt || new Date().toISOString(),
  };
  await db.replaceAll({
    events: data.events,
    expenses: data.expenses,
    competitions: data.competitions,
    settings: [settings],
  });
  await loadAll();
}

// ---------------------------------------------------------------------------
// Données d'exemple
// ---------------------------------------------------------------------------
async function removeSampleData() {
  for (const store of ['events', 'expenses', 'competitions']) {
    const ids = state[store].filter((x) => x.isSample).map((x) => x.id);
    await db.deleteMany(store, ids);
    state[store] = state[store].filter((x) => !x.isSample);
  }
}

async function addSampleData() {
  await removeSampleData();
  const sample = buildSampleData();
  for (const store of ['events', 'expenses', 'competitions']) {
    await db.putMany(store, sample[store]);
    state[store].push(...sample[store]);
  }
}

export async function setSampleData(enabled) {
  if (enabled) await addSampleData(); else await removeSampleData();
  await saveSettings({ sampleDataEnabled: enabled });
}
