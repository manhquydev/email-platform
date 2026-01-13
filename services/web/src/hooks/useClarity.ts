/**
 * Microsoft Clarity Analytics Hook
 * Uses official @microsoft/clarity package APIs
 */
import Clarity from '@microsoft/clarity';

/**
 * Hook for Microsoft Clarity analytics integration
 * @returns Object with track, identify, and setTag methods
 */
export function useClarity() {
  const track = (eventName: string) => {
    Clarity.event(eventName);
  };

  const identify = (userId: string, sessionId?: string, friendlyName?: string) => {
    Clarity.identify(userId, sessionId, undefined, friendlyName);
  };

  const setTag = (key: string, value: string) => {
    Clarity.setTag(key, value);
  };

  return { track, identify, setTag };
}

/**
 * Standalone clarity tracking functions (for use outside React components)
 */
export const clarityTrack = (eventName: string) => {
  Clarity.event(eventName);
};

export const clarityIdentify = (userId: string, sessionId?: string, friendlyName?: string) => {
  Clarity.identify(userId, sessionId, undefined, friendlyName);
};

export const claritySetTag = (key: string, value: string) => {
  Clarity.setTag(key, value);
};
