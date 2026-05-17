const CACHE_NAME = 'flashcards-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './basic.json',
  './intermediate.json',
  './advanced.json',
  './manifest.json'
];

// Instalación: cachear todo
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activación: borrar cachés viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: Network First — si hay internet descarga lo nuevo, si no usa caché
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Guardar la respuesta nueva en caché
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
