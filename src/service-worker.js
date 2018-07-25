var cacheStorageKey = 'rc-embeddbale-voice-pwa';

var cacheList = [
  'app.html',
  'app.js',
  '0.js',
  '1.js',
  '2.js',
  '3.js',
  '4.js',
  '5.js',
  '6.js',
  '7.js',
  '8.js',
  '9.js',
  '10.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(cacheStorageKey)
    .then(cache => cache.addAll(cacheList))
    .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(cacheNames.map(function (name) {
        if (name !== cacheStorageKey) {
          return caches.delete(name);
        }
      }));
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') {
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function (response) {
      if (response) {
        return response;
      }
      const cloneRequest = e.request.clone();
      return fetch(cloneRequest);
    })
  );
});
