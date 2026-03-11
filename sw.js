const CACHE = 'tapper-v11';

const PRECACHE = [
    './index.html',
    './schedule.json',
    './manifest.json',
    './icon.png',
    'https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;1,9..144,300&family=DM+Sans:wght@300;400;500&display=swap'
];

// Install - cache core files but do NOT skipWaiting
// New SW waits in background until user taps "Update"
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE)
            .then(cache => cache.addAll(['./index.html', './schedule.json', './icon.png'])
                .then(() => cache.addAll(PRECACHE).catch(() => {}))
            )
    );
});

// Activate - clean old caches and claim clients
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// Message from page - user tapped Update, now activate new SW
self.addEventListener('message', e => {
    if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

// Fetch - network-first for schedule/fonts, cache-first for app shell
self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;
    const url = new URL(e.request.url);
    const networkFirst = url.pathname.endsWith('schedule.json') || url.hostname.includes('fonts.g');

    if (networkFirst) {
        e.respondWith(
            fetch(e.request)
                .then(res => {
                    if (res && res.status === 200) {
                        const clone = res.clone();
                        caches.open(CACHE).then(c => c.put(e.request, clone));
                    }
                    return res;
                })
                .catch(() => caches.match(e.request))
        );
        return;
    }

    e.respondWith(
        caches.match(e.request).then(cached => {
            if (cached) return cached;
            return fetch(e.request).then(res => {
                if (res && res.status === 200) {
                    const clone = res.clone();
                    caches.open(CACHE).then(c => c.put(e.request, clone));
                }
                return res;
            });
        })
    );
});
