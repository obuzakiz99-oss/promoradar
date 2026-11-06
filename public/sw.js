/* PromoRadar service worker: pages network-first (always fresh promos, cached copy when offline),
   build assets (_next/static, icons) cache-first — they never change under the same name. */
const CACHE = "pr-v1";
const SCOPE = self.registration.scope; // …/promoradar/

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || !req.url.startsWith(SCOPE)) return;   // other sites (exchanges, logos) — straight to network
  const url = new URL(req.url);
  if (url.pathname.includes("/_next/static/") || /\.(png|svg|woff2?|ico)$/.test(url.pathname)) {
    e.respondWith(caches.open(CACHE).then(async (c) => (await c.match(req)) || fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; })));
    return;
  }
  if (req.mode === "navigate" || url.pathname.endsWith(".json") || url.pathname.endsWith(".txt")) {
    e.respondWith(fetch(req).then((r) => { if (r.ok) caches.open(CACHE).then((c) => c.put(req, r.clone())); return r; }).catch(async () => (await caches.match(req)) || Response.error()));
  }
});
