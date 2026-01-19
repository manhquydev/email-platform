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
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { teamsApi } from '@/api/teams';
import { useTheme } from '@/hooks/useTheme';
import { haptics } from '@/utils/haptics';

const ROLES = [
  { value: 'MEMBER', label: 'Thành viên', desc: 'Xem inbox được chia sẻ' },
  { value: 'ADMIN', label: 'Quản trị', desc: 'Quản lý thành viên và inbox' },
];

export default function AddMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');

  const addMutation = useMutation({
    mutationFn: () => teamsApi.addMember(id!, email.trim(), role),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['team', id, 'members'] });
      router.back();
    },
    onError: (error: any) => {
      haptics.error();
      const message = error?.message || 'Không thể thêm thành viên. Vui lòng thử lại.';
      Alert.alert('Lỗi', message);
    },
  });

  const handleAdd = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      haptics.warning();
      Alert.alert('Lỗi', 'Vui lòng nhập email');
      return;
    }
    // Simple email validation
    if (!trimmedEmail.includes('@')) {
      haptics.warning();
      Alert.alert('Lỗi', 'Email không hợp lệ');
      return;
    }
    haptics.medium();
    addMutation.mutate();
  };

  const isValid = email.trim().length > 0 && email.includes('@');

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Thêm thành viên',
          headerRight: () => (
            <TouchableOpacity
              onPress={handleAdd}
              disabled={!isValid || addMutation.isPending}
              style={styles.headerButton}
            >
              <Text
                style={[
                  styles.headerButtonText,
                  { color: isValid ? theme.primary : theme.textTertiary },
                ]}
              >
                {addMutation.isPending ? 'Đang thêm...' : 'Thêm'}
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
          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Email *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surface,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="email@example.com"
              placeholderTextColor={theme.textTertiary}
              value={email}
              onChangeText={setEmail}
              autoFocus
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          {/* Role Selection */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Vai trò</Text>
            <View style={styles.roleOptions}>
              {ROLES.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  style={[
                    styles.roleOption,
                    {
                      backgroundColor: role === r.value ? theme.primaryLight : theme.surface,
                      borderColor: role === r.value ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => {
                    haptics.selection();
                    setRole(r.value);
                  }}
                >
                  <View style={styles.roleHeader}>
                    <Ionicons
                      name={role === r.value ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={role === r.value ? theme.primary : theme.textTertiary}
                    />
                    <Text
                      style={[
                        styles.roleLabel,
                        { color: role === r.value ? theme.primary : theme.text },
                      ]}
                    >
                      {r.label}
                    </Text>
                  </View>
                  <Text style={[styles.roleDesc, { color: theme.textSecondary }]}>
                    {r.desc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Info */}
          <View style={[styles.infoBox, { backgroundColor: theme.surfaceSecondary }]}>
            <Ionicons name="mail" size={20} color={theme.primary} />
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              Người được mời sẽ nhận email thông báo và có thể truy cập inbox được chia sẻ trong nhóm.
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
  inputGroup: {
    marginBottom: 24,
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
  roleOptions: {
    gap: 12,
  },
  roleOption: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  roleLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  roleDesc: {
    fontSize: 13,
    marginLeft: 28,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
