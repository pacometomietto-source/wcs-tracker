/*
 * Service worker : garde une copie des fichiers de l'app sur l'iPhone
 * pour qu'elle fonctionne sans réseau.
 *
 * Stratégie « réseau d'abord » :
 *  - en ligne  → on télécharge la dernière version (et on met la copie à jour) ;
 *  - hors ligne (ou réseau trop lent) → on utilise la copie enregistrée.
 * Résultat : tes mises à jour publiées sur GitHub arrivent toutes seules,
 * sans avoir à changer de numéro de version.
 *
 * Quand tu ajoutes un nouveau fichier à l'app, ajoute-le à APP_FILES.
 */
const CACHE_NAME = 'wcs-tracker-v1';
const NETWORK_TIMEOUT_MS = 4000;

const APP_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/db.js',
  './js/store.js',
  './js/format.js',
  './js/labels.js',
  './js/ui.js',
  './js/sample-data.js',
  './js/views/dashboard.js',
  './js/views/events-list.js',
  './js/views/event-detail.js',
  './js/views/event-form.js',
  './js/views/expense-form.js',
  './js/views/competitions.js',
  './js/views/settings.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// 1. Installation : on enregistre tous les fichiers de l'app.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

// 2. Activation : on supprime les anciennes copies.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('wcs-tracker-') && k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// 3. Chaque fois que l'app demande un fichier.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return; // sites externes : on ne touche pas
  event.respondWith(networkFirst(request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await withTimeout(fetch(request.url, { cache: 'no-cache' }), NETWORK_TIMEOUT_MS);
    if (response.ok) cache.put(request.url, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request.url, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const page = await cache.match('./index.html');
      if (page) return page;
    }
    return Response.error();
  }
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); }
    );
  });
}
