# Phase 4: Frontend Optimization
**Timeline:** Week 7-8 (31 Jan - 13 Feb 2026)
**Priority:** High
**Impact:** High - improves user experience and reduces bandwidth

## Objectives

1. Implement code splitting and lazy loading
2. Optimize bundle size and dependencies
3. Add service worker for caching
4. Implement virtual scrolling for large lists
5. Optimize images and assets

## Success Metrics

- [ ] Initial bundle size <800KB (from 2.3MB)
- [ ] First Contentful Paint <1.5s on 3G
- [ ] Time to Interactive <3s on 3G
- [ ] Lazy loading reduces initial load by 60%
- [ ] Service worker cache hit ratio >70%

## Implementation Steps

### 4.1 Code Splitting Configuration

**File:** `services/web/src/router/index.tsx`

```typescript
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Suspense } from 'react';
import LoadingSpinner from '../components/UI/LoadingSpinner';

// Lazy load components
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Messages = lazy(() => import('../pages/Messages'));
const MessageDetail = lazy(() => import('../pages/MessageDetail'));
const Settings = lazy(() => import('../pages/Settings'));
const Admin = lazy(() => import('../pages/Admin'));
const Login = lazy(() => import('../pages/Login'));
const Register = lazy(() => import('../pages/Register'));
const NotFound = lazy(() => import('../pages/NotFound'));

// Create router with code splitting
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <Dashboard />
          </Suspense>
        )
      },
      {
        path: 'messages',
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<LoadingSpinner />}>
                <Messages />
              </Suspense>
            )
          },
          {
            path: ':messageId',
            element: (
              <Suspense fallback={<LoadingSpinner />}>
                <MessageDetail />
              </Suspense>
            )
          }
        ]
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <Settings />
          </Suspense>
        ),
        children: [
          {
            path: 'profile',
            lazy: () => import('../pages/Settings/Profile')
          },
          {
            path: 'security',
            lazy: () => import('../pages/Settings/Security')
          },
          {
            path: 'preferences',
            lazy: () => import('../pages/Settings/Preferences')
          }
        ]
      },
      {
        path: 'admin',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <Admin />
          </Suspense>
        ),
        loader: adminLoader
      },
      {
        path: 'login',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <Login />
          </Suspense>
        )
      },
      {
        path: 'register',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <Register />
          </Suspense>
        )
      },
      {
        path: '*',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <NotFound />
          </Suspense>
        )
      }
    ]
  }
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
```

### 4.2 Component Lazy Loading with Preloading

**File:** `services/web/src/components/UI/LazyImage.tsx`

```typescript
import React, { useState, useRef, useEffect } from 'react';
import { loadImage } from '../utils/imageLoader';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function LazyImage({
  src,
  alt,
  className = '',
  placeholder = '/images/placeholder.jpg',
  onLoad,
  onError
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isInView && src && !isLoaded) {
      loadImage(src)
        .then(() => {
          setIsLoaded(true);
          onLoad?.();
        })
        .catch(() => {
          setError(true);
          onError?.();
        });
    }
  }, [isInView, src, isLoaded, onLoad, onError]);

  return (
    <div ref={imgRef} className={`lazy-image ${className}`}>
      <img
        src={isLoaded && !error ? src : placeholder}
        alt={alt}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-70'
        }`}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
```

### 4.3 Virtual Scrolling for Message List

**File:** `services/web/src/components/Messages/VirtualMessageList.tsx`

```typescript
import React, { useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Message } from '../../types';
import MessageItem from './MessageItem';

interface VirtualMessageListProps {
  messages: Message[];
  onSelectMessage: (id: string) => void;
  selectedMessageId?: string;
  height: number;
  itemHeight: number;
}

interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    messages: Message[];
    onSelectMessage: (id: string) => void;
    selectedMessageId?: string;
  };
}

const Row: React.FC<RowProps> = ({ index, style, data }) => {
  const message = data.messages[index];

  return (
    <div style={style}>
      <MessageItem
        message={message}
        isSelected={message.id === data.selectedMessageId}
        onSelect={() => data.onSelectMessage(message.id)}
      />
    </div>
  );
};

