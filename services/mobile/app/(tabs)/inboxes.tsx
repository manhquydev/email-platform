import { useCallback } from 'react';
import { View, Text, RefreshControl, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/api/client';
import { InboxCard } from '@/components/InboxCard';
import { InboxListSkeleton } from '@/components/InboxListSkeleton';
import type { Inbox, PaginatedResponse } from '@/types';

/** Stable separator component to avoid re-renders */
const ItemSeparator = () => <View style={styles.separator} />;

export default function InboxesScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['inboxes'],
    queryFn: () => api.request<PaginatedResponse<Inbox>>('/inboxes'),
  });

  const handleInboxPress = useCallback((id: string) => {
    router.push(`/inbox/${id}`);
  }, []);

  const renderInbox = useCallback(
    ({ item }: { item: Inbox }) => (
      <InboxCard inbox={item} onPress={handleInboxPress} />
    ),
    [handleInboxPress]
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="mail-open-outline" size={64} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>Chưa có hộp thư</Text>
        <Text style={styles.emptyText}>
          Tạo hộp thư đầu tiên của bạn để nhận email
        </Text>
      </View>
    );
  }, [isLoading]);

  // Show skeleton while loading
  if (isLoading) {
    return (
      <View style={styles.container}>
        <InboxListSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={data?.data}
        keyExtractor={(item) => item.id}
        renderItem={renderInbox}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#8B5CF6"
          />
        }
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={ItemSeparator}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  list: {
    padding: 16,
  },
  separator: {
    height: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
