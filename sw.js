/* Mayar's Adventure — offline cache for the installable web app */
const CACHE = 'mayar-adventure-v1';
const ASSETS = [
  "index.html",
  "game.js",
  "manifest.webmanifest",
  "game/appicon-192.png",
  "game/appicon-512.png",
  "game/apple-touch-icon.png",
  "game/heart.png",
  "game/portrait.png",
  "game/coin.png",
  "game/star.png",
  "game/btnCircle.png",
  "game/hudHearts.png",
  "game/crawler.png",
  "game/robot.png",
  "game/ship.png",
  "game/rocket.png",
  "game/spacebg.jpg",
  "game/island0.png",
  "game/island1.png",
  "game/island2.png",
  "game/island3.png",
  "game/island4.png",
  "game/island5.png",
  "game/island6.png",
  "game/island7.png",
  "game/island8.png",
  "game/island9.png",
  "game/island10.png",
  "game/mayar_idle.png",
  "game/mayar_run1.png",
  "game/mayar_run2.png",
  "game/mayar_run3.png",
  "game/mayar_run4.png",
  "game/mayar_run5.png",
  "game/mayar_jumpRise.png",
  "game/mayar_jumpPeak.png",
  "game/mayar_jumpFall.png",
  "game/mayar_land1.png",
  "game/mayar_land2.png"
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const isDoc = req.mode === 'navigate' || url.pathname.endsWith('index.html') || url.pathname.endsWith('game.js');
  if (isDoc) {
    e.respondWith(fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req).then((r) => r || caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
    return res;
  })));
});
