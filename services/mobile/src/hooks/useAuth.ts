import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    pending2FAToken,
    login,
    verify2FA,
    register,
    logout,
    checkAuth,
    clearError,
    clear2FA,
  } = useAuthStore();

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    pending2FAToken,
    login,
    verify2FA,
    register,
    logout,
    checkAuth,
    clearError,
    clear2FA,
  };
}
