// Service worker: lets the app open even without internet.
// When you change any app file, change the number in CACHE (v1 -> v2) too.

const CACHE = "rideshare-v4";

const FILES = [
    "./",
    "index.html",
    "style.css",
    "extra.css",
    "script.js",
    "manifest.json",
    "icon-192.png",
    "icon-512.png",
    "icon-maskable-512.png",
    "apple-touch-icon.png"
];

self.addEventListener("install", function (event) {
    event.waitUntil(
        caches.open(CACHE).then(function (cache) {
            return cache.addAll(FILES);
        })
    );
    self.skipWaiting();
});

self.addEventListener("activate", function (event) {
    event.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(
                keys.filter(function (key) { return key !== CACHE; })
                    .map(function (key) { return caches.delete(key); })
            );
        }).then(function () {
            return self.clients.claim();
        })
    );
});

// Try the internet first (so updates show up), use the saved copy if offline
self.addEventListener("fetch", function (event) {
    if (event.request.method !== "GET") {
        return;
    }

    event.respondWith(
        fetch(event.request).then(function (response) {
            if (response && response.status === 200 && response.type === "basic") {
                const copy = response.clone();
                caches.open(CACHE).then(function (cache) {
                    cache.put(event.request, copy);
                });
            }
            return response;
        }).catch(function () {
            return caches.match(event.request).then(function (saved) {
                return saved || caches.match("index.html");
            });
        })
    );
});