export function VirtualMessageList({
  messages,
  onSelectMessage,
  selectedMessageId,
  height,
  itemHeight = 80
}: VirtualMessageListProps) {
  const itemData = useMemo(
    () => ({
      messages,
      onSelectMessage,
      selectedMessageId
    }),
    [messages, onSelectMessage, selectedMessageId]
  );

  const handleScroll = useCallback(
    ({ scrollOffset, scrollDirection }: any) => {
      // Preload more messages if near bottom
      if (scrollDirection === 'forward' && scrollOffset > (messages.length - 10) * itemHeight) {
        // Trigger load more
        console.log('Load more messages...');
      }
    },
    [messages.length, itemHeight]
  );

  return (
    <div className="virtual-message-list">
      <List
        height={height}
        itemCount={messages.length}
        itemSize={itemHeight}
        itemData={itemData}
        onScroll={handleScroll}
        overscanCount={5}
      >
        {Row}
      </List>
    </div>
  );
}
```

### 4.4 Optimized Data Fetching with SWR

**File:** `services/web/src/hooks/useMessages.ts`

```typescript
import useSWR, { SWRConfiguration, mutate } from 'swr';
import { Message } from '../types';
import { apiClient } from '../utils/api';

interface UseMessagesOptions {
  inboxId?: string;
  limit?: number;
  offset?: number;
  query?: string;
  revalidateOnFocus?: boolean;
  dedupingInterval?: number;
}

const fetcher = async (url: string) => {
  const response = await apiClient.get(url);
  return response.data;
};

export function useMessages(options: UseMessagesOptions = {}) {
  const {
    inboxId,
    limit = 50,
    offset = 0,
    query,
    revalidateOnFocus = false,
    dedupingInterval = 5000
  } = options;

  const queryParams = new URLSearchParams({
    ...(inboxId && { inboxId }),
    limit: limit.toString(),
    offset: offset.toString(),
    ...(query && { q: query })
  });

  const { data, error, isLoading, mutate } = useSWR(
    `/api/messages?${queryParams}`,
    fetcher,
    {
      revalidateOnFocus,
      dedupingInterval,
      suspense: false,
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // Never retry on 404
        if (error.status === 404) return;

        // Only retry up to 3 times
        if (retryCount >= 3) return;

        // Retry after 1 second
        setTimeout(() => revalidate({ retryCount: retryCount + 1 }), 1000);
      }
    }
  );

  const messages = data?.messages || [];
  const pagination = data?.pagination;

  // Optimistic updates
  const markAsRead = useCallback(async (messageId: string) => {
    // Update local cache immediately
    mutate(
      `/api/messages?${queryParams}`,
      (current: any) => ({
        ...current,
        messages: current.messages.map((msg: Message) =>
          msg.id === messageId ? { ...msg, readAt: new Date() } : msg
        )
      }),
      false
    );

    try {
      await apiClient.post(`/api/messages/${messageId}/read`);
      // Revalidate to ensure consistency
      mutate(`/api/messages?${queryParams}`);
    } catch (error) {
      // Rollback on error
      mutate(`/api/messages?${queryParams}`);
      throw error;
    }
  }, [queryParams, mutate]);

  const deleteMessage = useCallback(async (messageId: string) => {
    // Remove from local cache immediately
    mutate(
      `/api/messages?${queryParams}`,
      (current: any) => ({
        ...current,
        messages: current.messages.filter((msg: Message) => msg.id !== messageId),
        pagination: {
          ...current.pagination,
          total: current.pagination.total - 1
        }
      }),
      false
    );

    try {
      await apiClient.delete(`/api/messages/${messageId}`);
      // Revalidate to ensure consistency
      mutate(`/api/messages?${queryParams}`);
    } catch (error) {
      // Rollback on error
      mutate(`/api/messages?${queryParams}`);
      throw error;
    }
  }, [queryParams, mutate]);

  return {
    messages,
    pagination,
    isLoading,
    error,
    markAsRead,
    deleteMessage,
    mutate
  };
}

// Hook for infinite scrolling
export function useInfiniteMessages(inboxId?: string) {
  const [pages, setPages] = useState<any[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const nextPage = pages.length;
      const response = await apiClient.get('/api/messages', {
        params: {
          inboxId,
          limit: 50,
          offset: nextPage * 50
        }
      });

      const newPage = response.data;
      setPages(prev => [...prev, newPage]);
      setHasMore(newPage.pagination.hasMore);
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [inboxId, pages.length, hasMore, isLoadingMore]);

  const allMessages = useMemo(() => {
    return pages.flatMap(page => page.messages);
  }, [pages]);

  return {
    messages: allMessages,
    loadMore,
    isLoadingMore,
    hasMore
  };
}
```

### 4.5 Service Worker for Caching

**File:** `services/web/public/sw.js`

```javascript
const CACHE_NAME = 'tempmail-pro-v1';
const STATIC_CACHE = 'tempmail-static-v1';
const API_CACHE = 'tempmail-api-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/js/main.js',
  '/static/css/main.css',
  '/images/logo.png'
];

