/* eslint-env serviceworker */
/* eslint-disable no-restricted-globals */
// Splitzy Service Worker v1.0.4
// Bump cache version when deploying to ensure old cached bundles are cleared.
const CACHE_NAME = 'splitzy-cache-v5';
const STATIC_CACHE = 'splitzy-static-v5';
const DYNAMIC_CACHE = 'splitzy-dynamic-v5';

// Static assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
  '/favicon.ico'
];

// API paths that should use network-first strategy (NEVER cache stale)
const API_PATHS = ['/api/', '/socket.io/', '/home/', '/auth/', '/groups/', '/friends/', '/notifications/', '/analytics/', '/chat/'];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              // Delete old cache versions
              return name.startsWith('splitzy-') && 
                     name !== STATIC_CACHE && 
                     name !== DYNAMIC_CACHE;
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip WebSocket connections
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }

  // Skip socket.io polling
  if (url.pathname.includes('/socket.io/')) {
    return;
  }

  // API requests - Network only (no caching to prevent stale data issues)
  // Check both pathname and hostname for API subdomain
  const isApiRequest = API_PATHS.some(path => url.pathname.startsWith(path)) ||
                       url.hostname.startsWith('api.');
  if (isApiRequest) {
    event.respondWith(networkFirst(request));
    return;
  }

  // IMPORTANT: Avoid cache-first for JS/CSS to prevent "refresh shows old version"
  // after deploys. Use network-first for documents/styles/scripts.
  if (request.destination === 'document' ||
      request.destination === 'script' ||
      request.destination === 'style') {
    event.respondWith(networkFirstNoCache(request));
    return;
  }

  // Images/fonts can remain cache-first for performance.
  if (request.destination === 'image' || request.destination === 'font') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Default - Stale while revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// Cache First Strategy - For static assets
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first failed:', error);
    // Return offline fallback for navigation requests
    if (request.destination === 'document') {
      return caches.match('/index.html');
    }
    throw error;
  }
}

// Network First Strategy - For API calls (NO caching to prevent stale data)
async function networkFirst(request) {
  try {
    // Always fetch from network for API calls - don't cache API responses
    const networkResponse = await fetch(request, { cache: 'no-store' });
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for API call:', request.url);
    // Return error response for API calls - don't serve stale cached data
    return new Response(
      JSON.stringify({ error: 'You are offline', offline: true }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Network First (NO cache write) - for JS/CSS/HTML to always get latest on refresh
async function networkFirstNoCache(request) {
  try {
    const networkResponse = await fetch(request, { cache: 'no-store' });
    return networkResponse;
  } catch (error) {
    // Fallback to cache for offline navigation
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;
    if (request.destination === 'document') {
      return caches.match('/index.html');
    }
    throw error;
  }
}

// Stale While Revalidate Strategy - For other resources
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);

  // Start fetch in background
  const fetchPromise = fetch(request)
    .then(async (networkResponse) => {
      if (networkResponse.ok) {
        try {
          // Clone IMMEDIATELY before any other operation
          const responseToCache = networkResponse.clone();
          const cache = await caches.open(DYNAMIC_CACHE);
          await cache.put(request, responseToCache);
        } catch (cacheError) {
          console.log('[SW] Cache put failed:', cacheError);
        }
      }
      return networkResponse;
    })
    .catch((error) => {
      console.log('[SW] Stale while revalidate - network failed:', error);
      return cachedResponse;
    });

  // Return cached response immediately if available, otherwise wait for network
  return cachedResponse || fetchPromise;
}

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

// Background sync for offline actions (if supported)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'sync-expenses') {
    event.waitUntil(syncPendingExpenses());
  }
});

// Placeholder for syncing pending expenses
async function syncPendingExpenses() {
  console.log('[SW] Syncing pending expenses...');
  // This will be implemented when we add IndexedDB for offline data
}

// Push notification handling (for future use)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/home'
    },
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Splitzy', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/home';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if open
        for (const client of clientList) {
          if (client.url.includes('splitzy') && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

console.log('[SW] Service worker loaded');

