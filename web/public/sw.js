// Pixel Purse service worker: lets the app open without a connection.
// Pages: network first, falling back to the last cached copy.
// Built files (/_next/static, icons, fonts): cache first, they never change once built.
// Never cached: API routes and Supabase (data is synced by the app itself).
const CACHE = "pixel-purse-v1";
const SHELL = ["/", "/start", "/expenses", "/records", "/settings", "/level"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => undefined)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// The page sends the files it already loaded, so they're cached from the first visit.
self.addEventListener("message", (event) => {
  if (event.data?.type !== "precache" || !Array.isArray(event.data.urls)) return;
  const same = event.data.urls.filter((u) => typeof u === "string" && new URL(u).origin === self.location.origin);
  event.waitUntil(caches.open(CACHE).then((c) => Promise.all(same.map((u) => c.add(u).catch(() => undefined)))));
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  const immutable = url.pathname.startsWith("/_next/static/") || /^\/(icon|apple-icon)/.test(url.pathname);
  if (immutable) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
            return res;
          }),
      ),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("/"))),
    );
  }
});
