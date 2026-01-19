import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationStore } from '@/store/notificationStore';
import { useTheme, useThemeMode } from '@/hooks/useTheme';
import { BiometricAuth } from '@/utils/biometrics';
import { haptics } from '@/utils/haptics';
import type { ThemeMode } from '@/store/themeStore';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const { mode, setMode } = useThemeMode();
  const { settings, updateSettings, unreadCount } = useNotificationStore();
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    checkBiometric();
  }, []);

  const checkBiometric = async () => {
    const available = await BiometricAuth.isAvailable();
    setBiometricAvailable(available);
    if (available) {
      const enabled = await BiometricAuth.isEnabled();
      setBiometricEnabled(enabled);
    }
  };

  const handleThemeChange = async (newMode: ThemeMode) => {
    haptics.selection();
    await setMode(newMode);
  };

  const handleBiometricToggle = async (value: boolean) => {
    haptics.light();
    if (value) {
      const success = await BiometricAuth.authenticate();
      if (success) {
        setBiometricEnabled(true);
        haptics.success();
      }
    } else {
      await BiometricAuth.disableBiometric();
      setBiometricEnabled(false);
    }
  };

  const handleLogout = () => {
    haptics.warning();
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc muốn đăng xuất?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const getThemeModeLabel = () => {
    switch (mode) {
      case 'light': return 'Sáng';
      case 'dark': return 'Tối';
      default: return 'Hệ thống';
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Account Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Tài khoản</Text>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={[styles.avatar, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="person" size={32} color={theme.primary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.email, { color: theme.text }]}>{user?.email}</Text>
            <Text style={[styles.tier, { color: theme.primary }]}>{user?.tier || 'FREE'} Plan</Text>
          </View>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.error }]}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Appearance Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Giao diện</Text>

        <View style={[styles.themeSelector, { backgroundColor: theme.surface }]}>
          <Text style={[styles.themeSelectorLabel, { color: theme.text }]}>Chế độ hiển thị</Text>
          <View style={styles.themeButtons}>
            {(['light', 'system', 'dark'] as ThemeMode[]).map((themeMode) => (
              <TouchableOpacity
                key={themeMode}
                style={[
                  styles.themeButton,
                  { backgroundColor: mode === themeMode ? theme.primary : theme.surfaceSecondary },
                ]}
                onPress={() => handleThemeChange(themeMode)}
              >
                <Ionicons
                  name={themeMode === 'light' ? 'sunny' : themeMode === 'dark' ? 'moon' : 'phone-portrait'}
                  size={18}
                  color={mode === themeMode ? '#FFF' : theme.textSecondary}
                />
                <Text style={[
                  styles.themeButtonText,
                  { color: mode === themeMode ? '#FFF' : theme.textSecondary },
                ]}>
                  {themeMode === 'light' ? 'Sáng' : themeMode === 'dark' ? 'Tối' : 'Hệ thống'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Thông báo</Text>

        <View style={[styles.row, { backgroundColor: theme.surface, borderBottomColor: theme.borderLight }]}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBox, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="notifications" size={20} color={theme.primary} />
            </View>
            <Text style={[styles.rowText, { color: theme.text }]}>Thông báo đẩy</Text>
          </View>
          <Switch
            value={settings.pushEnabled}
            onValueChange={(v) => { haptics.light(); updateSettings({ pushEnabled: v }); }}
            trackColor={{ true: theme.primary }}
          />
        </View>

        <View style={[styles.row, { backgroundColor: theme.surface, borderBottomColor: theme.borderLight }]}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="volume-high" size={20} color="#3B82F6" />
            </View>
            <Text style={[styles.rowText, { color: theme.text }]}>Âm thanh</Text>
          </View>
          <Switch
            value={settings.soundEnabled}
            onValueChange={(v) => { haptics.light(); updateSettings({ soundEnabled: v }); }}
            trackColor={{ true: theme.primary }}
          />
        </View>

        <View style={[styles.row, { backgroundColor: theme.surface, borderBottomColor: theme.borderLight }]}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#FCE7F3' }]}>
              <Ionicons name="ellipse" size={20} color="#EC4899" />
            </View>
            <Text style={[styles.rowText, { color: theme.text }]}>Hiển thị badge</Text>
          </View>
          <Switch
            value={settings.badgeEnabled}
            onValueChange={(v) => { haptics.light(); updateSettings({ badgeEnabled: v }); }}
            trackColor={{ true: theme.primary }}
          />
        </View>
      </View>

      {/* Security Section */}
      {biometricAvailable && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Bảo mật</Text>

          <View style={[styles.row, { backgroundColor: theme.surface, borderBottomColor: theme.borderLight }]}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="finger-print" size={20} color="#059669" />
              </View>
              <Text style={[styles.rowText, { color: theme.text }]}>Sinh trắc học</Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              trackColor={{ true: theme.primary }}
            />
          </View>
        </View>
      )}

      {/* About Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Thông tin</Text>

        <TouchableOpacity
          style={[styles.row, { backgroundColor: theme.surface, borderBottomColor: theme.borderLight }]}
          onPress={() => haptics.light()}
        >
          <View style={styles.rowLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="help-circle" size={20} color="#DC2626" />
            </View>
            <Text style={[styles.rowText, { color: theme.text }]}>Trợ giúp</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
        </TouchableOpacity>

        <View style={[styles.row, { backgroundColor: theme.surface, borderBottomColor: theme.borderLight }]}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBox, { backgroundColor: theme.surfaceSecondary }]}>
              <Ionicons name="information-circle" size={20} color={theme.textSecondary} />
            </View>
            <Text style={[styles.rowText, { color: theme.text }]}>Phiên bản</Text>
          </View>
          <Text style={[styles.version, { color: theme.textTertiary }]}>1.0.0</Text>
        </View>
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: theme.surface }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out" size={20} color={theme.error} />
          <Text style={[styles.logoutText, { color: theme.error }]}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  tier: {
    fontSize: 14,
    fontWeight: '500',
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  themeSelector: {
    borderRadius: 12,
    padding: 16,
  },
  themeSelectorLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  themeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  themeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  themeButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowText: {
    fontSize: 16,
  },
  version: {
    fontSize: 14,
  },
  logoutButton: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    height: 40,
  },
});
