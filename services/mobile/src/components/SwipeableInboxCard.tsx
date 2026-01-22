import { memo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { haptics } from '@/utils/haptics';
import type { Inbox } from '@/types';

interface SwipeableInboxCardProps {
  inbox: Inbox;
  onPress: (id: string) => void;
  onDelete?: (id: string) => void;
}

/** Swipeable inbox card with delete action */
function SwipeableInboxCardComponent({ inbox, onPress, onDelete }: SwipeableInboxCardProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const domainName = inbox.domain?.name || 'unknown';
  const email = `${inbox.localPart}@${domainName}`;
  const messageCount = inbox._count?.messages ?? 0;

  const handleDelete = () => {
    haptics.warning();
    swipeableRef.current?.close();
    onDelete?.(inbox.id);
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity style={styles.deleteAction} onPress={handleDelete}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="trash" size={24} color="#FFF" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={() => onPress(inbox.id)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="mail" size={24} color="#8B5CF6" />
        </View>
        <View style={styles.content}>
          <Text style={styles.email} numberOfLines={1}>{email}</Text>
          <Text style={styles.meta}>{messageCount} tin nhan</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    </Swipeable>
  );
}

export const SwipeableInboxCard = memo(SwipeableInboxCardComponent);

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
  content: { flex: 1 },
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
  deleteAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 12,
    marginLeft: 8,
  },
});
