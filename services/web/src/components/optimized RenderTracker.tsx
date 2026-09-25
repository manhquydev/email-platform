import React, { useEffect, useRef, useCallback, useState } from 'react';
import { usePerformanceMonitoring } from '../../hooks/use-performance';

interface RenderTrackerProps {
  componentName?: string;
  trackProps?: boolean;
  trackState?: boolean;
  trackChildren?: boolean;
  threshold?: number; // ms
  onSlowRender?: (duration: number, component: string) => void;
  children: React.ReactNode;
}

interface RenderMetrics {
  component: string;
  duration: number;
  props: any;
  state: any;
  childrenCount: number;
  timestamp: number;
}

/**
 * Component render performance tracker
 * Monitors component render times and reports slow renders
 */
export function RenderTracker({
  componentName = 'Unknown',
  trackProps = false,
  trackState = false,
  trackChildren = false,
  threshold = 16, // 60fps = 16.67ms
  onSlowRender,
  children
}: RenderTrackerProps) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef<number>(0);
  const propsRef = useRef<any>(null);
  const { addMetric, trackRenderTime } = usePerformanceMonitoring();
  const [isSlow, setIsSlow] = useState(false);

  // Track render start
  const renderStart = useRef<number>(performance.now());

  // Count children
  const childrenCount = React.Children.count(children);

  // Capture props
  if (trackProps && arguments[0]) {
    propsRef.current = { ...arguments[0] };
  }

  // Measure render time
  useEffect(() => {
    const renderEnd = performance.now();
    const duration = renderEnd - renderStart.current;
    renderCount.current++;
    lastRenderTime.current = renderEnd;

    // Add to performance metrics
    addMetric(`Render_${componentName}`, duration, 'ms');

    // Check if render is slow
    const isRenderSlow = duration > threshold;
    setIsSlow(isRenderSlow);

    if (isRenderSlow) {
      console.warn(`Slow render detected: ${componentName} took ${duration.toFixed(2)}ms`);
      onSlowRender?.(duration, componentName);
    }

    // Track detailed metrics
    const metrics: RenderMetrics = {
      component: componentName,
      duration,
      props: trackProps ? propsRef.current : undefined,
      state: trackState ? {}, // Would need to be set by component
      childrenCount,
      timestamp: Date.now()
    };

    // Store metrics for analysis
    window.__RENDER_METRICS = window.__RENDER_METRICS || [];
    window.__RENDER_METRICS.push(metrics);

    // Keep only last 100 renders
    if (window.__RENDER_METRICS.length > 100) {
      window.__RENDER_METRICS.shift();
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Track unmount
      addMetric(`Unmount_${componentName}`, 0, 'ms');
    };
  }, [componentName, addMetric]);

  return (
    <div
      className={`render-tracker ${isSlow ? 'slow-render' : ''}`}
      data-component={componentName}
      data-render-count={renderCount.current}
      data-last-render={lastRenderTime.current}
      style={{
        outline: isSlow ? '2px solid red' : undefined
      }}
    >
      {children}
    </div>
  );
}

/**
 * Higher-order component for render tracking
 */
export function withRenderTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: {
    trackProps?: boolean;
    trackState?: boolean;
    threshold?: number;
  } = {}
) {
  const TrackedComponent = React.memo((props: P) => {
    const componentName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

    return (
      <RenderTracker
        componentName={componentName}
        trackProps={options.trackProps}
        trackState={options.trackState}
        threshold={options.threshold}
      >
        <WrappedComponent {...props} />
      </RenderTracker>
    );
  });

  TrackedComponent.displayName = `withRenderTracking(${WrappedComponent.displayName || WrappedComponent.name})`;

  return TrackedComponent;
}

/**
 * Hook for tracking custom render metrics
 */
export function useRenderTracker(componentName: string) {
  const renderCount = useRef(0);
  const renderTimes = useRef<number[]>([]);
  const { trackRenderTime, addMetric } = usePerformanceMonitoring();

  const trackRender = useCallback(() => {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      renderCount.current++;
      renderTimes.current.push(duration);

      // Keep only last 10 render times
      if (renderTimes.current.length > 10) {
        renderTimes.current.shift();
      }

      addMetric(`Render_${componentName}`, duration, 'ms');

      return duration;
    };
  }, [componentName, addMetric]);

  const getAverageRenderTime = useCallback(() => {
    if (renderTimes.current.length === 0) return 0;
    const sum = renderTimes.current.reduce((a, b) => a + b, 0);
    return sum / renderTimes.current.length;
  }, []);

  const getLastRenderTime = useCallback(() => {
    return renderTimes.current[renderTimes.current.length - 1] || 0;
  }, []);

  const getRenderCount = useCallback(() => {
    return renderCount.current;
  }, []);

  return {
    trackRender,
    getAverageRenderTime,
    getLastRenderTime,
    getRenderCount,
    renderTimes: renderTimes.current
  };
}

