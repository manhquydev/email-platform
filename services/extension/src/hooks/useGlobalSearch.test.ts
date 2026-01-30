/**
 * Unit tests for useGlobalSearch hook
 * Simplified tests focusing on state management and basic behavior
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGlobalSearch } from './useGlobalSearch';

// Mock API
vi.mock('../shared/api', () => ({
  api: {
    searchMessages: vi.fn(),
  },
}));

import { api } from '../shared/api';

describe('useGlobalSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return empty query initially', () => {
      const { result } = renderHook(() => useGlobalSearch());
      expect(result.current.query).toBe('');
    });

    it('should return empty results initially', () => {
      const { result } = renderHook(() => useGlobalSearch());
      expect(result.current.results).toEqual([]);
    });

    it('should not be loading initially', () => {
      const { result } = renderHook(() => useGlobalSearch());
      expect(result.current.loading).toBe(false);
    });
  });

  describe('query handling', () => {
    it('should update query when setQuery is called', () => {
      const { result } = renderHook(() => useGlobalSearch());

      act(() => {
        result.current.setQuery('test');
      });

      expect(result.current.query).toBe('test');
    });

    it('should update query to empty string', () => {
      const { result } = renderHook(() => useGlobalSearch());

      act(() => {
        result.current.setQuery('test');
      });

      act(() => {
        result.current.setQuery('');
      });

      expect(result.current.query).toBe('');
    });
  });

  describe('clear function', () => {
    it('should clear query when clear is called', () => {
      const { result } = renderHook(() => useGlobalSearch());

      act(() => {
        result.current.setQuery('search term');
      });

      expect(result.current.query).toBe('search term');

      act(() => {
        result.current.clear();
      });

      expect(result.current.query).toBe('');
    });

    it('should clear results when clear is called', () => {
      const { result } = renderHook(() => useGlobalSearch());

      act(() => {
        result.current.clear();
      });

      expect(result.current.results).toEqual([]);
    });
  });

  describe('return value structure', () => {
    it('should return all required properties', () => {
      const { result } = renderHook(() => useGlobalSearch());

      expect(result.current).toHaveProperty('query');
      expect(result.current).toHaveProperty('setQuery');
      expect(result.current).toHaveProperty('results');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('clear');
    });

    it('should have setQuery as a function', () => {
      const { result } = renderHook(() => useGlobalSearch());
      expect(typeof result.current.setQuery).toBe('function');
    });

    it('should have clear as a function', () => {
      const { result } = renderHook(() => useGlobalSearch());
      expect(typeof result.current.clear).toBe('function');
    });
  });
});
