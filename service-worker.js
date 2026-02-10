self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open('flow-reader-v1').then(cache => {
      return cache.addAll([
        '/flow-reader/',
        '/flow-reader/index.html',
        '/flow-reader/manifest.webmanifest',
      ]);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
