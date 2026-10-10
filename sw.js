/* =============================================================================
   Service Worker — Belon Teori Muzik AR (PWA)
   - Fail aplikasi (index, manifest, ikon) disimpan semasa pemasangan
   - Pustaka (A-Frame, jsPDF…) dalam folder lib/; MediaPipe & Firebase SDK disimpan selepas kali pertama
     digunakan → permainan boleh dimainkan TANPA INTERNET selepas itu.
   - Tukar VERSION setiap kali anda mengemas kini index.html supaya peranti
     murid menerima versi baharu.
   ============================================================================= */
const VERSION = 'v4.0.1';
const APP_CACHE = 'belon-app-' + VERSION;
const LIB_CACHE = 'belon-lib-v1';            // pustaka luaran (jarang berubah)

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './firebase-config.js',
  './js/core.js', './js/parser.js', './js/engine.js', './js/data.js', './js/report.js', './js/game.js', './js/admin.js',
  './data/soalan-lalai.json',
  './lib/aframe.min.js', './lib/jspdf.umd.min.js', './lib/jspdf.plugin.autotable.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.png'
];
// Pustaka admin (Excel, PDF/DOCX reader, QR) disimpan bila pertama kali digunakan
const PRECACHE_LIBS = [];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const app = await caches.open(APP_CACHE);
    await app.addAll(APP_SHELL);
    const lib = await caches.open(LIB_CACHE);
    await Promise.all(PRECACHE_LIBS.map(async url => {
      try { if (!(await lib.match(url))) await lib.add(new Request(url, { mode: 'cors' })); } catch (e) { /* cuba lagi semasa runtime */ }
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('belon-app-') && k !== APP_CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

const isLib = url =>
  url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'storage.googleapis.com' || url.hostname === 'www.gstatic.com';

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 1) Pustaka luaran: cache-first (fail berversi, tidak berubah)
  if (isLib(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(LIB_CACHE);
      const hit = await cache.match(req, { ignoreVary: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    })());
    return;
  }

  if (url.origin !== self.location.origin) return;

  // 2) firebase-config.js: network-first (supaya tetapan Firebase baharu terus berkuat kuasa)
  if (url.pathname.endsWith('/firebase-config.js')) {
    event.respondWith(fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(APP_CACHE).then(c => c.put(req, copy)); } return res; })
      .catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }

  // 3) Halaman (navigasi): network-first supaya kemas kini cepat sampai, sandaran cache bila luar talian
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(APP_CACHE);
      try {
        const res = await fetch(req);
        if (res.ok) cache.put('./index.html', res.clone());
        return res;
      } catch (e) {
        return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  // 4) Fail statik aplikasi: stale-while-revalidate
  event.respondWith((async () => {
    const cache = await caches.open(APP_CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    return hit || (await net) || Response.error();
  })());
});

self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
