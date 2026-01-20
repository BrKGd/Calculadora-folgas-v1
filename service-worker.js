const CACHE_NAME = "escala-folgas-v10";
const BASE_PATH = "/Calculadora-folgas-v10/";

const FILES_TO_CACHE = [
  BASE_PATH,
  BASE_PATH + "index.html",
  BASE_PATH + "style.css",
  BASE_PATH + "script.js",
  BASE_PATH + "manifest.json",
  BASE_PATH + "icons/icon-192.png",
  BASE_PATH + "icons/icon-512.png"
];

// INSTALAÇÃO
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// ATIVAÇÃO (limpa cache antigo)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// FETCH (offline first)
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
