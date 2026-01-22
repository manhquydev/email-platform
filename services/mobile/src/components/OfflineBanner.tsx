import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

/** Offline banner component - shows when device is offline */
function OfflineBannerComponent() {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline" size={16} color="#FFF" />
      <Text style={styles.text}>Chế độ offline - Dữ liệu có thể không cập nhật</Text>
    </View>
  );
}

export const OfflineBanner = memo(OfflineBannerComponent);

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#6B7280',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  text: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
  },
});
