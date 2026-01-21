/**
 * useMobileBottomNav Hook Unit Tests
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    useMobileBottomNav,
    setMobileBottomNav,
    toggleMobileBottomNav
} from "./useMobileBottomNav";

describe("useMobileBottomNav", () => {
    // Mock localStorage
    const localStorageMock = (() => {
        let store: Record<string, string> = {};
        return {
            getItem: vi.fn((key: string) => store[key] || null),
            setItem: vi.fn((key: string, value: string) => {
                store[key] = value;
            }),
            removeItem: vi.fn((key: string) => {
                delete store[key];
            }),
            clear: () => {
                store = {};
            },
        };
    })();

    beforeEach(() => {
        // Reset localStorage mock
        localStorageMock.clear();
        vi.clearAllMocks();

        // Setup window.localStorage
        Object.defineProperty(window, "localStorage", {
            value: localStorageMock,
            writable: true,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("useMobileBottomNav()", () => {
        it("returns true by default before hydration", () => {
            const { result } = renderHook(() => useMobileBottomNav());

            // Initial state is true (SSR-safe default)
            expect(result.current).toBe(true);
        });

        it("returns true after hydration when not disabled", async () => {
            localStorageMock.getItem.mockReturnValue(null);

            const { result } = renderHook(() => useMobileBottomNav());

            // After useEffect runs
            await vi.waitFor(() => {
                expect(result.current).toBe(true);
            });
        });

        it("returns false after hydration when explicitly disabled", async () => {
            localStorageMock.getItem.mockReturnValue("disabled");

            const { result } = renderHook(() => useMobileBottomNav());

            await vi.waitFor(() => {
                expect(result.current).toBe(false);
            });
        });

        it("checks correct localStorage key", async () => {
            renderHook(() => useMobileBottomNav());

            await vi.waitFor(() => {
                expect(localStorageMock.getItem).toHaveBeenCalledWith("feature_mobile_bottom_nav");
            });
        });
    });

    describe("setMobileBottomNav()", () => {
        it("removes localStorage item when enabled", () => {
            setMobileBottomNav(true);

            expect(localStorageMock.removeItem).toHaveBeenCalledWith("feature_mobile_bottom_nav");
        });

        it("sets localStorage to 'disabled' when disabled", () => {
            setMobileBottomNav(false);

            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                "feature_mobile_bottom_nav",
                "disabled"
            );
        });
    });

    describe("toggleMobileBottomNav()", () => {
        it("returns false when toggling from enabled", () => {
            localStorageMock.getItem.mockReturnValue(null); // enabled by default

            const result = toggleMobileBottomNav();

            expect(result).toBe(false);
        });

        it("returns true when toggling from disabled", () => {
            localStorageMock.getItem.mockReturnValue("disabled");

            const result = toggleMobileBottomNav();

            expect(result).toBe(true);
        });

        it("disables feature when currently enabled", () => {
            localStorageMock.getItem.mockReturnValue(null);

            toggleMobileBottomNav();

            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                "feature_mobile_bottom_nav",
                "disabled"
            );
        });

        it("enables feature when currently disabled", () => {
            localStorageMock.getItem.mockReturnValue("disabled");

            toggleMobileBottomNav();

            expect(localStorageMock.removeItem).toHaveBeenCalledWith("feature_mobile_bottom_nav");
        });
    });
});
