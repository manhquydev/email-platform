const CACHE_NAME = 'tempmail-pro-v1';
const STATIC_CACHE = 'static-v1';
const API_CACHE = 'api-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/assets/',
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/user/me',
  '/api/inboxes',
  '/api/domains',
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Cache first with network fallback
  cacheFirst: async (request) => {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      console.error('Network request failed:', error);
      return new Response('Offline', { status: 503 });
    }
  },

  // Network first with cache fallback
  networkFirst: async (request) => {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await caches.match(request);
      if (cached) {
        return cached;
      }
      return new Response('Offline', { status: 503 });
    }
  },

  // Stale while revalidate
  staleWhileRevalidate: async (request) => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    const networkFetch = fetch(request).then(async (response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    });

    // Return cached immediately, then update in background
    if (cached) {
      networkFetch.catch(() => {}); // Don't throw on network failure
      return cached;
    }

    return networkFetch;
  },
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('SW: Installing');

  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('SW: Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('SW: Activating');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) =>
            cacheName !== CACHE_NAME &&
            cacheName !== STATIC_CACHE &&
            cacheName !== API_CACHE
          )
          .map((cacheName) => caches.delete(cacheName))
      );
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

  // API requests
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/graphql')) {
    // Cache API responses
    if (API_ENDPOINTS.some(endpoint => url.pathname === endpoint)) {
      event.respondWith(CACHE_STRATEGIES.cacheFirst(request));
    } else {
      // Use stale while revalidate for dynamic content
      event.respondWith(CACHE_STRATEGIES.staleWhileRevalidate(request));
    }
    return;
  }

  // Static assets - cache first
  if (STATIC_ASSETS.some(asset => url.pathname.startsWith(asset))) {
    event.respondWith(CACHE_STRATEGIES.cacheFirst(request));
    return;
  }

  // Images - cache with network fallback
  if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
    event.respondWith(CACHE_STRATEGIES.cacheFirst(request));
    return;
  }

  // Fonts - cache permanently
  if (url.pathname.match(/\.(woff|woff2|ttf|eot)$/i)) {
    event.respondWith(CACHE_STRATEGIES.cacheFirst(request));
    return;
  }

  // Default - network first
  event.respondWith(CACHE_STRATEGIES.networkFirst(request));
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Get pending actions from IndexedDB
  const pendingActions = await getPendingActions();

  for (const action of pendingActions) {
    try {
      // Retry the action
      const response = await fetch(action.url, {
        method: action.method,
        headers: action.headers,
        body: action.body,
      });

      if (response.ok) {
        // Remove from pending actions
        await removePendingAction(action.id);
        console.log('Background sync succeeded for:', action.id);
      }
    } catch (error) {
      console.error('Background sync failed:', error);
      // Keep in pending actions for retry
    }
  }
}

// IndexedDB utilities for offline storage
async function getPendingActions() {
  // Implementation would use IndexedDB to store pending actions
  return [];
}

async function removePendingAction(id: string) {
  // Implementation would remove action from IndexedDB
}

// Push notification handler
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text(),
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'tempmail-notification',
    renotify: true,
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification('TempMail Pro', options)
  );
});

// Message handler for cache management
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'CACHE_UPDATE':
      updateCache(payload.url, payload.data);
      break;

    case 'CACHE_CLEAR':
      clearCache(payload.pattern);
      break;

    case 'CACHE_PREFETCH':
      prefetchResources(payload.urls);
      break;

    default:
      console.log('Unknown message type:', type);
  }
});

async function updateCache(url, data) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
    await cache.put(new Request(url), response);
    console.log('Cache updated for:', url);
  } catch (error) {
    console.error('Cache update failed:', error);
  }
}

async function clearCache(pattern) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    const matchingKeys = keys.filter(key =>
      key.url.includes(pattern) || key.url.match(new RegExp(pattern, 'i'))
    );

    await Promise.all(matchingKeys.map(key => cache.delete(key)));
    console.log('Cleared ${matchingKeys.length} cache entries matching: ${pattern}');
  } catch (error) {
    console.error('Cache clear failed:', error);
  }
}

async function prefetchResources(urls) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(
      urls.map(url =>
        fetch(url).then(response => {
          if (response.ok) {
            cache.put(url, response);
          }
        }).catch(error => {
          console.warn('Prefetch failed for: ${url}', error);
        })
      )
    );
    console.log('Prefetched resources:', urls);
  } catch (error) {
    console.error('Prefetch failed:', error);
  }
}
