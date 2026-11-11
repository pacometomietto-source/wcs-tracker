/*
 * ui.js — petits outils partagés par tous les écrans.
 */
import { state, availableSeasons, saveSettings, backupStatus } from './store.js';
import { formatTimestamp } from './format.js';

// Protège le texte saisi avant de l'insérer dans la page
// (sinon un nom contenant "<" casserait l'affichage).
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Redessine l'écran courant (après une modification).
export function refresh() {
  window.dispatchEvent(new Event('app:render'));
}

// Petit message qui apparaît quelques secondes en bas de l'écran.
let toastTimer = null;
export function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

// Sélecteur de saison « 2026 ▾ »
export function seasonPicker() {
  const current = String(state.settings.season);
  const options = availableSeasons()
    .map((y) => `<option value="${y}" ${String(y) === current ? 'selected' : ''}>${y}</option>`)
    .join('');
  return `<select class="season-select" data-season-picker aria-label="Saison">
    ${options}
    <option value="all" ${current === 'all' ? 'selected' : ''}>Toutes</option>
  </select>`;
}

// En-tête de page : grand titre + sélecteur de saison (optionnel)
export function pageHeader(title, { season = true } = {}) {
  return `<header class="page-header">
    <h1>${esc(title)}</h1>
    ${season ? seasonPicker() : ''}
  </header>`;
}

// Bandeau de rappel de sauvegarde (affiché si plus de 30 jours)
export function backupBanner() {
  const status = backupStatus();
  if (!status.overdue) return '';
  const text = status.lastAt
    ? `Dernière sauvegarde le ${formatTimestamp(status.lastAt)}, il y a ${status.days} jours.`
    : "Tu n'as encore jamais sauvegardé tes données.";
  return `<a class="banner" href="#/reglages">
    <span style="font-size:24px">💾</span>
    <span class="banner-text"><strong>Pense à sauvegarder</strong><br>${text}</span>
    <span class="row-chevron"></span>
  </a>`;
}

// À appeler après avoir dessiné un écran : active le sélecteur de saison.
export function bindCommon(root) {
  root.querySelectorAll('[data-season-picker]').forEach((select) => {
    select.addEventListener('change', async () => {
      const value = select.value === 'all' ? 'all' : Number(select.value);
      await saveSettings({ season: value });
      refresh();
    });
  });
}

// L'app est-elle ouverte depuis l'écran d'accueil (et non dans Safari) ?
export function isInstalled() {
  return window.navigator.standalone === true
    || window.matchMedia('(display-mode: standalone)').matches;
}
