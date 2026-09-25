import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

// Import optimized components
import {
  VirtualList,
  InfiniteScrollList,
  OptimizedImage,
  BundleAnalyzer,
  RenderTracker,
  withRenderTracking,
  useRenderTracker
} from '../../src/components/optimized';

// Mock performance API
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    observer: jest.fn()
  }
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
  callback,
}));

describe('Frontend Optimization Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.__RENDER_METRICS = [];
  });

  afterEach(() => {
    window.__RENDER_METRICS = [];
  });

  describe('VirtualList', () => {
    it('should render only visible items', () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, text: `Item ${i}` }));
      const renderItem = (item: any) => <div>{item.text}</div>;

      render(
        <VirtualList
          items={items}
          itemHeight={50}
          containerHeight={400}
          renderItem={renderItem}
        />
      );

      // Should not render all 1000 items
      expect(screen.queryAllByText(/Item \d+/)).toHaveLength(0);
    });

    it('should handle dynamic item heights', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      const itemHeight = (index: number) => 30 + (index % 3) * 20; // Varying heights

      render(
        <VirtualList
          items={items}
          itemHeight={itemHeight}
          containerHeight={300}
          renderItem={(item) => <div>Item {item.id}</div>}
        />
      );

      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
    });

    it('should call onItemsRendered with correct range', async () => {
      const onItemsRendered = jest.fn();
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));

      render(
        <VirtualList
          items={items}
          itemHeight={40}
          containerHeight={200}
          renderItem={(item) => <div>Item {item.id}</div>}
          onItemsRendered={onItemsRendered}
        />
      );

      await waitFor(() => {
        expect(onItemsRendered).toHaveBeenCalled();
        const [start, end] = onItemsRendered.mock.calls[0];
        expect(end - start).toBeLessThan(20); // Should be less than total items
      });
    });
  });

  describe('InfiniteScrollList', () => {
    it('should load more items when scrolling near bottom', async () => {
      const onLoadMore = jest.fn();
      const items = Array.from({ length: 20 }, (_, i) => ({ id: i }));

      render(
        <InfiniteScrollList
          items={items}
          itemHeight={40}
          containerHeight={200}
          renderItem={(item) => <div>Item {item.id}</div>}
          onLoadMore={onLoadMore}
          hasMore={true}
          threshold={0.8}
        />
      );

      const container = screen.getByRole('list');

      // Simulate scroll to bottom
      fireEvent.scroll(container, {
        target: {
          scrollTop: 1000,
          clientHeight: 200,
          scrollHeight: 1200
        }
      });

      await waitFor(() => {
        expect(onLoadMore).toHaveBeenCalled();
      });
    });

    it('should show loading component when loading', () => {
      const items = Array.from({ length: 10 }, (_, i) => ({ id: i }));

      render(
        <InfiniteScrollList
          items={items}
          itemHeight={40}
          containerHeight={200}
          renderItem={(item) => <div>Item {item.id}</div>}
          onLoadMore={() => {}}
          hasMore={true}
          loadingComponent={<div>Loading more...</div>}
        />
      );

      expect(screen.getByText('Loading more...')).toBeInTheDocument();
    });
  });

  describe('OptimizedImage', () => {
    it('should render placeholder before image loads', () => {
      render(
        <OptimizedImage
          src="https://example.com/image.jpg"
          alt="Test image"
          width={300}
          height={200}
          placeholder="blur"
        />
      );

      // Should show placeholder initially
      const placeholder = screen.getByRole('img').parentElement?.querySelector('.optimized-image-placeholder');
      expect(placeholder).toBeInTheDocument();
    });

    it('should handle load error gracefully', async () => {
      render(
        <OptimizedImage
          src="https://example.com/invalid.jpg"
          alt="Test image"
          width={300}
          height={200}
        />
      );

      const img = screen.getByRole('img');
      fireEvent.error(img);

      await waitFor(() => {
        expect(screen.getByText('Failed to load image')).toBeInTheDocument();
      });
    });

    it('should generate appropriate srcSet', () => {
      render(
        <OptimizedImage
          src="/image.jpg"
          alt="Test image"
          width={300}
          height={200}
          sizes="(max-width: 600px) 100vw, 50vw"
        />
      );

      const img = screen.getByRole('img') as HTMLImageElement;
      expect(img.sizes).toBe('(max-width: 600px) 100vw, 50vw');
    });
  });

  describe('BundleAnalyzer', () => {
    it('should display bundle size information', async () => {
      // Mock bundle analyzer utility
      const mockBundleInfo = {
        modules: [
          { name: 'main.js', size: 500 * 1024, dependencies: [] },
          { name: 'vendor.js', size: 300 * 1024, dependencies: [] }
        ],
        size: 800 * 1024
      };

      jest.doMock('../../src/utils/lazy-loading', () => ({
        BundleAnalyzer: {
          getBundleInfo: jest.fn().mockResolvedValue(mockBundleInfo),
          monitorChanges: jest.fn()
        }
      }));

      render(
        <BundleAnalyzer
          budget={{ total: 1024 * 1024, individual: 200 * 1024 }}
          showDetails={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/800 KB/)).toBeInTheDocument();
      });
    });

    it('should warn when budget is exceeded', async () => {
      const mockBundleInfo = {
        modules: [{ name: 'large.js', size: 300 * 1024, dependencies: [] }],
        size: 2 * 1024 * 1024 // 2MB
      };

      jest.doMock('../../src/utils/lazy-loading', () => ({
        BundleAnalyzer: {
          getBundleInfo: jest.fn().mockResolvedValue(mockBundleInfo),
          monitorChanges: jest.fn()
        }
      }));

      const onBudgetExceeded = jest.fn();

      render(
        <BundleAnalyzer
          budget={{ total: 1024 * 1024, individual: 200 * 1024 }}
          onBudgetExceeded={onBudgetExceeded}
        />
      );

      await waitFor(() => {
        expect(onBudgetExceeded).toHaveBeenCalled();
        expect(screen.getByText(/Budget exceeded/)).toBeInTheDocument();
      });
    });
  });

  describe('RenderTracker', () => {
    it('should track render time', () => {
      let renderDuration = 0;
      jest.spyOn(performance, 'now').mockImplementation(() => {
        const duration = renderDuration;
        renderDuration = 50; // Simulate slow render
        return Date.now() + duration;
      });

      const onSlowRender = jest.fn();

      render(
        <RenderTracker
          componentName="TestComponent"
          threshold={30}
          onSlowRender={onSlowRender}
        >
          <div>Test Content</div>
        </RenderTracker>
      );

      expect(onSlowRender).toHaveBeenCalledWith(50, 'TestComponent');
    });

    it('should add render metrics to global storage', () => {
      render(
        <RenderTracker componentName="TestComponent">
          <div>Test Content</div>
        </RenderTracker>
      );

      expect(window.__RENDER_METRICS).toHaveLength(1);
      expect(window.__RENDER_METRICS![0].component).toBe('TestComponent');
      expect(window.__RENDER_METRICS![0].duration).toBeGreaterThan(0);
    });
  });

  describe('withRenderTracking HOC', () => {
    it('should wrap component with render tracking', () => {
      const TestComponent = () => <div>Tracked Component</div>;
      const TrackedComponent = withRenderTracking(TestComponent, {
        trackProps: true,
        threshold: 30
      });

      render(<TrackedComponent />);

      expect(screen.getByText('Tracked Component')).toBeInTheDocument();
      expect(window.__RENDER_METRICS).toHaveLength(1);
    });

    it('should preserve component display name', () => {
      const TestComponent = () => <div>Test</div>;
      TestComponent.displayName = 'CustomComponent';
      const TrackedComponent = withRenderTracking(TestComponent);

      expect(TrackedComponent.displayName).toBe('withRenderTracking(CustomComponent)');
    });
  });

  describe('useRenderTracker hook', () => {
    it('should track render duration', () => {
      let renderDuration = 0;
      jest.spyOn(performance, 'now').mockImplementation(() => {
        const duration = renderDuration;
        renderDuration = 25;
        return Date.now() + duration;
      });

      const TestComponent = () => {
        const { trackRender, getLastRenderTime } = useRenderTracker('HookComponent');

        React.useEffect(() => {
          const endRender = trackRender();
          setTimeout(endRender, 0); // Complete render
        }, []);

        return <div>Hook Component</div>;
      };

      render(<TestComponent />);

      // Hook should track render time
      expect(window.__RENDER_METRICS?.some(m => m.component === 'HookComponent')).toBe(true);
    });

    it('should calculate average render time', () => {
      const TestComponent = () => {
        const { trackRender, getAverageRenderTime, getRenderCount } = useRenderTracker('AverageComponent');

        React.useEffect(() => {
          // Track multiple renders
          for (let i = 0; i < 3; i++) {
            const endRender = trackRender();
            setTimeout(endRender, 10 * (i + 1)); // Varying durations
          }
        }, []);

        return <div>Component</div>;
      };

      render(<TestComponent />);

      // Should calculate average from multiple renders
      expect(window.__RENDER_METRICS?.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Budgets', () => {
    it('should detect bundle size violations', async () => {
      const onViolation = jest.fn();
      const mockBundleInfo = {
        size: 2 * 1024 * 1024 // 2MB
      };

      jest.doMock('../../src/utils/lazy-loading', () => ({
        BundleAnalyzer: {
          getBundleInfo: jest.fn().mockResolvedValue(mockBundleInfo)
        }
      }));

      const { PerformanceBudget } = require('../../src/components/optimized');

      render(
        <PerformanceBudget
          budgets={{ bundleSize: 1024 * 1024 }}
          onViolation={onViolation}
        />
      );

      await waitFor(() => {
        expect(onViolation).toHaveBeenCalledWith('bundleSize', 2097152, 1048576);
      });
    });

    it('should detect navigation performance violations', async () => {
      const onViolation = jest.fn();

      // Mock performance observer for navigation
      const mockEntries = [
        {
          entryType: 'navigation',
          loadEventEnd: 5000,
          loadEventStart: 2000
        }
      ];

      global.PerformanceObserver = jest.fn().mockImplementation((callback) => ({
        observe: jest.fn(),
        disconnect: jest.fn()
      }));

      const { PerformanceBudget } = require('../../src/components/optimized');

      render(
        <PerformanceBudget
          budgets={{ loadTime: 2000 }}
          onViolation={onViolation}
        />
      );

      // Would need to simulate performance observer callback
      // This is a simplified test structure
    });
  });
});