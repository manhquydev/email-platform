// Service Worker for TempMail Pro
const CACHE_NAME = 'tempmail-pro-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Critical assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/app',
  '/login',
  '/register',
  '/offline',
  '/manifest.json',
  '/fonts/inter-var.woff2',
  '/images/logo.svg',
  '/images/tempmail-hero.webp',
  '/styles/landing-optimized.css'
];

// API endpoints to cache
const CACHEABLE_API_PATTERNS = [
  /^\/api\/domains$/,
  /^\/api\/inboxes$/,
  /^\/health$/,
  /^\/public\/inboxes$/
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache when possible
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip external requests
  if (url.origin !== location.origin) return;

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  if (STATIC_ASSETS.some(asset => url.pathname === asset || url.pathname.endsWith(asset.split('/').pop()))) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Handle page requests
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(handlePageRequest(request));
    return;
  }
});

// Handle API requests with caching strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);

  // Check if this is a cacheable API endpoint
  const isCacheable = CACHEABLE_API_PATTERNS.some(pattern => pattern.test(url.pathname));

  if (!isCacheable) {
    return fetch(request);
  }

  try {
    // Try network first
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      // Cache successful responses
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Fallback to cache if network fails
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline fallback for specific endpoints
    if (url.pathname === '/api/domains') {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/api/inboxes') {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    throw error;
  }
}

// Handle static asset requests
async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Return cached version immediately
    return cachedResponse;
  }

  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Return offline page for HTML requests
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match('/offline');
    }
    throw error;
  }
}

// Handle page requests
async function handlePageRequest(request) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fallback to cached home page
    return caches.match('/') || caches.match('/offline');
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Perform background sync
async function doBackgroundSync() {
  // Get all pending actions from IndexedDB
  const pendingActions = await getPendingActions();

  for (const action of pendingActions) {
    try {
      await fetch(action.url, {
        method: action.method,
        headers: action.headers,
        body: action.body
      });

      // Remove successful action from IndexedDB
      await removePendingAction(action.id);
    } catch (error) {
      console.error('Background sync failed for action:', action, error);
    }
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const options = {
    body: event.data.text(),
    icon: '/images/logo-192.png',
    badge: '/images/badge-72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Email',
        icon: '/images/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/images/xmark.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('TempMail Pro', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    // Open the app to relevant page
    event.waitUntil(
      clients.openWindow('/app')
    );
  }
});

// Periodic background sync for cache updates
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'cache-update') {
    event.waitUntil(updateCache());
  }
});

// Update cached content
async function updateCache() {
  const cache = await caches.open(STATIC_CACHE);

  // Check for updates to static assets
  for (const asset of STATIC_ASSETS) {
    try {
      const response = await fetch(asset);
      if (response.ok) {
        await cache.put(asset, response);
      }
    } catch (error) {
      console.warn(`Failed to update ${asset}:`, error);
    }
  }
}

// IndexedDB helpers for offline actions
async function getPendingActions() {
  // This would integrate with your IndexedDB setup
  // For now, return empty array
  return [];
}

async function removePendingAction(id) {
  // This would integrate with your IndexedDB setup
  console.log('Removing pending action:', id);
}

// Performance monitoring
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PERFORMANCE_METRICS') {
    // Store performance metrics in IndexedDB for later analysis
    storePerformanceMetrics(event.data.metrics);
  }
});

async function storePerformanceMetrics(metrics) {
  // Store metrics in IndexedDB
  console.log('Storing performance metrics:', metrics);
}

// Cache cleanup on storage quota exceeded
self.addEventListener('quotaexceeded', (event) => {
  console.warn('Storage quota exceeded, cleaning up old cache entries');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE) {
              return caches.delete(cacheName);
            }
          })
        );
      })
  );
});