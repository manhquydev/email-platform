/**
 * useScrollPosition Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScrollPosition } from './useScrollPosition';

// Suppress React 19 act() warnings in tests
beforeAll(() => {
    vi.spyOn(console, 'error').mockImplementation((msg) => {
        if (typeof msg === 'string' && msg.includes('act(')) return;
        console.warn(msg);
    });
});

afterAll(() => {
    vi.restoreAllMocks();
});

describe('useScrollPosition', () => {
    const mockSessionStorage: Record<string, string> = {};

    beforeEach(() => {
        // Mock sessionStorage
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => mockSessionStorage[key] || null);
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
            mockSessionStorage[key] = value;
        });
        vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => {
            delete mockSessionStorage[key];
        });

        // Mock requestAnimationFrame
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
            cb(0);
            return 0;
        });

        // Clear storage between tests
        Object.keys(mockSessionStorage).forEach(key => delete mockSessionStorage[key]);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('initialization', () => {
        it('returns scrollRef', () => {
            const { result } = renderHook(() => useScrollPosition({ key: 'test' }));
            expect(result.current.scrollRef).toBeDefined();
            expect(result.current.scrollRef.current).toBeNull();
        });

        it('returns savePosition function', () => {
            const { result } = renderHook(() => useScrollPosition({ key: 'test' }));
            expect(typeof result.current.savePosition).toBe('function');
        });

        it('returns restorePosition function', () => {
            const { result } = renderHook(() => useScrollPosition({ key: 'test' }));
            expect(typeof result.current.restorePosition).toBe('function');
        });

        it('returns clearPosition function', () => {
            const { result } = renderHook(() => useScrollPosition({ key: 'test' }));
            expect(typeof result.current.clearPosition).toBe('function');
        });
    });

    describe('savePosition', () => {
        it('saves scroll position to sessionStorage', () => {
            const { result } = renderHook(() => useScrollPosition({ key: 'inbox-list' }));

            // Create mock element
            const mockElement = { scrollTop: 150 };
            (result.current.scrollRef as { current: typeof mockElement }).current = mockElement;

            act(() => {
                result.current.savePosition();
            });

            expect(mockSessionStorage['scroll_position_inbox-list']).toBe('150');
        });

        it('does nothing if scrollRef is null', () => {
            const { result } = renderHook(() => useScrollPosition({ key: 'test' }));

            act(() => {
                result.current.savePosition();
            });

            expect(mockSessionStorage['scroll_position_test']).toBeUndefined();
        });
    });

    describe('restorePosition', () => {
        it('restores scroll position from sessionStorage', () => {
            mockSessionStorage['scroll_position_inbox-list'] = '200';

            const { result } = renderHook(() => useScrollPosition({ key: 'inbox-list' }));

            const mockElement = { scrollTop: 0 };
            (result.current.scrollRef as { current: typeof mockElement }).current = mockElement;

            act(() => {
                result.current.restorePosition();
            });

            expect(mockElement.scrollTop).toBe(200);
        });

        it('does nothing if no saved position', () => {
            const { result } = renderHook(() => useScrollPosition({ key: 'test' }));

            const mockElement = { scrollTop: 50 };
            (result.current.scrollRef as { current: typeof mockElement }).current = mockElement;

            act(() => {
                result.current.restorePosition();
            });

            expect(mockElement.scrollTop).toBe(50);
        });

        it('handles invalid saved value', () => {
            mockSessionStorage['scroll_position_test'] = 'invalid';

            const { result } = renderHook(() => useScrollPosition({ key: 'test' }));

            const mockElement = { scrollTop: 50 };
            (result.current.scrollRef as { current: typeof mockElement }).current = mockElement;

            act(() => {
                result.current.restorePosition();
            });

            expect(mockElement.scrollTop).toBe(50);
        });
    });

    describe('clearPosition', () => {
        it('removes saved position from sessionStorage', () => {
            mockSessionStorage['scroll_position_test'] = '100';

            const { result } = renderHook(() => useScrollPosition({ key: 'test' }));

            act(() => {
                result.current.clearPosition();
            });

            expect(mockSessionStorage['scroll_position_test']).toBeUndefined();
        });
    });

    describe('key uniqueness', () => {
        it('uses different storage keys for different instances', () => {
            const { result: result1 } = renderHook(() => useScrollPosition({ key: 'list-1' }));
            const { result: result2 } = renderHook(() => useScrollPosition({ key: 'list-2' }));

            const mockElement1 = { scrollTop: 100 };
            const mockElement2 = { scrollTop: 200 };

            (result1.current.scrollRef as { current: typeof mockElement1 }).current = mockElement1;
            (result2.current.scrollRef as { current: typeof mockElement2 }).current = mockElement2;

            act(() => {
                result1.current.savePosition();
                result2.current.savePosition();
            });

            expect(mockSessionStorage['scroll_position_list-1']).toBe('100');
            expect(mockSessionStorage['scroll_position_list-2']).toBe('200');
        });
    });

    describe('options', () => {
        it('accepts restoreOnMount option', () => {
            // Just verify the hook accepts the option without error
            const { result } = renderHook(() => useScrollPosition({ key: 'test', restoreOnMount: false }));
            expect(result.current.scrollRef).toBeDefined();
            expect(result.current.savePosition).toBeDefined();
            expect(result.current.restorePosition).toBeDefined();
        });
    });
});
