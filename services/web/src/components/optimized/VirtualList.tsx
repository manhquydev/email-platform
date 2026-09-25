import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useIntersectionObserver } from '../../utils/lazy-loading';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number | ((index: number) => number);
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  getItemKey?: (item: T, index: number) => string | number;
  estimatedItemHeight?: number;
  onScroll?: (scrollTop: number) => void;
  onItemsRendered?: (startIndex: number, stopIndex: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * High-performance virtual scrolling list component
 * Renders only visible items for optimal performance with large datasets
 */
export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  getItemKey = (item, index) => index,
  estimatedItemHeight = 50,
  onScroll,
  onItemsRendered,
  className = '',
  style = {}
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: containerHeight });
  const containerRef = useRef<HTMLDivElement>(null);
  const itemHeights = useRef<Map<number, number>>(new Map());
  const [, forceUpdate] = useState({});

  // Calculate item height (supports dynamic heights)
  const getItemHeight = useCallback((index: number): number => {
    if (typeof itemHeight === 'number') {
      return itemHeight;
    }
    return itemHeights.current.get(index) || estimatedItemHeight;
  }, [itemHeight, estimatedItemHeight]);

  // Measure item heights when they render
  const measureItem = useCallback((index: number, element: HTMLElement | null) => {
    if (element && typeof itemHeight === 'function') {
      const height = element.getBoundingClientRect().height;
      if (height !== itemHeights.current.get(index)) {
        itemHeights.current.set(index, height);
        forceUpdate({});
      }
    }
  }, [itemHeight]);

  // Calculate total height of all items
  const totalHeight = useMemo(() => {
    if (typeof itemHeight === 'number') {
      return items.length * itemHeight;
    }
    let height = 0;
    for (let i = 0; i < items.length; i++) {
      height += getItemHeight(i);
    }
    return height;
  }, [items.length, itemHeight, getItemHeight]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    let startIndex = 0;
    let offsetTop = 0;
    let accumulatedHeight = 0;

    // Find start index
    for (let i = 0; i < items.length; i++) {
      const itemH = getItemHeight(i);
      if (accumulatedHeight + itemH > scrollTop) {
        startIndex = i;
        offsetTop = accumulatedHeight;
        break;
      }
      accumulatedHeight += itemH;
    }

    // Find end index
    let endIndex = startIndex;
    let visibleHeight = 0;
    for (let i = startIndex; i < items.length; i++) {
      visibleHeight += getItemHeight(i);
      endIndex = i;
      if (visibleHeight >= containerSize.height) {
        break;
      }
    }

    // Apply overscan
    startIndex = Math.max(0, startIndex - overscan);
    endIndex = Math.min(items.length - 1, endIndex + overscan);

    return { startIndex, endIndex, offsetTop };
  }, [items.length, scrollTop, containerSize.height, overscan, getItemHeight]);

  // Handle scroll events with throttling
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  }, [onScroll]);

  // Report visible items
  useEffect(() => {
    onItemsRendered?.(visibleRange.startIndex, visibleRange.endIndex);
  }, [visibleRange, onItemsRendered]);

  // Resize observer for container
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Render visible items
  const itemsToRender = [];
  let currentOffset = 0;

  for (let i = 0; i < visibleRange.startIndex; i++) {
    currentOffset += getItemHeight(i);
  }

  for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
    const item = items[i];
    if (!item) continue;

    const itemKey = getItemKey(item, i);
    const height = getItemHeight(i);

    itemsToRender.push(
      <VirtualListItem
        key={itemKey}
        index={i}
        height={height}
        offset={currentOffset}
        onMeasure={measureItem}
      >
        {renderItem(item, i)}
      </VirtualListItem>
    );

    currentOffset += height;
  }

  return (
    <div
      ref={containerRef}
      className={`virtual-list ${className}`}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
        ...style
      }}
      onScroll={handleScroll}
    >
      <div
        className="virtual-list-spacer"
        style={{
          height: totalHeight,
          position: 'relative',
          width: '100%'
        }}
      >
        {itemsToRender}
      </div>
    </div>
  );
}

