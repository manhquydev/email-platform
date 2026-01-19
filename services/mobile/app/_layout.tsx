import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useSSE } from '@/hooks/useSSE';
import { registerBackgroundFetch } from '@/utils/backgroundFetch';
import { useNotificationStore } from '@/store/notificationStore';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useThemeStore } from '@/store/themeStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

function RootLayoutNav() {
  const { isAuthenticated, isLoading, checkAuth } = useAuth();

  // Initialize push notifications
  useNotifications();

  // Initialize SSE real-time connection
  useSSE();

  // Initialize offline sync
  useOfflineSync();

  // Load notification settings and register background fetch
  const { loadSettings, fetchUnreadCount } = useNotificationStore();
  const { loadTheme } = useThemeStore();

  useEffect(() => {
    checkAuth();
    loadSettings();
    loadTheme();
    registerBackgroundFetch();
  }, []);

  // Fetch unread count when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return null; // Or splash screen
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="inbox/[id]" options={{ headerShown: true, title: 'Inbox' }} />
            <Stack.Screen name="message/[id]" options={{ headerShown: true, title: 'Message' }} />
          </>
        ) : (
          <Stack.Screen name="(auth)" />
        )}
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <RootLayoutNav />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
