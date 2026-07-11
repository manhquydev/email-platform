/**
 * Keyboard navigation hook for the Tabs primitive (Phase 6).
 * Implements the WAI-ARIA "automatic activation" tablist pattern:
 * ArrowLeft/ArrowRight/Home/End move focus AND switch the active tab.
 * Matches the style of src/hooks/use-keyboard-navigation.ts (Inbox viewer).
 */
import { useCallback } from "react";

interface UseTabsKeyboardNavOptions {
  onChange: (id: string) => void;
}

export function useTabsKeyboardNav({ onChange }: UseTabsKeyboardNavOptions) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;

      const list = e.currentTarget;
      const tabs = Array.from(
        list.querySelectorAll<HTMLElement>('[role="tab"]:not([disabled])')
      );
      if (tabs.length === 0) return;

      const currentIndex = tabs.findIndex((t) => t === document.activeElement);
      let nextIndex = currentIndex;

      switch (e.key) {
        case "ArrowRight":
          nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % tabs.length;
          break;
        case "ArrowLeft":
          nextIndex = currentIndex < 0 ? tabs.length - 1 : (currentIndex - 1 + tabs.length) % tabs.length;
          break;
        case "Home":
          nextIndex = 0;
          break;
        case "End":
          nextIndex = tabs.length - 1;
          break;
      }

      e.preventDefault();
      const nextTab = tabs[nextIndex];
      nextTab.focus();
      const id = nextTab.dataset.tabId;
      if (id) onChange(id);
    },
    [onChange]
  );

  return { handleKeyDown };
}