interface VirtualListItemProps {
  index: number;
  height: number;
  offset: number;
  onMeasure: (index: number, element: HTMLElement | null) => void;
  children: React.ReactNode;
}

/**
 * Individual virtual list item
 */
function VirtualListItem({
  index,
  height,
  offset,
  onMeasure,
  children
}: VirtualListItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Use intersection observer for lazy loading
  const containerRef = useRef<HTMLDivElement>(null);
  const isIntersecting = useIntersectionObserver(containerRef, {
    threshold: 0.01,
    rootMargin: '50px'
  });

  // Measure item when it renders
  useEffect(() => {
    onMeasure(index, itemRef.current);
  }, [index, onMeasure]);

  // Track visibility
  useEffect(() => {
    setIsVisible(isIntersecting);
  }, [isIntersecting]);

  return (
    <div
      ref={containerRef}
      className="virtual-list-item"
      style={{
        position: 'absolute',
        top: offset,
        left: 0,
        right: 0,
        height,
        willChange: 'transform',
        transform: `translateY(0)`,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.1s ease-out'
      }}
    >
      <div ref={itemRef} style={{ height: '100%' }}>
        {children}
      </div>
    </div>
  );
}

/**
 * Hook for virtual list data management
 */
export function useVirtualList<T>(
  items: T[],
  options: {
    itemHeight?: number | ((index: number) => number);
    overscan?: number;
    parentRef?: React.RefObject<HTMLElement>;
  } = {}
) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
  const { itemHeight, overscan = 5, parentRef } = options;

  // Memoized visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1);
  }, [items, visibleRange]);

  // Update visible range
  const updateVisibleRange = useCallback((start: number, end: number) => {
    setVisibleRange({
      start: Math.max(0, start - overscan),
      end: Math.min(items.length - 1, end + overscan)
    });
  }, [items.length, overscan]);

  return {
    visibleItems,
    visibleRange,
    updateVisibleRange
  };
}

/**
 * Optimized infinite scroll component
 */
export function InfiniteScrollList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  onLoadMore,
  hasMore,
  loadingComponent,
  getItemKey,
  threshold = 0.8,
  ...props
}: Omit<VirtualListProps<T>, 'overscan'> & {
  onLoadMore: () => void;
  hasMore: boolean;
  loadingComponent?: React.ReactNode;
  threshold?: number;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if need to load more
  const checkLoadMore = useCallback(() => {
    if (!hasMore || isLoading) return;

    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    if (scrollPercentage >= threshold) {
      setIsLoading(true);
      onLoadMore();
      setTimeout(() => setIsLoading(false), 1000); // Prevent rapid calls
    }
  }, [hasMore, isLoading, onLoadMore, threshold]);

  // Enhanced scroll handler
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    props.onScroll?.(e.currentTarget.scrollTop);
    checkLoadMore();
  }, [props.onScroll, checkLoadMore]);

  // Add loading item at the end if needed
  const extendedItems = hasMore ? [
    ...items,
    { id: 'loading', isLoading: true } as any
  ] : items;

  const extendedRenderItem = useCallback((item: T, index: number) => {
    if ('isLoading' in item && (item as any).isLoading) {
      return loadingComponent || <div className="p-4 text-center">Loading more...</div>;
    }
    return renderItem(item, index);
  }, [renderItem, loadingComponent]);

  return (
    <VirtualList
      {...props}
      ref={containerRef}
      items={extendedItems}
      itemHeight={itemHeight}
      containerHeight={containerHeight}
      renderItem={extendedRenderItem}
      getItemKey={getItemKey}
      overscan={10}
      onScroll={handleScroll}
      className={`infinite-scroll-list ${props.className}`}
    />
  );
}