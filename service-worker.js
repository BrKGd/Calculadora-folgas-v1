const VERSION = "v26"; // <-- mude a cada release
const CACHE_NAME = `escala-folgas-${VERSION}`;

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

// comando para aplicar update imediatamente
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

async function networkFirst(req) {
  try {
    const fresh = await fetch(req, { cache: "no-store" });
    const cache = await caches.open(CACHE_NAME);
    cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await caches.match(req);
    return cached || Response.error();
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;

  const fresh = await fetch(req);
  const cache = await caches.open(CACHE_NAME);
  cache.put(req, fresh.clone());
  return fresh;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1) HTML / navegação: sempre rede primeiro (você já fazia isso)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req, { cache: "no-store" }).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // somente arquivos do seu domínio
  if (url.origin !== self.location.origin) return;

  const path = url.pathname.toLowerCase();

  // 2) CSS/JS/JSON: NETWORK FIRST (pega atualização sem precisar limpar histórico)
  if (
    path.endsWith(".css") ||
    path.endsWith(".js") ||
    path.endsWith(".json")
  ) {
    event.respondWith(networkFirst(req));
    return;
  }

  // 3) Imagens e resto: CACHE FIRST (mais rápido)
  event.respondWith(cacheFirst(req));
});
