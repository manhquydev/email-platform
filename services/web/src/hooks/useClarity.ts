/**
 * Microsoft Clarity Analytics Hook
 * Provides type-safe wrapper for Clarity tracking APIs
 */

declare global {
  interface Window {
    clarity?: (method: string, ...args: string[]) => void;
  }
}

/**
 * Hook for Microsoft Clarity analytics integration
 * @returns Object with track, identify, and setTag methods
 */
export function useClarity() {
  /**
   * Track a custom event in Clarity
   * @param eventName - Name of the event (e.g., "login", "inbox_created")
   */
  const track = (eventName: string) => {
    window.clarity?.("event", eventName);
  };

  /**
   * Identify a user session with custom ID
   * @param userId - Unique user identifier
   * @param sessionId - Optional session identifier
   * @param friendlyName - Optional display name (e.g., email)
   */
  const identify = (userId: string, sessionId?: string, friendlyName?: string) => {
    window.clarity?.("identify", userId, sessionId || "", "", friendlyName || "");
  };

  /**
   * Set a custom tag for session filtering
   * @param key - Tag key (e.g., "user_role", "plan")
   * @param value - Tag value (e.g., "admin", "pro")
   */
  const setTag = (key: string, value: string) => {
    window.clarity?.("set", key, value);
  };

  return { track, identify, setTag };
}

/**
 * Standalone clarity tracking functions (for use outside React components)
 */
export const clarityTrack = (eventName: string) => {
  window.clarity?.("event", eventName);
};

export const clarityIdentify = (userId: string, sessionId?: string, friendlyName?: string) => {
  window.clarity?.("identify", userId, sessionId || "", "", friendlyName || "");
};

export const claritySetTag = (key: string, value: string) => {
  window.clarity?.("set", key, value);
};
