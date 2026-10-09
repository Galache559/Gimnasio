'use strict';

const CACHE_NAME = 'mi-gimnasio-pro-v10-8-offline-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest'
];

// Guarda la estructura principal de la aplicación. El service worker solo funciona
// si la web está publicada en HTTPS (por ejemplo, GitHub Pages) o en localhost.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(APP_SHELL).catch(() => cache.add('./'))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Para la navegación, sirve la versión guardada si no hay conexión.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy)).catch(() => {});
        return response;
      }).catch(() =>
        caches.match(request).then(hit => hit || caches.match('./index.html') || caches.match('./'))
      )
    );
    return;
  }

  // La app está en caché primero. Las imágenes/GIF externos se guardan cuando se ven
  // conectados, para que los ya consultados puedan seguir apareciendo sin Internet.
  const isExternalMedia = url.origin !== self.location.origin &&
    /\.(gif|png|jpe?g|webp|svg)(\?.*)?$/i.test(url.href);

  if (url.origin === self.location.origin || isExternalMedia) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response && (response.ok || response.type === 'opaque')) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
          }
          return response;
        });
      })
    );
  }
});
