import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatRelativeTime } from '@/utils/format';
import type { Message } from '@/types';

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  const handlePress = () => {
    router.push(`/message/${message.id}`);
  };

  const hasAttachments = message.attachments && message.attachments.length > 0;

  return (
    <TouchableOpacity
      style={[styles.container, !message.isRead && styles.unread]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Unread indicator */}
      {!message.isRead && <View style={styles.unreadDot} />}

      <View style={styles.content}>
        {/* Header: From + Time */}
        <View style={styles.header}>
          <Text
            style={[styles.from, !message.isRead && styles.unreadText]}
            numberOfLines={1}
          >
            {message.fromAddress || 'Unknown'}
          </Text>
          <Text style={styles.time}>
            {formatRelativeTime(message.receivedAt)}
          </Text>
        </View>

        {/* Subject */}
        <Text
          style={[styles.subject, !message.isRead && styles.unreadText]}
          numberOfLines={1}
        >
          {message.subject || '(Không có tiêu đề)'}
        </Text>

        {/* Preview */}
        <Text style={styles.preview} numberOfLines={2}>
          {message.textBody?.substring(0, 150) || ''}
        </Text>

        {/* Attachments badge */}
        {hasAttachments && (
          <View style={styles.attachmentBadge}>
            <Ionicons name="attach" size={14} color="#6B7280" />
            <Text style={styles.attachmentCount}>
              {message.attachments.length}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    paddingLeft: 24,
    flexDirection: 'row',
    position: 'relative',
  },
  unread: {
    backgroundColor: '#FAFBFF',
  },
  unreadDot: {
    position: 'absolute',
    left: 8,
    top: 22,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B5CF6',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  from: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
    marginRight: 8,
  },
  unreadText: {
    fontWeight: '600',
    color: '#111827',
  },
  time: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  subject: {
    fontSize: 15,
    color: '#374151',
    marginBottom: 4,
  },
  preview: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  attachmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  attachmentCount: {
    fontSize: 12,
    color: '#6B7280',
  },
});
