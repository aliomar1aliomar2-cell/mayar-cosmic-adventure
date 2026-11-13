/* Mayar's Adventure — offline cache for the installable web app */
const CACHE = 'mayar-adventure-v2';
const ASSETS = [
  "index.html",
  "game.js",
  "manifest.webmanifest",
  "appicon-192.png",
  "appicon-512.png",
  "apple-touch-icon.png",
  "heart.png",
  "portrait.png",
  "coin.png",
  "star.png",
  "btnCircle.png",
  "hudHearts.png",
  "crawler.png",
  "robot.png",
  "ship.png",
  "rocket.png",
  "spacebg.jpg",
  "island0.png",
  "island1.png",
  "island2.png",
  "island3.png",
  "island4.png",
  "island5.png",
  "island6.png",
  "island7.png",
  "island8.png",
  "island9.png",
  "island10.png",
  "mayar_idle.png",
  "mayar_run1.png",
  "mayar_run2.png",
  "mayar_run3.png",
  "mayar_run4.png",
  "mayar_run5.png",
  "mayar_jumpRise.png",
  "mayar_jumpPeak.png",
  "mayar_jumpFall.png",
  "mayar_land1.png",
  "mayar_land2.png"
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
