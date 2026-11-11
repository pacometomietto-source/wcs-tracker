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

// Options d'une liste déroulante.
// `values` : un tableau ["A", "B"] ou un objet { code: "Libellé" }.
// `emptyLabel` (optionnel) ajoute un premier choix vide.
export function options(values, selected, emptyLabel) {
  const entries = Array.isArray(values) ? values.map((v) => [v, v]) : Object.entries(values);
  // Garde la valeur actuelle même si elle a été retirée de la liste dans les réglages
  if (selected && !entries.some(([k]) => k === selected)) entries.push([selected, selected]);
  const empty = emptyLabel !== undefined
    ? `<option value="" ${!selected ? 'selected' : ''}>${esc(emptyLabel)}</option>`
    : '';
  return empty + entries
    .map(([k, label]) => `<option value="${esc(k)}" ${k === selected ? 'selected' : ''}>${esc(label)}</option>`)
    .join('');
}

// Fiche qui glisse depuis le bas de l'écran (formulaires).
//  - onSave(form) : appelé sur « OK » ; renvoyer false pour garder la fiche ouverte.
//  - onDelete()   : optionnel, ajoute un bouton rouge en bas.
export function openSheet({ title, body, saveLabel = 'OK', onSave, onDelete, deleteLabel = 'Supprimer' }) {
  const root = document.createElement('div');
  root.className = 'sheet-backdrop';
  root.innerHTML = `
    <form class="sheet" novalidate>
      <div class="sheet-header">
        <button type="button" class="sheet-btn" data-cancel>Annuler</button>
        <div class="sheet-title">${esc(title)}</div>
        <button type="submit" class="sheet-btn strong">${esc(saveLabel)}</button>
      </div>
      <div class="sheet-body">
        ${body}
        <button type="submit" class="btn mt-l">${esc(saveLabel)}</button>
        ${onDelete ? `<div class="list mt-l"><button type="button" class="row action danger" data-delete>${esc(deleteLabel)}</button></div>` : ''}
      </div>
    </form>`;
  document.body.appendChild(root);
  document.body.classList.add('no-scroll');
  requestAnimationFrame(() => root.classList.add('open'));

  const form = root.querySelector('form');
  const close = () => {
    root.classList.remove('open');
    document.body.classList.remove('no-scroll');
    setTimeout(() => root.remove(), 300);
  };
  root.addEventListener('click', (e) => { if (e.target === root) close(); });
  form.querySelector('[data-cancel]').addEventListener('click', close);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if ((await onSave(form)) !== false) close();
  });
  if (onDelete) {
    form.querySelector('[data-delete]').addEventListener('click', async () => {
      if ((await onDelete()) !== false) close();
    });
  }
  return { form, close };
}

// L'app est-elle ouverte depuis l'écran d'accueil (et non dans Safari) ?
export function isInstalled() {
  return window.navigator.standalone === true
    || window.matchMedia('(display-mode: standalone)').matches;
}
