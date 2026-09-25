import { useState, useEffect, useCallback, useRef } from 'react';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

interface WebVitals {
  FCP: number; // First Contentful Paint
  LCP: number; // Largest Contentful Paint
  FID: number; // First Input Delay
  CLS: number; // Cumulative Layout Shift
  TTFB: number; // Time to First Byte
}

interface PageLoadMetrics {
  domContentLoaded: number;
  loadComplete: number;
  renderTime: number;
  resources: {
    total: number;
    compressed: number;
    cached: number;
  };
}

/**
 * Performance monitoring hook
 * Tracks Core Web Vitals and custom metrics
 */
export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [webVitals, setWebVitals] = useState<WebVitals | null>(null);
  const [pageLoadMetrics, setPageLoadMetrics] = useState<PageLoadMetrics | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Measure page load performance
  useEffect(() => {
    const measurePageLoad = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      if (navigation) {
        const metrics: PageLoadMetrics = {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
          loadComplete: navigation.loadEventEnd - navigation.fetchStart,
          renderTime: navigation.responseEnd - navigation.responseStart,
          resources: {
            total: 0,
            compressed: 0,
            cached: 0,
          },
        };

        // Analyze resource loading
        const resources = performance.getEntriesByType('resource');
        metrics.resources = {
          total: resources.length,
          compressed: resources.filter(r => r.transferSize < r.encodedBodySize).length,
          cached: resources.filter(r => r.transferSize === 0).length,
        };

        setPageLoadMetrics(metrics);
      }
    };

    // Measure after page loads
    if (document.readyState === 'complete') {
      measurePageLoad();
    } else {
      window.addEventListener('load', measurePageLoad);
    }

    // Monitor layout shifts
    const layoutShiftObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          const clsValue = (entry as any).value;
          addMetric('CLS', clsValue, 'score');
        }
      }
    });

    layoutShiftObserver.observe({ type: 'layout-shift', buffered: true });

    // Monitor largest contentful paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        addMetric('LCP', lastEntry.startTime, 'ms');
      }
    });

    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    // Monitor first contentful paint
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        addMetric('FCP', fcpEntry.startTime, 'ms');
      }
    });

    fcpObserver.observe({ type: 'paint', buffered: true });

    return () => {
      layoutShiftObserver.disconnect();
      lcpObserver.disconnect();
      fcpObserver.disconnect();
    };
  }, []);

  // Monitor API response times
  const trackApiResponse = useCallback(async (
    url: string,
    method: string = 'GET'
  ) => {
    const startTime = performance.now();

    try {
      const response = await fetch(url, { method });
      const endTime = performance.now();

      addMetric(`API_${method.toUpperCase()}`, endTime - startTime, 'ms', url);

      return response;
    } catch (error) {
      const endTime = performance.now();
      addMetric(`API_${method.toUpperCase()}_Error`, endTime - startTime, 'ms', url);
      throw error;
    }
  }, [metrics]);

  // Track render performance
  const trackRenderTime = useCallback((componentName: string) => {
    const startTime = performance.now();

    return {
      end: () => {
        const endTime = performance.now();
        addMetric(`Render_${componentName}`, endTime - startTime, 'ms');
      },
    };
  }, []);

  // Track memory usage
  const trackMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      addMetric('Memory_Used', memory.usedJSHeapSize, 'bytes');
      addMetric('Memory_Total', memory.totalJSHeapSize, 'bytes');
      addMetric('Memory_Limit', memory.jsHeapSizeLimit, 'bytes');
    }
  }, []);

  // Track bundle size
  const trackBundleSize = useCallback(() => {
    if (performance.getEntriesByType) {
      const resources = performance.getEntriesByType('resource');
      const bundleResources = resources.filter(r =>
        r.name.includes('.js') || r.name.includes('.css')
      );

      const totalSize = bundleResources.reduce((sum, r) => sum + r.transferSize, 0);
      addMetric('Bundle_Size', totalSize, 'bytes');
    }
  }, []);

  // Add metric to tracking
  const addMetric = useCallback((name: string, value: number, unit: string, context?: string) => {
    const metric: PerformanceMetric = {
      name: context ? `${name}_${context}` : name,
      value,
      unit,
      timestamp: Date.now(),
    };

    setMetrics(prev => [...prev, metric].slice(-100)); // Keep last 100 metrics

    // Log slow operations
    if (unit === 'ms' && value > 100) {
      console.warn(`Slow operation detected: ${name} took ${value}ms`);
    }
  }, []);

  // Calculate Web Vitals
  const calculateWebVitals = useCallback(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    if (!navigation) return;

    const vitals: WebVitals = {
      FCP: metrics.find(m => m.name === 'FCP')?.value || 0,
      LCP: metrics.find(m => m.name === 'LCP')?.value || 0,
      FID: metrics.find(m => m.name === 'FID')?.value || 0,
      CLS: metrics.find(m => m.name === 'CLS')?.value || 0,
      TTFB: navigation.responseStart - navigation.requestStart,
    };

    setWebVitals(vitals);
  }, [metrics]);

  // Get performance score
  const getPerformanceScore = useCallback((): number => {
    if (!webVitals) return 0;

    let score = 100;

    // FCP scoring (fastest is better)
    if (webVitals.FCP > 1800) score -= 25;
    else if (webVitals.FCP > 1000) score -= 15;

    // LCP scoring (fastest is better)
    if (webVitals.LCP > 2500) score -= 25;
    else if (webVitals.LCP > 1800) score -= 15;

    // FID scoring (lower is better)
    if (webVitals.FID > 300) score -= 25;
    else if (webVitals.FID > 100) score -= 15;

    // CLS scoring (lower is better)
    if (webVitals.CLS > 0.25) score -= 25;
    else if (webVitals.CLS > 0.1) score -= 15;

    // TTFB scoring (faster is better)
    if (webVitals.TTFB > 800) score -= 25;
    else if (webVitals.TTFB > 600) score -= 15;

    return Math.max(0, score);
  }, [webVitals]);

  // Get performance report
  const getPerformanceReport = useCallback(() => {
    const now = Date.now();
    const recentMetrics = metrics.filter(m => now - m.timestamp < 60000); // Last minute

    const report = {
      timestamp: now,
      metrics: recentMetrics,
      webVitals,
      pageLoadMetrics,
      score: getPerformanceScore(),
      summary: {
        totalMetrics: recentMetrics.length,
        slowOperations: recentMetrics.filter(m => m.unit === 'ms' && m.value > 100).length,
        memoryUsage: recentMetrics.filter(m => m.name.includes('Memory')),
        apiCalls: recentMetrics.filter(m => m.name.startsWith('API_')),
      },
    };

    return report;
  }, [metrics, webVitals, pageLoadMetrics, getPerformanceScore]);

  // Monitor component mount/unmount
  useEffect(() => {
    const startTimer = performance.now();

    return () => {
      const endTimer = performance.now();
      const componentTime = endTimer - startTimer;
      addMetric('Component_Mount_Time', componentTime, 'ms');
    };
  }, []);

  // Send metrics to analytics
  const sendMetrics = useCallback(async () => {
    const report = getPerformanceReport();

    try {
      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      });
    } catch (error) {
      console.warn('Failed to send performance metrics:', error);
    }
  }, [getPerformanceReport]);

  return {
    metrics,
    webVitals,
    pageLoadMetrics,
    trackApiResponse,
    trackRenderTime,
    trackMemoryUsage,
    trackBundleSize,
    addMetric,
    calculateWebVitals,
    getPerformanceScore,
    getPerformanceReport,
    sendMetrics,
  };
}

