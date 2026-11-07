// BirdQuest service worker: lets the app open offline and load fast. Hand-written, no libraries.
// - App shell and built assets (same origin): cache as they are used, serve from cache first.
// - Published data JSON (same origin /data/): network first, fall back to the last copy when offline.
// - Everything from other sites (eBird links, map tiles, routing) is left alone: never cached here.
const VERSION = 'bq-v1'
const SHELL = VERSION + '-shell'
const DATA = VERSION + '-data'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (url.pathname.includes('/data/')) {
    event.respondWith(networkFirst(req, DATA))
    return
  }
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, SHELL))
    return
  }
  event.respondWith(cacheFirst(req, SHELL))
})

async function networkFirst(req, name) {
  const cache = await caches.open(name)
  try {
    const res = await fetch(req)
    if (res.ok) cache.put(req, res.clone())
    return res
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: false })
    if (hit) return hit
    throw err
  }
}

async function cacheFirst(req, name) {
  const cache = await caches.open(name)
  const hit = await cache.match(req)
  if (hit) {
    // Refresh quietly for next time (built files have hashed names, so this mostly covers icons and the manifest).
    fetch(req).then((res) => res.ok && cache.put(req, res)).catch(() => {})
    return hit
  }
  const res = await fetch(req)
  if (res.ok) cache.put(req, res.clone())
  return res
}
