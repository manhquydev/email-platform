import * as Haptics from 'expo-haptics';

/**
 * Haptic feedback utilities for enhanced UX
 */
export const haptics = {
  /**
   * Light impact - for small UI interactions
   */
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),

  /**
   * Medium impact - for standard button presses
   */
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),

  /**
   * Heavy impact - for significant actions
   */
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),

  /**
   * Success notification - for completed actions
   */
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),

  /**
   * Warning notification - for warnings
   */
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),

  /**
   * Error notification - for errors
   */
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),

  /**
   * Selection changed - for picker/list selection
   */
  selection: () => Haptics.selectionAsync(),
};
