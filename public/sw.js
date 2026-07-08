const CACHE_VERSION = "reparahub-2.9.5-pwa-v1"
const STATIC_CACHE = `${CACHE_VERSION}-static`
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`
const OFFLINE_FALLBACK_URL = "/offline"

const PRECACHE_ASSETS = [
  OFFLINE_FALLBACK_URL,
  "/manifest.webmanifest",
  "/logo.webp",
  "/icon.webp",
  "/pwa-icon-192.png",
  "/pwa-icon-512.png",
  "/apple-touch-icon.png",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_ASSETS)),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(
      keys
        .filter((key) => key.startsWith("reparahub-") && key !== STATIC_CACHE && key !== RUNTIME_CACHE)
        .map((key) => caches.delete(key)),
    )

    if ("navigationPreload" in self.registration) {
      await self.registration.navigationPreload.enable()
    }

    await self.clients.claim()
  })())
})

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    void self.skipWaiting()
  }
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith("/api/")) return

  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(event))
    return
  }

  if (!isCacheableStaticAsset(url.pathname)) return

  event.respondWith(handleStaticAssetRequest(request))
})

async function handleNavigationRequest(event) {
  try {
    const preloadResponse = await event.preloadResponse
    if (preloadResponse) return preloadResponse
    return await fetch(event.request)
  } catch {
    const cache = await caches.open(STATIC_CACHE)
    const offlineResponse = await cache.match(OFFLINE_FALLBACK_URL)
    return offlineResponse || Response.error()
  }
}

async function handleStaticAssetRequest(request) {
  const cached = await caches.match(request)
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        const clone = response.clone()
        void caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone))
      }
      return response
    })
    .catch(() => null)

  if (cached) {
    void fetchPromise
    return cached
  }

  const networkResponse = await fetchPromise
  return networkResponse || Response.error()
}

function isCacheableStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/fonts/") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".json") ||
    pathname.endsWith(".webmanifest")
  )
}
