const VERSION = "v16"; // mude a cada release
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
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(FILES_TO_CACHE);
  })());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 1) Navegação (HTML): NETWORK FIRST (pra sempre puxar versão nova)
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        // bypass no cache HTTP do navegador
        return await fetch(req, { cache: "no-store" });
      } catch (e) {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match("./index.html")) || Response.error();
      }
    })());
    return;
  }

  // 2) Arquivos do seu domínio: STALE-WHILE-REVALIDATE (cache rápido + atualiza)
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);

      const fetchPromise = fetch(req)
        .then((res) => {
          // só salva respostas válidas
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })());
  }
});
