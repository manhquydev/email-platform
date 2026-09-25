import { lazy, ComponentType, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import React from 'react';

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  </div>
);

// Error boundary component
const ErrorBoundary: React.FC<{ error: Error; reset: () => void }> = ({ error, reset }) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
    <div className="text-red-500 text-6xl mb-4">⚠️</div>
    <h2 className="text-2xl font-semibold text-gray-800 mb-2">Something went wrong</h2>
    <p className="text-gray-600 mb-6">{error.message}</p>
    <button
      onClick={reset}
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
    >
      Try Again
    </button>
  </div>
);

/**
 * Higher-order component for lazy loading with error handling
 */
export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback: React.ComponentType = LoadingSpinner,
  errorFallback?: React.ComponentType<{ error: Error; reset: () => void }>
) {
  const LazyComponent = lazy(importFunc);

  return (props: any) => (
    <ErrorBoundaryProvider errorFallback={errorFallback}>
      <Suspense fallback={<fallback />}>
        <LazyComponent {...props} />
      </Suspense>
    </ErrorBoundaryProvider>
  );
}

/**
 * Error boundary provider component
 */
class ErrorBoundaryProvider extends React.Component<
  { children: React.ReactNode; errorFallback?: React.ComponentType<{ error: Error; reset: () => void }> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const ErrorFallback = this.props.errorFallback || ErrorBoundary;
      return <ErrorFallback error={this.state.error} reset={() => this.setState({ hasError: false, error: null })} />;
    }

    return this.props.children;
  }
}

/**
 * Preload component for better UX
 */
export function preloadComponent(importFunc: () => Promise<{ default: any }>): void {
  // Trigger import in background
  importFunc().catch(error => {
    console.warn('Preload failed:', error);
  });
}

/**
 * Route guard wrapper for lazy loaded routes
 */
export function ProtectedRoute({ component: Component, ...props }: any) {
  const isAuthenticated = checkAuthentication();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Component {...props} />;
}

/**
 * Check authentication status
 */
function checkAuthentication(): boolean {
  // Implement your authentication logic here
  return localStorage.getItem('authToken') !== null;
}

/**
 * Intersection Observer hook for lazy loading
 */
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
): boolean {
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [ref, options.threshold, options.rootMargin]);

  return isIntersecting;
}

/**
 * Lazy load images with intersection observer
 */
export function LazyImage({
  src,
  alt,
  className,
  placeholder,
  ...props
}: {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  [key: string]: any;
}) {
  const imgRef = React.useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isInView, setIsInView] = React.useState(false);

  const isIntersecting = useIntersectionObserver(imgRef, {
    threshold: 0.01,
  });

  React.useEffect(() => {
    if (isIntersecting && !isLoaded) {
      setIsInView(true);
      const img = new Image();
      img.src = src;
      img.onload = () => {
        setIsLoaded(true);
      };
      img.onerror = () => {
        console.error('Failed to load image:', src);
      };
    }
  }, [isIntersecting, isLoaded, src]);

  return (
    <img
      ref={imgRef}
      src={isInView ? src : placeholder}
      alt={alt}
      className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-50'} ${className}`}
      loading="lazy"
      {...props}
    />
  );
}

/**
 * Webpack chunk loading utility
 */
export function loadChunk(chunkName: string): Promise<any> {
  return import(/* webpackChunkName: "[request]" */ `../chunks/${chunkName}`)
    .catch(error => {
      console.error(`Failed to load chunk ${chunkName}:`, error);
      throw error;
    });
}

/**
 * Dynamic import with retry mechanism
 */
export async function dynamicImport(
  importFunc: () => Promise<any>,
  retries = 3,
  delay = 1000
): Promise<any> {
  let lastError: Error;

  for (let i = 0; i < retries; i++) {
    try {
      return await importFunc();
    } catch (error) {
      lastError = error;
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  throw lastError!;
}

/**
 * Service Worker registration for offline support
 */
export async function registerServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log('SW registered:', registration);
    } catch (error) {
      console.error('SW registration failed:', error);
    }
  }
}

/**
 * Resource preloading utilities
 */
export const ResourcePreloader = {
  /**
   * Preload JavaScript modules
   */
  preloadModules: (modules: string[]) => {
    modules.forEach(module => {
      const link = document.createElement('link');
      link.rel = 'modulepreload';
      link.href = module;
      document.head.appendChild(link);
    });
  },

  /**
   * Preload critical CSS
   */
  preloadCSS: (styles: string[]) => {
    styles.forEach(style => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = style;
      document.head.appendChild(link);
    });
  },

  /**
   * Preload fonts
   */
  preloadFonts: (fonts: string[]) => {
    fonts.forEach(font => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.type = 'font/woff2';
      link.crossOrigin = 'anonymous';
      link.href = font;
      document.head.appendChild(link);
    });
  },

  /**
   * Prefetch pages for faster navigation
   */
  prefetchPages: (pages: string[]) => {
    pages.forEach(page => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = page;
      document.head.appendChild(link);
    });
  },
};

/**
 * Bundle size monitoring
 */
export const BundleAnalyzer = {
  /**
   * Get bundle size information
   */
  getBundleInfo: async () => {
    if (import.meta.hot) {
      const modules = import.meta.hot.getModules();
      return {
        modules: modules.length,
        size: modules.reduce((acc, mod) => acc + (mod.size || 0), 0),
      };
    }
    return null;
  },

  /**
   * Monitor bundle size changes
   */
  monitorChanges: (callback: (info: any) => void) => {
    if (import.meta.hot) {
      import.meta.hot.on('vite:beforeUpdate', () => {
        const info = BundleAnalyzer.getBundleInfo();
        callback(info);
      });
    }
  },
};