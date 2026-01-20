import { View, StyleSheet } from 'react-native';

/**
 * Skeleton loading state for inbox list
 * Shows placeholder cards while data is loading
 */
export function InboxListSkeleton() {
  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.card}>
          <View style={styles.avatar} />
          <View style={styles.content}>
            <View style={styles.title} />
            <View style={styles.subtitle} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    marginRight: 12,
  },
  content: {
    flex: 1,
    gap: 8,
  },
  title: {
    height: 16,
    width: '70%',
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  subtitle: {
    height: 12,
    width: '40%',
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
  },
});
