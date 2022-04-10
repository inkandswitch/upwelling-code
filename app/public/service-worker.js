// Names of the two caches used in this version of the service worker.
// Change to v2, etc. when you update any of the local resources, which will
// in turn trigger the install event again.
const RUNTIME = 'runtime';
const PRECACHE = 'upwelling-cache';
const PRECACHE_URLS = [
	'/',
	'icons/icon-72x72.png',
	'icons/icon-96x96.png',
	'icons/icon-128x128.png',
	'icons/icon-144x144.png',
	'icons/icon-152x152.png',
	'icons/icon-192x192.png',
	'icons/icon-384x384.png',
	'icons/icon-512x512.png',
	'launch-screens/launch-screen-2048x2732.png',
	'launch-screens/launch-screen-2732x2048.png',
	'launch-screens/launch-screen-1668x2388.png',
	'launch-screens/launch-screen-2388x1668.png',
	'launch-screens/launch-screen-1668x2224.png',
	'launch-screens/launch-screen-2224x1668.png',
	'launch-screens/launch-screen-1536x2048.png',
	'launch-screens/launch-screen-2048x1536.png',
	'launch-screens/launch-screen-1536x2048.png',
	'launch-screens/launch-screen-2048x1536.png',
	'launch-screens/launch-screen-1242x2688.png',
	'launch-screens/launch-screen-2688x1242.png',
	'launch-screens/launch-screen-1125x2436.png',
	'launch-screens/launch-screen-2436x1125.png',
	'launch-screens/launch-screen-828x1792.png',
	'launch-screens/launch-screen-1792x828.png',
	'launch-screens/launch-screen-1125x2436.png',
	'launch-screens/launch-screen-2436x1125.png',
	'launch-screens/launch-screen-1242x2208.png',
	'launch-screens/launch-screen-2208x1242.png',
	'launch-screens/launch-screen-750x1334.png',
	'launch-screens/launch-screen-1334x750.png',
	'launch-screens/launch-screen-1242x2208.png',
	'launch-screens/launch-screen-2208x1242.png',
	'launch-screens/launch-screen-750x1334.png',
	'launch-screens/launch-screen-1334x750.png',
	'launch-screens/launch-screen-1242x2208.png',
	'launch-screens/launch-screen-2208x1242.png',
	'launch-screens/launch-screen-750x1334.png',
	'launch-screens/launch-screen-1334x750.png',
	'launch-screens/launch-screen-640x1136.png',
	'launch-screens/launch-screen-1136x640.png',
	'favicons/apple-touch-icon-57x57.png',
	'favicons/apple-touch-icon-60x60.png',
	'favicons/apple-touch-icon-72x72.png',
	'favicons/apple-touch-icon-76x76.png',
	'favicons/apple-touch-icon-114x114.png',
	'favicons/apple-touch-icon-120x120.png',
	'favicons/apple-touch-icon-144x144.png',
	'favicons/apple-touch-icon-152x152.png',
	'favicons/favicon-16x16.png',
	'favicons/favicon-32x32.png',
	'favicons/favicon-96x96.png',
	'favicons/favicon-128x128.png',
	'favicons/favicon-196x196.png',
	'favicons/ms-tile-70x70.png',
	'favicons/ms-tile-144x144.png',
	'favicons/ms-tile-150x150.png',
	'favicons/ms-tile-310x150.png',
	'favicons/ms-tile-310x310.png',
	'favicons/favicon.ico'
];

// A handler takes care of precaching the resources we always need.
self.addEventListener('install', event => {
	event.waitUntil(
		caches.open(PRECACHE)
			.then(cache => cache.addAll(PRECACHE_URLS))
			.then(self.skipWaiting())
	);
});

// The activate handler takes care of cleaning up old caches.
self.addEventListener('activate', event => {
	const currentCaches = [PRECACHE, RUNTIME];
	event.waitUntil(
		caches.keys().then(cacheNames => {
			return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
		}).then(cachesToDelete => {
			return Promise.all(cachesToDelete.map(cacheToDelete => {
				return caches.delete(cacheToDelete);
			}));
		}).then(() => self.clients.claim())
	);
});

// The fetch handler serves responses for same-origin resources from a cache.
// If no response is found, it populates the runtime cache with the response
// from the network before returning it to the page.
self.addEventListener('fetch', event => {
	// Skip cross-origin requests, like those for Google Analytics.
	if (event.request.url.startsWith(self.location.origin)) {
		event.respondWith(
			caches.match(event.request).then(cachedResponse => {
				if (cachedResponse) {
					return cachedResponse;
				}

				return caches.open(RUNTIME).then(cache => {
					return fetch(event.request).then(response => {
						// Put a copy of the response in the runtime cache.
						return cache.put(event.request, response.clone()).then(() => {
							return response;
						});
					});
				});
			})
		);
	}
});