const API_ROUTES = [
  '/api/messages',
  '/api/inboxes',
  '/api/domains'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== STATIC_CACHE && name !== API_CACHE)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Static assets - Cache First
  if (STATIC_ASSETS.some(asset => url.pathname.includes(asset))) {
    event.respondWith(
      caches.match(request)
        .then(response => {
          return response || fetch(request);
        })
    );
    return;
  }

  // API routes - Network First with Cache fallback
  if (API_ROUTES.some(route => url.pathname.startsWith(route))) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(API_CACHE)
              .then(cache => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache
          return caches.match(request);
        })
    );
    return;
  }

  // Other requests - Network Only
  event.respondWith(fetch(request));
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Handle queued actions when back online
  const queued = await getQueuedActions();
  for (const action of queued) {
    try {
      await fetch(action.url, action.options);
      await removeQueuedAction(action.id);
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New message received',
    icon: '/images/icon-192x192.png',
    badge: '/images/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Message'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('TempMail Pro', options)
  );
});
```

### 4.6 Bundle Optimization

**File:** `services/web/vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    react({
      // Use fast refresh in development
      fastRefresh: process.env.NODE_ENV === 'development'
    }),
    // Visualize bundle
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true
    }),
    // Compress output
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz'
    }),
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br'
    })
  ],
  build: {
    // Optimize chunks
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@headlessui/react', '@heroicons/react'],
          utils: ['date-fns', 'clsx', 'tailwind-merge'],
          charts: ['recharts'],
          editor: ['@monaco-editor/react']
        },
        // Optimize chunk names
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace(/\.\w+$/, '')
            : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        }
      }
    },
    // Enable source maps for debugging
    sourcemap: process.env.NODE_ENV === 'development',
    // Optimize for size
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true
      }
    },
    // Target modern browsers
    target: ['chrome87', 'firefox78', 'safari14', 'edge88'],
    // Optimize CSS
    cssCodeSplit: true,
    // Report compressed size
    reportCompressedSize: true
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'swr',
      '@headlessui/react',
      '@heroicons/react'
    ],
    exclude: ['monaco-editor']
  },
  // Development server optimization
  server: {
    hmr: {
      overlay: false // Disable HMR overlay for better performance
    }
  },
  // Preview server optimization
  preview: {
    port: 4173
  }
});
```

### 4.7 Image and Asset Optimization

**File:** `services/web/src/utils/imageOptimizer.ts`

```typescript
interface ImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
}

export class ImageOptimizer {
  private static readonly DEFAULT_OPTIONS: ImageOptions = {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 80,
    format: 'webp'
  };

  static async optimizeImage(
    file: File,
    options: Partial<ImageOptions> = {}
  ): Promise<Blob> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate dimensions
        const { width, height } = this.calculateDimensions(
          img.width,
          img.height,
          opts.maxWidth!,
          opts.maxHeight!
        );

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to desired format
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          `image/${opts.format}`,
          opts.quality! / 100
        );
      };

      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  private static calculateDimensions(
    width: number,
    height: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    if (width <= maxWidth && height <= maxHeight) {
      return { width, height };
    }

    const aspectRatio = width / height;

    if (width > height) {
      return {
        width: maxWidth,
        height: Math.round(maxWidth / aspectRatio)
      };
    } else {
      return {
        width: Math.round(maxHeight * aspectRatio),
        height: maxHeight
      };
    }
  }

  static generateSrcSet(url: string, sizes: number[] = [320, 640, 960, 1280, 1920]): string {
    return sizes
      .map(size => `${url}?w=${size} ${size}w`)
      .join(', ');
  }

  static generateSizes(breakpoints: { [key: string]: number } = {}): string {
    const defaultBreakpoints = {
      '(max-width: 640px)': '100vw',
      '(max-width: 1024px)': '50vw',
      '(min-width: 1025px)': '33vw'
    };

    const sizes = { ...defaultBreakpoints, ...breakpoints };

    return Object.entries(sizes)
      .map(([condition, size]) => `${condition} ${size}`)
      .join(', ');
  }
}

// Web Component for optimized images
customElements.define('optimized-image', class OptimizedImage extends HTMLElement {
  connectedCallback() {
    const src = this.getAttribute('src');
    const alt = this.getAttribute('alt') || '';
    const width = this.getAttribute('width');
    const height = this.getAttribute('height');

    if (src) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = alt;

      if (width) img.width = parseInt(width);
      if (height) img.height = parseInt(height);

      // Use modern loading
      img.loading = 'lazy';
      img.decoding = 'async';

      // Add error handling
      img.onerror = () => {
        img.src = '/images/placeholder.jpg';
      };

      this.appendChild(img);
    }
  }
});
```

## Testing Requirements

### 1. Performance Tests
```bash
# Run Lighthouse CI
npm run test:lighthouse

