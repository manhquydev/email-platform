// Performance optimization service
export class PerformanceService {
  private static instance: PerformanceService;
  private metrics: Map<string, number> = new Map();

  static getInstance(): PerformanceService {
    if (!PerformanceService.instance) {
      PerformanceService.instance = new PerformanceService();
    }
    return PerformanceService.instance;
  }

  // Measure page load performance
  measurePageLoad(): {
    domContentLoaded: number;
    loadComplete: number;
    firstContentfulPaint?: number;
    largestContentfulPaint?: number;
  } {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
    const loadComplete = navigation.loadEventEnd - navigation.loadEventStart;

    // Get Web Vitals if available
    let firstContentfulPaint: number | undefined;
    let largestContentfulPaint: number | undefined;

    if ('PerformanceObserver' in window) {
      try {
        // First Contentful Paint
        const paintObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcpEntry = entries.find((entry) => entry.name === 'first-contentful-paint');
          if (fcpEntry) {
            firstContentfulPaint = fcpEntry.startTime;
          }
        });
        paintObserver.observe({ entryTypes: ['paint'] });

        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            largestContentfulPaint = lastEntry.startTime;
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('PerformanceObserver not supported:', e);
      }
    }

    return {
      domContentLoaded,
      loadComplete,
      firstContentfulPaint,
      largestContentfulPaint
    };
  }

  // Lazy load images with intersection observer
  setupLazyLoading(): void {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              imageObserver.unobserve(img);
            }
          }
        });
      }, {
        rootMargin: '50px 0px',
        threshold: 0.01
      });

      document.querySelectorAll('img[data-src]').forEach((img) => {
        imageObserver.observe(img);
      });
    }
  }

  // Preload critical resources
  preloadCriticalResources(): void {
    const resources = [
      { url: '/fonts/inter-var.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
      { url: '/api/health', as: 'fetch' }
    ];

    resources.forEach((resource) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.url;
      link.as = resource.as;
      if (resource.type) link.type = resource.type;
      if (resource.crossOrigin) link.crossOrigin = resource.crossOrigin;
      document.head.appendChild(link);
    });
  }

  // Setup service worker for caching
  async setupServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('ServiceWorker registered:', registration);
      } catch (error) {
        console.warn('ServiceWorker registration failed:', error);
      }
    }
  }

  // Measure Core Web Vitals
  measureCoreWebVitals(): void {
    // Import web-vitals library if available
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(console.log);
      getFID(console.log);
      getFCP(console.log);
      getLCP(console.log);
      getTTFB(console.log);
    }).catch(() => {
      // Fallback measurements
      this.measurePageLoad();
    });
  }

  // Optimize images with WebP if supported
  optimizeImageUrls(): void {
    const supportsWebP = document.createElement('canvas')
      .toDataURL('image/webp')
      .indexOf('data:image/webp') === 0;

    if (supportsWebP) {
      document.querySelectorAll('img[data-webp]').forEach((img) => {
        const imgEl = img as HTMLImageElement;
        const webpSrc = imgEl.getAttribute('data-webp');
        if (webpSrc) {
          imgEl.src = webpSrc;
        }
      });
    }
  }

  // Setup resource hints for external domains
  setupResourceHints(): void {
    const domains = [
      'https://api.stripe.com',
      'https://js.stripe.com',
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com'
    ];

    // DNS prefetch
    domains.forEach((domain) => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = domain;
      document.head.appendChild(link);
    });

    // Preconnect for critical domains
    ['https://fonts.gstatic.com', 'https://api.stripe.com'].forEach((domain) => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }

  // Debounce scroll events for performance
  setupScrollOptimization(): void {
    let ticking = false;

    const updateScrollPosition = () => {
      // Update scroll-related UI elements
      const scrolled = window.scrollY > 100;
      const nav = document.querySelector('.landing-nav');
      if (nav) {
        if (scrolled) {
          nav.classList.add('scrolled');
        } else {
          nav.classList.remove('scrolled');
        }
      }
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollPosition);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Initialize all performance optimizations
  initialize(): void {
    // Run on page load
    if (document.readyState === 'complete') {
      this.runOptimizations();
    } else {
      window.addEventListener('load', () => this.runOptimizations());
    }
  }

  private runOptimizations(): void {
    this.setupLazyLoading();
    this.preloadCriticalResources();
    this.setupServiceWorker();
    this.measureCoreWebVitals();
    this.optimizeImageUrls();
    this.setupResourceHints();
    this.setupScrollOptimization();

    // Log performance metrics
    setTimeout(() => {
      const metrics = this.measurePageLoad();
      console.log('Page Performance Metrics:', metrics);

      // Send metrics to analytics if available
      this.sendMetricsToAnalytics(metrics);
    }, 3000);
  }

  // Send performance metrics to analytics
  private sendMetricsToAnalytics(metrics: any): void {
    // This would integrate with your analytics service
    if ('gtag' in window) {
      (window as any).gtag('event', 'page_load_metrics', metrics);
    }
  }

  // Memory leak detection for development
  checkMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      console.log('Memory Usage:', {
        used: Math.round(memory.usedJSHeapSize / 1048576) + ' MB',
        total: Math.round(memory.totalJSHeapSize / 1048576) + ' MB',
        limit: Math.round(memory.jsHeapSizeLimit / 1048576) + ' MB'
      });
    }
  }
}

// Export singleton instance
export const performanceService = PerformanceService.getInstance();