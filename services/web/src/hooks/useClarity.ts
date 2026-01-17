/**
 * Microsoft Clarity Analytics Hook
 * Uses official @microsoft/clarity package APIs
 * Memoized functions to prevent unnecessary re-renders
 */
import { useCallback } from 'react';
import Clarity from '@microsoft/clarity';

/**
 * Hook for Microsoft Clarity analytics integration
 * @returns Object with track, identify, and setTag methods (memoized)
 */
export function useClarity() {
  const track = useCallback((eventName: string) => {
    Clarity.event(eventName);
  }, []);

  const identify = useCallback((userId: string, sessionId?: string, friendlyName?: string) => {
    Clarity.identify(userId, sessionId, undefined, friendlyName);
  }, []);

  const setTag = useCallback((key: string, value: string) => {
    Clarity.setTag(key, value);
  }, []);

  return { track, identify, setTag };
}

/**
 * Standalone clarity tracking functions (for use outside React components)
 */
export const clarityTrack = (eventName: string): void => {
  Clarity.event(eventName);
};

export const clarityIdentify = (userId: string, sessionId?: string, friendlyName?: string): void => {
  Clarity.identify(userId, sessionId, undefined, friendlyName);
};

export const claritySetTag = (key: string, value: string): void => {
  Clarity.setTag(key, value);
};