/**
 * Render performance analyzer component
 */
export function RenderPerformanceAnalyzer() {
  const [metrics, setMetrics] = useState<RenderMetrics[]>([]);
  const [sortBy, setSortBy] = useState<'duration' | 'count' | 'component'>('duration');

  useEffect(() => {
    // Load metrics from global storage
    const loadMetrics = () => {
      const globalMetrics = window.__RENDER_METRICS || [];
      setMetrics(globalMetrics);
    };

    loadMetrics();

    // Update metrics periodically
    const interval = setInterval(loadMetrics, 1000);

    return () => clearInterval(interval);
  }, []);

  // Group metrics by component
  const componentMetrics = metrics.reduce((acc, metric) => {
    if (!acc[metric.component]) {
      acc[metric.component] = {
        count: 0,
        totalDuration: 0,
        maxDuration: 0,
        avgDuration: 0,
        slowRenders: 0
      };
    }

    const component = acc[metric.component];
    component.count++;
    component.totalDuration += metric.duration;
    component.maxDuration = Math.max(component.maxDuration, metric.duration);
    component.avgDuration = component.totalDuration / component.count;

    if (metric.duration > 16) { // 60fps threshold
      component.slowRenders++;
    }

    return acc;
  }, {} as Record<string, any>);

  // Sort components
  const sortedComponents = Object.entries(componentMetrics).sort(([, a], [, b]) => {
    switch (sortBy) {
      case 'duration':
        return (b as any).avgDuration - (a as any).avgDuration;
      case 'count':
        return (b as any).count - (a as any).count;
      case 'component':
        return a[0].localeCompare(b[0]);
      default:
        return 0;
    }
  });

  const formatDuration = (ms: number): string => {
    if (ms < 1) return `${ms.toFixed(2)}ms`;
    if (ms < 10) return `${ms.toFixed(1)}ms`;
    return `${ms.toFixed(0)}ms`;
  };

  if (metrics.length === 0) {
    return (
      <div className="render-performance-analyzer p-4 text-center text-gray-500">
        No render metrics available yet
      </div>
    );
  }

  return (
    <div className="render-performance-analyzer p-4">
      <h3 className="text-lg font-semibold mb-4">Render Performance Analysis</h3>

      {/* Sort controls */}
      <div className="mb-4 flex space-x-2">
        <button
          onClick={() => setSortBy('duration')}
          className={`px-3 py-1 text-sm rounded ${
            sortBy === 'duration' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
        >
          Sort by Duration
        </button>
        <button
          onClick={() => setSortBy('count')}
          className={`px-3 py-1 text-sm rounded ${
            sortBy === 'count' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
        >
          Sort by Count
        </button>
        <button
          onClick={() => setSortBy('component')}
          className={`px-3 py-1 text-sm rounded ${
            sortBy === 'component' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
        >
          Sort by Name
        </button>
      </div>

      {/* Component metrics table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Component</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Renders</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slow Renders</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedComponents.map(([component, stats]) => (
              <tr key={component} className={stats.avgDuration > 16 ? 'bg-red-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {component}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {stats.count}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={stats.avgDuration > 16 ? 'text-red-600 font-semibold' : ''}>
                    {formatDuration(stats.avgDuration)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDuration(stats.maxDuration)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {stats.slowRenders > 0 ? (
                    <span className="text-red-600 font-semibold">{stats.slowRenders}</span>
                  ) : (
                    '0'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mt-4 p-3 bg-gray-50 rounded">
        <p className="text-sm text-gray-600">
          Total metrics: {metrics.length} |
          Components tracked: {Object.keys(componentMetrics).length} |
          Slow renders: {Object.values(componentMetrics).reduce((sum, stats: any) => sum + stats.slowRenders, 0)}
        </p>
      </div>
    </div>
  );
}

// Global type for window
declare global {
  interface Window {
    __RENDER_METRICS?: RenderMetrics[];
  }
}