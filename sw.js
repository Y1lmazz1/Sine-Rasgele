const CACHE_NAME = 'sine-rasgele-v8';
// Sadece ana dosyaları ekle, dış bağlantıları (CDN) şimdilik çıkar
const ASSETS = [
  '/',
  '/index.html',
  '/stats.html',
  '/assets/js/config.js',
  '/assets/js/script.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // addAll yerine tek tek dene ki hangisinin hata verdiğini görebilelim
      return Promise.all(
        ASSETS.map(url => {
          return cache.add(url).catch(err => console.error('Yüklenemeyen dosya:', url));
        })
      );
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});