/**
 * Resource loading time tracking
 */
export function useResourceLoading() {
  const [resources, setResources] = useState<any[]>([]);
  const [slowResources, setSlowResources] = useState<any[]>([]);

  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const resourceEntries = entries.filter(entry => entry.entryType === 'resource');

      const slowResources = resourceEntries.filter(entry => entry.duration > 1000);

      setResources(resourceEntries);
      setSlowResources(slowResources);
    });

    observer.observe({ entryTypes: ['resource'] });

    return () => observer.disconnect();
  }, []);

  return { resources, slowResources };
}

/**
 * Network connection monitoring
 */
export function useNetworkConnection() {
  const [connection, setConnection] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updateConnection = () => {
      if ('connection' in navigator) {
        setConnection({
          type: (navigator as any).connection?.type || 'unknown',
          effectiveType: (navigator as any).connection?.effectiveType || 'unknown',
          downlink: (navigator as any).connection?.downlink || 0,
          rtt: (navigator as any).connection?.rtt || 0,
        });
      }
      setIsOnline(navigator.onLine);
    };

    updateConnection();

    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    window.addEventListener('connectionchange', updateConnection);

    return () => {
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
      window.removeEventListener('connectionchange', updateConnection);
    };
  }, []);

  return { connection, isOnline };
}

/**
 * Performance optimization hooks
 */
export const PerformanceOptimizations = {
  // Debounce expensive operations
  debounce: <T extends (...args: any[]) => (
    func: T,
    delay: number
  ) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  },

  // Throttle frequent operations
  throttle: <T extends (...args: any[]) => (
    func: T,
    limit: number
  ) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        inThrottle = true;
        func(...args);
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    };
  },

  // Memoize expensive computations
  memoize: <T extends (...args: any[]) => any>(
    func: T
  ) => {
    const cache = new Map();
    return (...args: Parameters<T>) => {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = func(...args);
      cache.set(key, result);
      return result;
    };
  },
};