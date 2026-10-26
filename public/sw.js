// Mini Saha offline support. The page is fetched network-first so updates
// arrive immediately; content-hashed assets are immutable and served from the cache.
const CACHE = 'minisaha-v1';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];

// The first visit is not controlled yet, so the page's scripts are cached here too.
async function precache() {
  const cache = await caches.open(CACHE);
  await cache.addAll(CORE);
  const html = await (await cache.match('index.html')).text();
  const assets = [...new Set([...html.matchAll(/assets\/[^"'<>\s)]+\.(?:js|jpg)/g)].map(m => m[0]))];
  for (const asset of assets) if (!(await cache.match(asset))) await cache.add(asset).catch(() => {});
}
self.addEventListener('install', event => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith('minisaha-') && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

// Drop cached assets the new page no longer references (old hashed rosters/voices).
async function pruneAssets(html) {
  const wanted = new Set([...html.matchAll(/assets\/[^"'<>\s)]+/g)].map(m => new URL(m[0], self.registration.scope).href));
  const cache = await caches.open(CACHE);
  for (const request of await cache.keys()) {
    if (request.url.includes('/assets/') && !wanted.has(request.url)) await cache.delete(request);
  }
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
      if ((response.headers.get('content-type') || '').includes('text/html')) response.clone().text().then(pruneAssets).catch(() => {});
    }
    return response;
  } catch (error) {
    return (await cache.match(request)) || (await cache.match('index.html')) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  // Online matches, speech and other origins always go to the network.
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/online/')) return;
  // Only content-hashed files are immutable; everything else is revalidated.
  event.respondWith(/\/assets\/[^/]+-[0-9a-f]{10}\.js$/.test(url.pathname) ? cacheFirst(request) : networkFirst(request));
});
