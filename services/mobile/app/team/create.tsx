import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { teamsApi } from '@/api/teams';
import { useTheme } from '@/hooks/useTheme';
import { haptics } from '@/utils/haptics';

export default function CreateTeamScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const createMutation = useMutation({
    mutationFn: () => teamsApi.create(name.trim(), description.trim() || undefined),
    onSuccess: (data) => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      router.replace(`/team/${data.team.id}`);
    },
    onError: () => {
      haptics.error();
      Alert.alert('Lỗi', 'Không thể tạo nhóm. Vui lòng thử lại.');
    },
  });

  const handleCreate = () => {
    if (!name.trim()) {
      haptics.warning();
      Alert.alert('Lỗi', 'Vui lòng nhập tên nhóm');
      return;
    }
    haptics.medium();
    createMutation.mutate();
  };

  const isValid = name.trim().length > 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Tạo nhóm mới',
          headerRight: () => (
            <TouchableOpacity
              onPress={handleCreate}
              disabled={!isValid || createMutation.isPending}
              style={styles.headerButton}
            >
              <Text
                style={[
                  styles.headerButtonText,
                  { color: isValid ? theme.primary : theme.textTertiary },
                ]}
              >
                {createMutation.isPending ? 'Đang tạo...' : 'Tạo'}
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.form}>
          {/* Team Icon Preview */}
          <View style={[styles.iconPreview, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="people" size={40} color={theme.primary} />
          </View>

          {/* Name Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Tên nhóm *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surface,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="VD: Marketing Team"
              placeholderTextColor={theme.textTertiary}
              value={name}
              onChangeText={setName}
              autoFocus
              maxLength={50}
            />
          </View>

          {/* Description Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Mô tả (tùy chọn)</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: theme.surface,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Mô tả ngắn về nhóm..."
              placeholderTextColor={theme.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          </View>

          {/* Info */}
          <View style={[styles.infoBox, { backgroundColor: theme.surfaceSecondary }]}>
            <Ionicons name="information-circle" size={20} color={theme.primary} />
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              Sau khi tạo nhóm, bạn có thể mời thành viên và chia sẻ inbox với họ.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    paddingHorizontal: 8,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  form: {
    padding: 20,
  },
  iconPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    gap: 10,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
