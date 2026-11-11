/*
 * format.js — affichage à la française : dates, euros, nombres.
 * Les dates sont stockées au format "AAAA-MM-JJ" (ex. "2026-03-12").
 */
const fmtLong = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtShort = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtDayMonth = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const fmtEuro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

// "2026-03-12" → objet Date (à minuit, heure locale)
export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// objet Date → "2026-03-12"
export function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const todayISO = () => toISO(new Date());

export function addDays(iso, days) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

// "2026-03-12" → "12 mars 2026"
export const formatDate = (iso) => (iso ? fmtLong.format(parseISO(iso)) : '');

// "2026-03-12" → "12 mars"
export const formatDayMonth = (iso) => (iso ? fmtDayMonth.format(parseISO(iso)) : '');

// "2026-03-12" → "mars" (abrégé, sans point final)
const fmtMonth = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
export const formatMonthShort = (iso) => fmtMonth.format(parseISO(iso)).replace('.', '');

// "2026-11-12" → "novembre 2026" (formatMonthYear) ou "nov. 2026" (formatMonthYearShort)
const fmtMonthYearLong = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const fmtMonthYearShort = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' });
export const formatMonthYear = (iso) => fmtMonthYearLong.format(parseISO(iso));
export const formatMonthYearShort = (iso) => fmtMonthYearShort.format(parseISO(iso));

// Texte saisi → nombre. Accepte la virgule : "12,50" → 12.5 ; "" → NaN
export function parseAmount(text) {
  const cleaned = String(text ?? '').replace(/[\s€]/g, '').replace(',', '.');
  return cleaned === '' ? NaN : Number(cleaned);
}

// Nombre → texte pour un champ de saisie : 12.5 → "12,5"
export const amountToInput = (n) => (n === '' || n == null ? '' : String(n).replace('.', ','));

// Date/heure complète (ex. date de dernière sauvegarde) → "2 oct. 2026"
export const formatTimestamp = (ts) => (ts ? fmtShort.format(new Date(ts)) : '');

// Deux dates → "12–15 mars 2026", "28 févr. – 2 mars 2026", etc.
export function formatDateRange(start, end) {
  if (!start) return '';
  if (!end || end === start) return formatDate(start);
  const a = parseISO(start);
  const b = parseISO(end);
  if (a.getFullYear() !== b.getFullYear()) return `${fmtShort.format(a)} – ${fmtShort.format(b)}`;
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${fmtLong.format(b)}`;
  return `${fmtDayMonth.format(a)} – ${fmtLong.format(b)}`;
}

// 12.5 → "12,50 €"
export const formatEuro = (n) => fmtEuro.format(n || 0);

// Nombre de jours entre aujourd'hui et une date (négatif = dans le passé)
export function daysUntil(iso) {
  const today = parseISO(todayISO());
  return Math.round((parseISO(iso) - today) / 86400000);
}

// Nombre de jours écoulés depuis une date/heure
export function daysSince(ts) {
  return Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
}

// 3 → "dans 3 jours", -2 → "il y a 2 jours"
export function formatRelativeDays(n) {
  if (n === 0) return "aujourd'hui";
  if (n === 1) return 'demain';
  if (n === -1) return 'hier';
  return n > 0 ? `dans ${n} jours` : `il y a ${-n} jours`;
}
