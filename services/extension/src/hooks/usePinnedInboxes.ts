/**
 * Hook for managing pinned inbox state in browser.storage.local
 * Provides pin/unpin functionality with persistence across popup opens
 */
import { useState, useEffect } from 'react';
import browser from 'webextension-polyfill';

const STORAGE_KEY = 'pinned_inbox_ids';

export function usePinnedInboxes() {
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load pinned IDs from storage on mount
    browser.storage.local.get(STORAGE_KEY).then((result) => {
      const stored = result[STORAGE_KEY];
      const ids: string[] = Array.isArray(stored) ? stored : [];
      setPinnedIds(new Set(ids));
    });
  }, []);

  const togglePin = async (inboxId: string) => {
    const newPinned = new Set(pinnedIds);
    if (newPinned.has(inboxId)) {
      newPinned.delete(inboxId);
    } else {
      newPinned.add(inboxId);
    }
    setPinnedIds(newPinned);
    await browser.storage.local.set({ [STORAGE_KEY]: Array.from(newPinned) });
  };

  const isPinned = (inboxId: string) => pinnedIds.has(inboxId);

  return { pinnedIds, togglePin, isPinned };
}
