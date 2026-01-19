import { useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesApi } from '@/api/messages';
import { OfflineCache } from '@/utils/offlineCache';
import type { Message } from '@/types';

/**
 * Hook for optimistic mark as read with offline support
 */
export function useOptimisticMarkRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      isRead,
    }: {
      messageId: string;
      isRead: boolean;
    }) => {
      return messagesApi.markRead(messageId, isRead);
    },

    onMutate: async ({ messageId, isRead }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['message', messageId] });

      // Snapshot previous value
      const previousMessage = queryClient.getQueryData(['message', messageId]);

      // Optimistically update the cache
      queryClient.setQueryData(
        ['message', messageId],
        (old: { message: Message } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            message: { ...old.message, isRead },
          };
        }
      );

      return { previousMessage };
    },

    onError: (_err, { messageId }, context) => {
      // Rollback on error
      if (context?.previousMessage) {
        queryClient.setQueryData(['message', messageId], context.previousMessage);
      }
    },

    onSettled: (_data, _error, { messageId }) => {
      // Refetch to ensure sync with server
      queryClient.invalidateQueries({ queryKey: ['message', messageId] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

/**
 * Hook for optimistic delete with offline support
 */
export function useOptimisticDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      return messagesApi.delete(messageId);
    },

    onMutate: async (messageId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['messages'] });

      // Snapshot previous messages (for all inbox queries)
      const previousQueries = queryClient.getQueriesData({ queryKey: ['messages'] });

      // Optimistically remove from all message lists
      queryClient.setQueriesData(
        { queryKey: ['messages'] },
        (old: { pages: { data: Message[] }[] } | undefined) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.filter((m) => m.id !== messageId),
            })),
          };
        }
      );

      return { previousQueries };
    },

    onError: (_err, _messageId, context) => {
      // Rollback on error
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    onSettled: () => {
      // Refetch to ensure sync with server
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['inboxes'] });
    },
  });
}
