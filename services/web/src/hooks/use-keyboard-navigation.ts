/**
 * Keyboard Navigation Hook for Inbox Viewer
 * Provides j/k navigation, Enter to open, Esc to close
 * Superhuman-style keyboard shortcuts
 */
import { useEffect, useCallback, useRef } from "react";

interface UseKeyboardNavigationOptions {
  itemCount: number;
  onSelect: (index: number) => void;
  onEnter: (index: number) => void;
  onEscape: () => void;
  onRefresh?: () => void;
  onOpenCommandPalette?: () => void;
  enabled?: boolean;
}

export function useKeyboardNavigation({
  itemCount,
  onSelect,
  onEnter,
  onEscape,
  onRefresh,
  onOpenCommandPalette,
  enabled = true,
}: UseKeyboardNavigationOptions) {
  const focusedIndexRef = useRef(0);

  // Check if user is typing in an input field
  const isInputFocused = useCallback(() => {
    const active = document.activeElement;
    return (
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      active?.getAttribute("contenteditable") === "true"
    );
  }, []);

  // Clamp focused index when item count changes
  useEffect(() => {
    if (focusedIndexRef.current >= itemCount && itemCount > 0) {
      focusedIndexRef.current = itemCount - 1;
    }
  }, [itemCount]);

  useEffect(() => {
    if (!enabled || itemCount === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing
      if (isInputFocused()) return;

      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          focusedIndexRef.current = Math.min(
            focusedIndexRef.current + 1,
            itemCount - 1
          );
          onSelect(focusedIndexRef.current);
          break;

        case "ArrowUp":
          e.preventDefault();
          focusedIndexRef.current = Math.max(focusedIndexRef.current - 1, 0);
          onSelect(focusedIndexRef.current);
          break;

        case "Enter":
          e.preventDefault();
          onEnter(focusedIndexRef.current);
          break;

        case "Escape":
          e.preventDefault();
          onEscape();
          break;

        case "r":
          if (onRefresh) {
            e.preventDefault();
            onRefresh();
          }
          break;

        case "k":
          // Cmd+K / Ctrl+K opens command palette
          if ((e.metaKey || e.ctrlKey) && onOpenCommandPalette) {
            e.preventDefault();
            onOpenCommandPalette();
          } else if (!e.metaKey && !e.ctrlKey) {
            // Plain 'k' for navigation up
            e.preventDefault();
            focusedIndexRef.current = Math.max(focusedIndexRef.current - 1, 0);
            onSelect(focusedIndexRef.current);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, itemCount, onSelect, onEnter, onEscape, onRefresh, onOpenCommandPalette, isInputFocused]);

  const setFocusedIndex = useCallback((index: number) => {
    focusedIndexRef.current = index;
  }, []);

  return { setFocusedIndex, getFocusedIndex: () => focusedIndexRef.current };
}
