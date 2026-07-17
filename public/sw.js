// MarketAtlas service worker.
// Strategy:
//  - Precache a tiny app shell (offline page + icons) at install.
//  - Navigations: network-first, falling back to the cached page, then /offline.html.
//  - Same-origin static assets (js/css/fonts/images under /_build, /assets, /icons):
//    stale-while-revalidate.
//  - Everything else (server functions, API calls, cross-origin data providers):
//    network-only, untouched — prices must always be live, never served stale.

const VERSION = "marketatlas-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const SHELL_ASSETS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("marketatlas-") && key !== SHELL_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

/** Never intercept: live market data, server functions, non-GET, cross-origin API providers. */
function isLiveDataRequest(url, request) {
  if (request.method !== "GET") return true;
  if (url.origin !== self.location.origin) return true; // Yahoo/Frankfurter/metals.dev/etc.
  if (url.pathname.startsWith("/api/")) return true;
  if (url.pathname.startsWith("/_serverFn") || url.pathname.includes("createServerFn")) return true;
  if (url.search.includes("_serverFn")) return true;
  return false;
}

function isStaticAsset(url) {
  return (
    /\.(?:js|css|woff2?|ttf|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname) ||
    url.pathname.startsWith("/_build/") ||
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/icons/")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (isLiveDataRequest(url, request)) {
    return; // let the browser handle it normally — always fresh
  }

  // Navigations: network-first with offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || (await caches.match("/offline.html"));
        }),
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response && response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      }),
    );
  }
});
