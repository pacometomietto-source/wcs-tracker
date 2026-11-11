/*
 * Écran « Accueil » — version étape 0 :
 * des vérifications pour s'assurer que l'installation fonctionne.
 * Le vrai tableau de bord arrive à l'étape 4.
 */
import { state, eventsInSeason, expensesInSeason, competitionsInSeason } from '../store.js';
import { pageHeader, backupBanner, bindCommon, isInstalled } from '../ui.js';

export function render(el) {
  const season = state.settings.season;
  const seasonLabel = season === 'all' ? 'toutes saisons' : `saison ${season}`;
  const offlineReady = 'serviceWorker' in navigator && !!navigator.serviceWorker.controller;

  el.innerHTML = `
    ${pageHeader('Accueil')}
    ${backupBanner()}

    <div class="card" style="margin-top:12px">
      <strong>Étape 2 : les dépenses 💶</strong>
      <p class="muted small" style="margin:6px 0 0">
        Les événements et les dépenses sont prêts (fiche événement, et vue « Dépenses »
        dans l'onglet Événements). Les compétitions et ce tableau de bord arrivent aux étapes suivantes.
      </p>
    </div>

    <div class="section-title">Vérifications</div>
    <div class="list">
      ${check('Ouverte depuis', isInstalled() ? "l'écran d'accueil" : 'le navigateur', isInstalled())}
      ${check('Connexion', navigator.onLine ? 'En ligne' : 'Hors ligne ✈️', true)}
      ${check('Prête pour le hors ligne', offlineReady ? 'Oui' : 'Pas encore', offlineReady)}
    </div>
    <div class="section-footer">
      « Prête pour le hors ligne » passe à Oui après la 2ᵉ ouverture de l'app (ou en tirant pour recharger).
    </div>

    <div class="section-title">Données (${seasonLabel})</div>
    <div class="list">
      ${count('Événements', eventsInSeason().length)}
      ${count('Dépenses', expensesInSeason().length)}
      ${count('Compétitions', competitionsInSeason().length)}
    </div>
  `;
  bindCommon(el);
}

function check(label, value, ok) {
  return `<div class="row">
    <span class="dot ${ok ? 'bg-green' : 'bg-orange'}"></span>
    <div class="row-main">${label}</div>
    <div class="row-value">${value}</div>
  </div>`;
}

function count(label, n) {
  return `<div class="row"><div class="row-main">${label}</div><div class="row-value">${n}</div></div>`;
}
