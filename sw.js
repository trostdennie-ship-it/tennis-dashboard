/* =================================================================
   Service Worker  ·  macht „Aufschlag" offline-fähig & installierbar
   -----------------------------------------------------------------
   Strategie:
   • App-Dateien (HTML/CSS/JS/Icons): beim ersten Besuch in den Cache.
     Danach „stale-while-revalidate" – sofort aus dem Cache anzeigen,
     im Hintergrund aktualisieren.
   • Schriften (Google Fonts): cache-first, damit sie auch offline da sind.
   • API-Aufrufe (Live-Daten): NICHT vom Service Worker gecacht – darum
     kümmert sich die App selbst (localStorage). Bei Offline fällt sie
     automatisch auf gespeicherte/Demo-Daten zurück.

   ▸ Wenn du Dateien änderst: erhöhe CACHE_VERSION, damit alte Caches
     verworfen werden.
   ================================================================= */
const CACHE_VERSION = 'aufschlag-v7';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './config.js',
  './css/styles.css',
  './js/data.js',
  './js/icons.js',
  './js/api.js',
  './js/live.js',
  './js/app.js',
  './data/rankings-atp.json',
  './data/rankings-wta.json',
  './icons/favicon.svg',
  './icons/favicon-32.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
];

// ── Installation: Kern-Dateien einzeln cachen (robust) ───────────
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    // Einzeln, damit eine fehlende Datei die Installation nicht killt.
    await Promise.allSettled(CORE.map((url) => cache.add(url)));
    self.skipWaiting();
  })());
});

// ── Aktivierung: alte Caches aufräumen ───────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  const sameOrigin = url.origin === self.location.origin;
  const isFont = FONT_HOSTS.includes(url.hostname);

  // Fremde Hosts außer Schriften (z. B. die Tennis-API) nicht anfassen.
  if (!sameOrigin && !isFont) return;

  // Navigation (Seitenaufruf): erst Netz, dann Cache (offline-tauglich).
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_VERSION);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch (e) {
        return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }

  // Tagesdaten (Rangliste): immer zuerst frisch aus dem Netz, Cache nur als
  // Offline-Reserve – so sieht man möglichst aktuelle Werte.
  if (sameOrigin && url.pathname.includes('/data/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        if (fresh && fresh.status === 200) cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        return (await cache.match(req)) || Response.error();
      }
    })());
    return;
  }

  // Sonst: stale-while-revalidate (Cache sofort, Update im Hintergrund).
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(req);
    const network = fetch(req).then((res) => {
      if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors' || res.type === 'opaque')) {
        cache.put(req, res.clone());
      }
      return res;
    }).catch(() => null);
    return cached || (await network) || Response.error();
  })());
});
