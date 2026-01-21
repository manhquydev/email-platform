/**
 * useHaptic Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHaptic, haptic } from './useHaptic';

describe('useHaptic', () => {
    const mockVibrate = vi.fn();

    beforeEach(() => {
        // Mock navigator.vibrate
        Object.defineProperty(navigator, 'vibrate', {
            value: mockVibrate,
            writable: true,
            configurable: true,
        });
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('haptic function', () => {
        it('calls navigator.vibrate with light pattern', () => {
            haptic('light');
            expect(mockVibrate).toHaveBeenCalledWith(10);
        });

        it('calls navigator.vibrate with medium pattern', () => {
            haptic('medium');
            expect(mockVibrate).toHaveBeenCalledWith(20);
        });

        it('calls navigator.vibrate with heavy pattern', () => {
            haptic('heavy');
            expect(mockVibrate).toHaveBeenCalledWith(30);
        });

        it('calls navigator.vibrate with selection pattern', () => {
            haptic('selection');
            expect(mockVibrate).toHaveBeenCalledWith(5);
        });

        it('calls navigator.vibrate with success pattern', () => {
            haptic('success');
            expect(mockVibrate).toHaveBeenCalledWith([10, 50, 10]);
        });

        it('calls navigator.vibrate with warning pattern', () => {
            haptic('warning');
            expect(mockVibrate).toHaveBeenCalledWith([20, 50, 20]);
        });

        it('calls navigator.vibrate with error pattern', () => {
            haptic('error');
            expect(mockVibrate).toHaveBeenCalledWith([30, 50, 30, 50, 30]);
        });

        it('defaults to light pattern', () => {
            haptic();
            expect(mockVibrate).toHaveBeenCalledWith(10);
        });

        it('gracefully handles missing vibrate API', () => {
            Object.defineProperty(navigator, 'vibrate', {
                value: undefined,
                writable: true,
                configurable: true,
            });

            // Should not throw
            expect(() => haptic('light')).not.toThrow();
        });

        it('handles vibrate throwing error', () => {
            mockVibrate.mockImplementation(() => {
                throw new Error('Vibration failed');
            });

            // Should not throw
            expect(() => haptic('light')).not.toThrow();
        });
    });

    describe('useHaptic hook', () => {
        it('returns all haptic methods', () => {
            const { result } = renderHook(() => useHaptic());

            expect(typeof result.current.light).toBe('function');
            expect(typeof result.current.medium).toBe('function');
            expect(typeof result.current.heavy).toBe('function');
            expect(typeof result.current.selection).toBe('function');
            expect(typeof result.current.success).toBe('function');
            expect(typeof result.current.warning).toBe('function');
            expect(typeof result.current.error).toBe('function');
        });

        it('returns isSupported flag', () => {
            const { result } = renderHook(() => useHaptic());
            expect(result.current.isSupported).toBe(true);
        });

        it('light() triggers light haptic', () => {
            const { result } = renderHook(() => useHaptic());
            result.current.light();
            expect(mockVibrate).toHaveBeenCalledWith(10);
        });

        it('medium() triggers medium haptic', () => {
            const { result } = renderHook(() => useHaptic());
            result.current.medium();
            expect(mockVibrate).toHaveBeenCalledWith(20);
        });

        it('heavy() triggers heavy haptic', () => {
            const { result } = renderHook(() => useHaptic());
            result.current.heavy();
            expect(mockVibrate).toHaveBeenCalledWith(30);
        });

        it('selection() triggers selection haptic', () => {
            const { result } = renderHook(() => useHaptic());
            result.current.selection();
            expect(mockVibrate).toHaveBeenCalledWith(5);
        });

        it('success() triggers success haptic', () => {
            const { result } = renderHook(() => useHaptic());
            result.current.success();
            expect(mockVibrate).toHaveBeenCalledWith([10, 50, 10]);
        });

        it('warning() triggers warning haptic', () => {
            const { result } = renderHook(() => useHaptic());
            result.current.warning();
            expect(mockVibrate).toHaveBeenCalledWith([20, 50, 20]);
        });

        it('error() triggers error haptic', () => {
            const { result } = renderHook(() => useHaptic());
            result.current.error();
            expect(mockVibrate).toHaveBeenCalledWith([30, 50, 30, 50, 30]);
        });
    });

    describe('isSupported detection', () => {
        it('isSupported reflects vibrate API availability', () => {
            // When vibrate is available (mocked in beforeEach), isSupported should be true
            const { result } = renderHook(() => useHaptic());
            expect(result.current.isSupported).toBe(true);
        });

        it('haptic gracefully handles when vibrate throws', () => {
            mockVibrate.mockImplementation(() => {
                throw new Error('Vibration failed');
            });

            // Should not throw
            expect(() => haptic('light')).not.toThrow();
        });
    });
});
