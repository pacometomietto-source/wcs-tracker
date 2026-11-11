/*
 * app.js — point de départ de l'app.
 * Il charge les données, puis affiche l'écran correspondant à l'adresse
 * (ex. "#/reglages" → écran Réglages).
 */
import { loadAll } from './store.js';
import { esc } from './ui.js';
import * as dashboard from './views/dashboard.js';
import * as eventsList from './views/events-list.js';
import * as competitions from './views/competitions.js';
import * as settings from './views/settings.js';

// Table des écrans : adresse → fichier de l'écran + onglet à surligner
const routes = [
  { pattern: /^\/$/, view: dashboard, tab: 'home' },
  { pattern: /^\/evenements$/, view: eventsList, tab: 'events' },
  { pattern: /^\/competitions$/, view: competitions, tab: 'comps' },
  { pattern: /^\/reglages$/, view: settings, tab: 'settings' },
];

const viewEl = document.getElementById('view');
let lastPath = null;

async function render() {
  const path = location.hash.replace(/^#/, '') || '/';
  const route = routes.find((r) => r.pattern.test(path)) || routes[0];
  const params = (path.match(route.pattern) || []).slice(1);

  document.querySelectorAll('.tabbar a').forEach((a) => {
    a.classList.toggle('active', a.dataset.tab === route.tab);
  });

  // Nouvel écran → on remonte en haut ; simple rafraîchissement → on garde la position.
  const scroll = path === lastPath ? window.scrollY : 0;
  lastPath = path;

  try {
    await route.view.render(viewEl, ...params);
  } catch (err) {
    console.error(err);
    viewEl.innerHTML = `<div class="error-box">Oups, une erreur est survenue :\n${esc(err.message)}</div>`;
  }
  window.scrollTo(0, scroll);
}

async function start() {
  try {
    await loadAll();
  } catch (err) {
    console.error(err);
    viewEl.innerHTML = `<div class="error-box">Impossible d'ouvrir la base de données :\n${esc(err.message)}</div>`;
    return;
  }

  window.addEventListener('hashchange', render);
  window.addEventListener('app:render', render);
  window.addEventListener('online', render);
  window.addEventListener('offline', render);
  await render();

  // Active le mode hors ligne
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('Service worker :', err));
  }
  // Demande à l'iPhone de ne jamais effacer les données de l'app
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }
}

start();
