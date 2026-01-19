import { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import RenderHtml from 'react-native-render-html';
import { Ionicons } from '@expo/vector-icons';
import { messagesApi } from '@/api/messages';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { AISummaryCard } from '@/components/AISummaryCard';
import { useTheme } from '@/hooks/useTheme';
import { haptics } from '@/utils/haptics';
import { formatDateTime, formatFileSize } from '@/utils/format';
import type { Attachment } from '@/types';

export default function MessageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const queryClient = useQueryClient();
  const theme = useTheme();

  const { data, isLoading, error } = useQuery({
    queryKey: ['message', id],
    queryFn: () => messagesApi.get(id),
  });

  // Auto-mark as read
  const markReadMutation = useMutation({
    mutationFn: () => messagesApi.markRead(id, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['inboxes'] });
    },
  });

  useEffect(() => {
    if (data?.message && !data.message.isRead) {
      markReadMutation.mutate();
    }
  }, [data?.message?.id]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => messagesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['inboxes'] });
      router.back();
    },
  });

  const handleDelete = () => {
    haptics.warning();
    Alert.alert('Xóa email', 'Bạn có chắc muốn xóa email này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(),
      },
    ]);
  };

  // HTML styles
  const htmlTagStyles = useMemo(
    () => ({
      body: { color: '#374151', fontSize: 15, lineHeight: 24 },
      a: { color: '#8B5CF6' },
      p: { marginVertical: 8 },
    }),
    []
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !data?.message) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="Lỗi"
        message="Không thể tải email"
      />
    );
  }

  const message = data.message;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerRight: () => (
            <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
              <Ionicons name="trash-outline" size={22} color="#EF4444" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Subject */}
        <Text style={styles.subject}>
          {message.subject || '(Không có tiêu đề)'}
        </Text>

        {/* Meta info */}
        <View style={styles.meta}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Từ:</Text>
            <Text style={styles.metaValue} numberOfLines={1}>
              {message.fromAddress || 'Unknown'}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Đến:</Text>
            <Text style={styles.metaValue} numberOfLines={1}>
              {message.toAddress || '-'}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Ngày:</Text>
            <Text style={styles.metaValue}>
              {formatDateTime(message.receivedAt)}
            </Text>
          </View>
        </View>

        {/* AI Summary Card */}
        <AISummaryCard messageId={id} existingSummary={message.aiSummary ?? undefined} />

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <View style={styles.attachments}>
            <Text style={styles.attachmentsTitle}>
              Tệp đính kèm ({message.attachments.length})
            </Text>
            {message.attachments.map((att: Attachment) => (
              <TouchableOpacity key={att.id} style={styles.attachmentItem}>
                <Ionicons name="document-outline" size={20} color="#6B7280" />
                <View style={styles.attachmentInfo}>
                  <Text style={styles.attachmentName} numberOfLines={1}>
                    {att.filename}
                  </Text>
                  <Text style={styles.attachmentSize}>
                    {formatFileSize(att.size || 0)}
                  </Text>
                </View>
                <Ionicons name="download-outline" size={20} color="#8B5CF6" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Email body */}
        <View style={styles.body}>
          {message.htmlBody ? (
            <RenderHtml
              contentWidth={width - 32}
              source={{ html: message.htmlBody }}
              tagsStyles={htmlTagStyles}
            />
          ) : (
            <Text style={styles.textBody}>{message.textBody || ''}</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  headerButton: {
    padding: 8,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  subject: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    lineHeight: 28,
  },
  meta: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
  },
  metaLabel: {
    fontSize: 14,
    color: '#6B7280',
    width: 50,
  },
  metaValue: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  attachments: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  attachmentsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 14,
    color: '#374151',
  },
  attachmentSize: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  body: {
    paddingTop: 8,
  },
  textBody: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
});
