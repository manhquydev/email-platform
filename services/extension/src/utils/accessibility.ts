import { useEffect, useRef } from 'react';

/**
 * Custom hook to trap focus within a container element.
 * Useful for modals, dialogs, and other overlay components.
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstElement.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  return containerRef;
}

/**
 * Custom hook for keyboard navigation in lists.
 * Supports arrow keys for navigation and Enter/Space for selection.
 */
export function useListNavigation<T>(
  items: T[],
  onSelect: (item: T, index: number) => void
) {
  const listRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < items.length - 1) {
          const nextItem = listRef.current?.querySelectorAll<HTMLElement>('[role="option"], [role="listitem"]')[currentIndex + 1];
          nextItem?.focus();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          const prevItem = listRef.current?.querySelectorAll<HTMLElement>('[role="option"], [role="listitem"]')[currentIndex - 1];
          prevItem?.focus();
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect(items[currentIndex], currentIndex);
        break;
      case 'Home':
        e.preventDefault();
        const firstItem = listRef.current?.querySelectorAll<HTMLElement>('[role="option"], [role="listitem"]')[0];
        firstItem?.focus();
        break;
      case 'End':
        e.preventDefault();
        const lastItem = listRef.current?.querySelectorAll<HTMLElement>('[role="option"], [role="listitem"]')[items.length - 1];
        lastItem?.focus();
        break;
    }
  };

  return { listRef, handleKeyDown };
}

/**
 * Announce a message to screen readers using ARIA live region.
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement is made
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Screen reader only class for visually hidden but accessible content.
 * Add this to your global CSS:
 * .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
 */