# Bundle analysis
npm run build && npx webpack-bundle-analyzer dist/static/js/*.js

# Test Core Web Vitals
npm run test:core-web-vitals
```

### 2. Performance Test Script
**File:** `tests/performance/frontend-load-test.js`

```javascript
const puppeteer = require('puppeteer');

async function measurePageLoad() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Enable performance metrics
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

  const metrics = await page.metrics();
  const performanceTiming = JSON.parse(
    await page.evaluate(() => JSON.stringify(window.performance.timing))
  );

  // Calculate Core Web Vitals
  const navigationStart = performanceTiming.navigationStart;
  const loadEventEnd = performanceTiming.loadEventEnd;
  const domContentLoaded = performanceTiming.domContentLoadedEventEnd;

  const results = {
    // Load time
    loadTime: loadEventEnd - navigationStart,
    domContentLoadedTime: domContentLoaded - navigationStart,

    // Core Web Vitals
    fcp: await measureFCP(page),
    lcp: await measureLCP(page),
    fid: await measureFID(page),
    cls: await measureCLS(page),

    // Resource metrics
    totalResources: metrics.Tasks.length,
    scriptTime: metrics.ScriptDuration,
    layoutTime: metrics.LayoutDuration,

    // Bundle metrics
    bundleSize: await measureBundleSize(page)
  };

  console.log('Frontend Performance Metrics:');
  console.log('Load Time:', `${results.loadTime}ms`);
  console.log('First Contentful Paint:', `${results.fcp}ms`);
  console.log('Largest Contentful Paint:', `${results.lcp}ms`);
  console.log('First Input Delay:', `${results.fid}ms`);
  console.log('Cumulative Layout Shift:', results.cls);
  console.log('Bundle Size:', `${(results.bundleSize / 1024 / 1024).toFixed(2)}MB`);

  await browser.close();
  return results;
}

async function measureFCP(page) {
  const fcp = await page.evaluate(() => {
    return new Promise(resolve => {
      new PerformanceObserver(list => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          resolve(entries[0].startTime);
        }
      }).observe({ entryTypes: ['paint'] });
    });
  });
  return Math.round(fcp);
}

async function measureLCP(page) {
  const lcp = await page.evaluate(() => {
    return new Promise(resolve => {
      new PerformanceObserver(list => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        resolve(lastEntry.startTime);
      }).observe({ entryTypes: ['largest-contentful-paint'] });
    });
  });
  return Math.round(lcp);
}

async function measureFID(page) {
  await page.evaluate(() => {
    return new Promise(resolve => {
      new PerformanceObserver(list => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          resolve(entries[0].processingStart - entries[0].startTime);
        }
      }).observe({ entryTypes: ['first-input'] });
    });
  });
}

async function measureCLS(page) {
  const cls = await page.evaluate(() => {
    return new Promise(resolve => {
      let clsValue = 0;
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        resolve(clsValue);
      }).observe({ entryTypes: ['layout-shift'] });
    });
  });
  return clsValue;
}

async function measureBundleSize(page) {
  const resources = await page.evaluate(() => {
    const entries = performance.getEntriesByType('resource');
    return entries
      .filter(e => e.name.includes('.js') || e.name.includes('.css'))
      .map(e => ({ name: e.name, size: e.transferSize }));
  });

  return resources.reduce((total, r) => total + r.size, 0);
}

measurePageLoad().catch(console.error);
```

## Risk Assessment & Mitigation

### High Risk
- Code splitting causing layout shifts
- Service worker caching stale data
- Bundle optimization breaking features

### Mitigation
- Use proper loading states and skeletons
- Implement cache versioning
- Test thoroughly after optimization
- Use feature flags for gradual rollout

## Rollback Criteria

Phase must be rolled back if:
- Core Web Vitals degrade significantly
- User complaints about broken features
- Bundle size increases instead of decreases
- Service worker causes offline issues

## Success Verification

```javascript
// Monitor bundle size
const bundleAnalyzer = require('webpack-bundle-analyzer');
const stats = require('./dist/stats.json');

bundleAnalyzer.generateReport(stats, {
  mode: 'static',
  open: true,
  reportFilename: 'bundle-report.html'
});

// Check service worker registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    console.log('Service Workers:', registrations.length);
  });
}

// Performance monitoring
const observer = new PerformanceObserver(list => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'measure') {
      console.log(`${entry.name}: ${entry.duration}ms`);
    }
  }
});
observer.observe({ entryTypes: ['measure'] });
```

---

**Next:** Proceed to Phase 5 - Monitoring & Tuning