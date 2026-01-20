import { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Inbox } from '@/types';

interface InboxCardProps {
  inbox: Inbox;
  onPress: (id: string) => void;
}

/**
 * Memoized inbox card component for FlashList performance
 * Displays inbox email address and message count
 */
function InboxCardComponent({ inbox, onPress }: InboxCardProps) {
  const email = `${inbox.localPart}@${inbox.domain?.name || 'unknown'}`;
  const messageCount = inbox._count?.messages ?? 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(inbox.id)}
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
}

export const InboxCard = memo(InboxCardComponent);

const styles = StyleSheet.create({
  card: {
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
});
