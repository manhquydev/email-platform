import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { aiApi } from '@/api/ai';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/hooks/useTheme';
import { haptics } from '@/utils/haptics';

interface AISummaryCardProps {
  messageId: string;
  existingSummary?: string;
}

export function AISummaryCard({ messageId, existingSummary }: AISummaryCardProps) {
  const theme = useTheme();
  const [summary, setSummary] = useState(existingSummary);
  const user = useAuthStore((s) => s.user);

  // Check tier access
  const hasTierAccess = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(user?.tier || '');

  // Fetch credits
  const { data: creditsData } = useQuery({
    queryKey: ['credits'],
    queryFn: aiApi.getCredits,
    enabled: hasTierAccess,
  });

  // Summarize mutation
  const summarizeMutation = useMutation({
    mutationFn: () => aiApi.summarize(messageId),
    onSuccess: (data) => {
      setSummary(data.summary);
      haptics.success();
    },
    onError: () => {
      haptics.error();
    },
  });

  // Show upgrade card for FREE users
  if (!hasTierAccess) {
    return (
      <View style={[styles.upgradeCard, { backgroundColor: theme.surfaceSecondary }]}>
        <Ionicons name="sparkles" size={20} color={theme.primary} />
        <Text style={[styles.upgradeText, { color: theme.textSecondary }]}>
          Nâng cấp lên Starter để sử dụng AI tóm tắt
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={20} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>Tóm tắt AI</Text>
        {creditsData && (
          <Text style={[styles.credits, { color: theme.textSecondary }]}>
            {creditsData.credits} credits
          </Text>
        )}
      </View>

      {summary ? (
        <Text style={[styles.summary, { color: theme.text }]}>{summary}</Text>
      ) : (
        <TouchableOpacity
          style={[styles.generateButton, { borderColor: theme.primary }]}
          onPress={() => {
            haptics.medium();
            summarizeMutation.mutate();
          }}
          disabled={summarizeMutation.isPending}
        >
          {summarizeMutation.isPending ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <>
              <Ionicons name="flash" size={16} color={theme.primary} />
              <Text style={[styles.generateText, { color: theme.primary }]}>
                Tạo tóm tắt (1 credit)
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {summarizeMutation.isError && (
        <Text style={[styles.error, { color: theme.error }]}>
          Không thể tạo tóm tắt. Vui lòng thử lại.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  upgradeCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  upgradeText: {
    flex: 1,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  credits: {
    fontSize: 12,
  },
  summary: {
    fontSize: 14,
    lineHeight: 22,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    gap: 8,
  },
  generateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  error: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
});
