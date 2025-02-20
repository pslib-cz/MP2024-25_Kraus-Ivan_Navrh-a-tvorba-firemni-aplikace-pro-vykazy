const CACHE_NAME = 'vykazovnik-cache-v90';
const PRECACHE_URLS = ['/', '/offline.html', '/manifest.json', '/favicon.ico', '/robots.txt'];

self.addEventListener('install', (event) => {
    console.log('[Service Worker] Instalace nové verze...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_URLS);
        }),
    );
});

self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Aktivace nové verze...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            console.log('[Service Worker] Existující cache:', cacheNames);
            return Promise.all(
                cacheNames.map((oldCache) => {
                    if (oldCache !== CACHE_NAME) {
                        console.log(`[Service Worker] Mažu starou cache: ${oldCache}`);
                        return caches.delete(oldCache);
                    }
                    console.log(`[Service Worker] Ponechávám aktuální cache: ${oldCache}`);
                    return Promise.resolve();
                }),
            );
        }),
    );
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return;
    }

    const pathname = url.pathname;

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() => {
                console.log('[Service Worker] Uživatel je offline, vracím offline.html');
                return caches.match('/offline.html');
            }),
        );
        return;
    }

    if (request.method !== 'GET') {
        event.respondWith(fetch(request));
        return;
    }

    const skipCachePaths = ['/reports', '/users', '/auth', '/clients', '/tasks', '/exports', '/csrf'];
    if (skipCachePaths.some((apiPath) => pathname.startsWith(apiPath))) {
        event.respondWith(fetch(request));
        return;
    }

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(request)
                .then((response) => {
                    if (!response || !response.ok) {
                        return response;
                    }
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, response.clone());
                        return response;
                    });
                })
                .catch(() => {
                    console.log('[Service Worker] Uživatel je offline, žádný obsah není k dispozici.');
                    return new Response('Jste offline.', { status: 503 });
                });
        }),
    );
});
