/**
 * useOptimisticUpdate - Hook for optimistic UI updates
 *
 * Updates UI immediately, then syncs with server.
 * Rolls back on error.
 */
import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

interface OptimisticOptions<T> {
  /** Function to call API */
  mutate: () => Promise<T>;
  /** Optimistic update to apply immediately */
  optimisticUpdate: () => void;
  /** Rollback function if API fails */
  rollback: () => void;
  /** Success message (optional) */
  successMessage?: string;
  /** Error message */
  errorMessage?: string;
}

export function useOptimisticUpdate() {
  const [isPending, setIsPending] = useState(false);

  const execute = useCallback(async <T>({
    mutate,
    optimisticUpdate,
    rollback,
    successMessage,
    errorMessage = 'Operation failed',
  }: OptimisticOptions<T>): Promise<T | null> => {
    // Apply optimistic update immediately
    optimisticUpdate();
    setIsPending(true);

    try {
      const result = await mutate();
      if (successMessage) {
        toast.success(successMessage);
      }
      return result;
    } catch (error) {
      // Rollback on error
      rollback();
      toast.error(errorMessage);
      console.error('Optimistic update failed:', error);
      return null;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { execute, isPending };
}

/**
 * Helper for common message operations
 */
export function useMessageOptimistic<T extends { id: string }>(
  messages: T[],
  setMessages: React.Dispatch<React.SetStateAction<T[]>>
) {
  const { execute, isPending } = useOptimisticUpdate();

  const updateMessage = useCallback(
    async (
      messageId: string,
      update: Partial<T>,
      mutate: () => Promise<unknown>,
      errorMessage = 'Failed to update message'
    ) => {
      const originalMessage = messages.find(m => m.id === messageId);
      if (!originalMessage) return;

      return execute({
        mutate: mutate as () => Promise<unknown>,
        optimisticUpdate: () => {
          setMessages(prev =>
            prev.map(m => (m.id === messageId ? { ...m, ...update } : m))
          );
        },
        rollback: () => {
          setMessages(prev =>
            prev.map(m => (m.id === messageId ? originalMessage : m))
          );
        },
        errorMessage,
      });
    },
    [messages, setMessages, execute]
  );

  const deleteMessage = useCallback(
    async (messageId: string, mutate: () => Promise<unknown>) => {
      const originalMessages = [...messages];

      return execute({
        mutate: mutate as () => Promise<unknown>,
        optimisticUpdate: () => {
          setMessages(prev => prev.filter(m => m.id !== messageId));
        },
        rollback: () => {
          setMessages(originalMessages);
        },
        errorMessage: 'Failed to delete message',
      });
    },
    [messages, setMessages, execute]
  );

  return { updateMessage, deleteMessage, isPending };
}
