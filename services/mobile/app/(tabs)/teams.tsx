import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { teamsApi } from '@/api/teams';
import { useTheme } from '@/hooks/useTheme';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import type { Team } from '@/types';

export default function TeamsScreen() {
  const theme = useTheme();
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['teams'],
    queryFn: teamsApi.list,
  });

  const teams = data?.teams || [];

  const renderTeam = ({ item }: { item: Team }) => (
    <TouchableOpacity
      style={[styles.teamCard, { backgroundColor: theme.surface }]}
      onPress={() => router.push(`/team/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={[styles.teamIcon, { backgroundColor: theme.primaryLight }]}>
        <Ionicons name="people" size={24} color={theme.primary} />
      </View>
      <View style={styles.teamInfo}>
        <Text style={[styles.teamName, { color: theme.text }]}>{item.name}</Text>
        {item.description && (
          <Text style={[styles.teamDesc, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.description}
          </Text>
        )}
        <Text style={[styles.memberCount, { color: theme.textTertiary }]}>
          {item.memberCount || 0} thành viên
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
    </TouchableOpacity>
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Nhóm</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={() => router.push('/team/create')}
        >
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {teams.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="Chưa có nhóm nào"
          description="Tạo nhóm để chia sẻ inbox với đồng nghiệp"
        />
      ) : (
        <FlatList
          data={teams}
          keyExtractor={(item) => item.id}
          renderItem={renderTeam}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  teamIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  teamDesc: {
    fontSize: 14,
    marginBottom: 2,
  },
  memberCount: {
    fontSize: 12,
  },
});
