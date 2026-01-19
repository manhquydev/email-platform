import { useCallback } from 'react';
import { View, FlatList, RefreshControl, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { messagesApi } from '@/api/messages';
import { inboxesApi } from '@/api/inboxes';
import { MessageItem } from '@/components/MessageItem';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { Message } from '@/types';

const PAGE_SIZE = 20;

export default function InboxDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // Fetch inbox info for header title
  const { data: inboxData } = useQuery({
    queryKey: ['inbox', id],
    queryFn: () => inboxesApi.get(id),
  });

  // Fetch messages with infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['messages', id],
    queryFn: ({ pageParam = 0 }) =>
      messagesApi.list(id, { limit: PAGE_SIZE, offset: pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.flatMap((p) => p.data).length;
      const total = lastPage.meta?.total ?? 0;
      return totalFetched < total ? totalFetched : undefined;
    },
    initialPageParam: 0,
  });

  const messages = data?.pages.flatMap((page) => page.data) ?? [];

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: Message }) => <MessageItem message={item} />,
    []
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footer}>
        <LoadingSpinner size="small" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <EmptyState
        icon="mail-outline"
        title="Chưa có email"
        message="Hộp thư này chưa nhận được email nào"
      />
    );
  };

  const inboxEmail = inboxData?.inbox
    ? `${inboxData.inbox.localPart}@${inboxData.inbox.domain?.name || ''}`
    : 'Inbox';

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: inboxEmail,
          headerTitleStyle: { fontSize: 16 },
        }}
      />

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#8B5CF6"
            />
          }
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={[
            styles.list,
            messages.length === 0 && styles.emptyList,
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  list: {
    flexGrow: 1,
  },
  emptyList: {
    flex: 1,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  footer: {
    paddingVertical: 16,
  },
});
