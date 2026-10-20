const CACHE_NAME = 'mi-gimnasio-pro-v10-11-6-email-destinatario-base-personalizable';

const APP_FILES = [
  './',
  './index.html',
  './manifest.webmanifest?v=10-11-6',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith('mi-gimnasio-pro-v10-11-6-email-destinatario') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // HTML: red primero para recibir la versión publicada; caché como respaldo sin conexión.
  const isHTML = event.request.mode === 'navigate' ||
                 url.pathname.endsWith('/index.html') ||
                 url.pathname.endsWith('/');

  if (isHTML) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(cached =>
          cached || caches.match('./index.html')
        ))
    );
    return;
  }

  // Los demás recursos se sirven desde la caché y se descargan si aún no están guardados.
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
