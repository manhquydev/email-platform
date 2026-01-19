import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { teamsApi } from '@/api/teams';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { haptics } from '@/utils/haptics';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { TeamMember, TeamInbox } from '@/types';

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<'members' | 'inboxes'>('members');

  // Fetch team details
  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: ['team', id],
    queryFn: () => teamsApi.get(id!),
    enabled: !!id,
  });

  // Fetch members
  const { data: membersData, refetch: refetchMembers, isRefetching: membersRefetching } = useQuery({
    queryKey: ['team', id, 'members'],
    queryFn: () => teamsApi.getMembers(id!),
    enabled: !!id,
  });

  // Fetch shared inboxes
  const { data: inboxesData, refetch: refetchInboxes, isRefetching: inboxesRefetching } = useQuery({
    queryKey: ['team', id, 'inboxes'],
    queryFn: () => teamsApi.getSharedInboxes(id!),
    enabled: !!id,
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => teamsApi.removeMember(id!, memberId),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['team', id, 'members'] });
    },
    onError: () => {
      haptics.error();
      Alert.alert('Lỗi', 'Không thể xóa thành viên');
    },
  });

  const team = teamData?.team;
  const members = membersData?.members || [];
  const inboxes = inboxesData?.inboxes || [];

  const isOwner = team?.ownerId === currentUser?.id;

  const handleRemoveMember = (member: TeamMember) => {
    haptics.warning();
    Alert.alert(
      'Xóa thành viên',
      `Bạn có chắc muốn xóa ${member.email} khỏi nhóm?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => removeMemberMutation.mutate(member.id),
        },
      ]
    );
  };

  const renderMember = ({ item }: { item: TeamMember }) => (
    <View style={[styles.memberCard, { backgroundColor: theme.surface }]}>
      <View style={[styles.avatar, { backgroundColor: theme.primaryLight }]}>
        <Ionicons name="person" size={20} color={theme.primary} />
      </View>
      <View style={styles.memberInfo}>
        <Text style={[styles.memberEmail, { color: theme.text }]}>{item.email}</Text>
        <Text style={[styles.memberRole, { color: theme.textSecondary }]}>{item.role}</Text>
      </View>
      {isOwner && item.userId !== currentUser?.id && (
        <TouchableOpacity onPress={() => handleRemoveMember(item)}>
          <Ionicons name="close-circle" size={24} color={theme.error} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderInbox = ({ item }: { item: TeamInbox }) => (
    <TouchableOpacity
      style={[styles.inboxCard, { backgroundColor: theme.surface }]}
      onPress={() => router.push(`/inbox/${item.inboxId}`)}
    >
      <View style={[styles.inboxIcon, { backgroundColor: theme.surfaceSecondary }]}>
        <Ionicons name="mail" size={20} color={theme.primary} />
      </View>
      <View style={styles.inboxInfo}>
        <Text style={[styles.inboxEmail, { color: theme.text }]}>{item.email}</Text>
        <Text style={[styles.sharedBy, { color: theme.textTertiary }]}>
          Chia sẻ bởi {item.sharedByEmail}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
    </TouchableOpacity>
  );

  if (teamLoading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <Stack.Screen options={{ title: team?.name || 'Nhóm' }} />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Team Header */}
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          <View style={[styles.teamIcon, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="people" size={32} color={theme.primary} />
          </View>
          <Text style={[styles.teamName, { color: theme.text }]}>{team?.name}</Text>
          {team?.description && (
            <Text style={[styles.teamDesc, { color: theme.textSecondary }]}>{team.description}</Text>
          )}
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: theme.surface }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'members' && { borderBottomColor: theme.primary }]}
            onPress={() => setActiveTab('members')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'members' ? theme.primary : theme.textSecondary }]}>
              Thành viên ({members.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'inboxes' && { borderBottomColor: theme.primary }]}
            onPress={() => setActiveTab('inboxes')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'inboxes' ? theme.primary : theme.textSecondary }]}>
              Inbox ({inboxes.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === 'members' ? (
          <FlatList
            data={members}
            keyExtractor={(item) => item.id}
            renderItem={renderMember}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={membersRefetching} onRefresh={refetchMembers} />
            }
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Chưa có thành viên
              </Text>
            }
          />
        ) : (
          <FlatList
            data={inboxes}
            keyExtractor={(item) => item.id}
            renderItem={renderInbox}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={inboxesRefetching} onRefresh={refetchInboxes} />
            }
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Chưa có inbox được chia sẻ
              </Text>
            }
          />
        )}

        {/* Add Member FAB (for owners) */}
        {isOwner && activeTab === 'members' && (
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: theme.primary }]}
            onPress={() => {
              haptics.medium();
              router.push(`/team/${id}/add-member`);
            }}
          >
            <Ionicons name="person-add" size={24} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 24,
  },
  teamIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  teamDesc: {
    fontSize: 14,
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    marginTop: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberEmail: {
    fontSize: 15,
    fontWeight: '500',
  },
  memberRole: {
    fontSize: 13,
  },
  inboxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  inboxIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  inboxInfo: {
    flex: 1,
  },
  inboxEmail: {
    fontSize: 15,
    fontWeight: '500',
  },
  sharedBy: {
    fontSize: 12,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
