import { View, Text, FlatList, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/api/client';
import type { Inbox, PaginatedResponse } from '@/types';

export default function InboxesScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['inboxes'],
    queryFn: () => api.request<PaginatedResponse<Inbox>>('/inboxes'),
  });

  const handleInboxPress = (id: string) => {
    router.push(`/inbox/${id}`);
  };

  const renderInbox = ({ item }: { item: Inbox }) => {
    const email = `${item.localPart}@${item.domain?.name || 'unknown'}`;
    const messageCount = item._count?.messages ?? 0;

    return (
      <TouchableOpacity
        style={styles.inboxCard}
        onPress={() => handleInboxPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="mail" size={24} color="#8B5CF6" />
        </View>
        <View style={styles.content}>
          <Text style={styles.email} numberOfLines={1}>
            {email}
          </Text>
          <Text style={styles.meta}>
            {messageCount} tin nhắn
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
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
  };

  return (
    <View style={styles.container}>
      <FlatList
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
        contentContainerStyle={[
          styles.list,
          !data?.data?.length && styles.emptyList,
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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
  emptyList: {
    flex: 1,
  },
  inboxCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  meta: {
    fontSize: 14,
    color: '#6B7280',
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
