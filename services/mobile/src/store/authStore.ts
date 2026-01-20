import { create } from 'zustand';
import { api } from '@/api/client';
import { authApi } from '@/api/auth';
import { ApiError } from '@/api/client';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  /** Temporary token for 2FA verification */
  pending2FAToken: string | null;

  // Actions
  login: (email: string, password: string) => Promise<{ requires2FA: boolean }>;
  verify2FA: (code: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  clear2FA: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  pending2FAToken: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null, pending2FAToken: null });
    try {
      const response = await authApi.login(email, password);
      
      // Check if 2FA is required
      if (response.requires2FA) {
        set({ isLoading: false, pending2FAToken: response.token });
        return { requires2FA: true };
      }

      await api.setTokens(response.token, response.refreshToken);
      set({ user: response.user, isAuthenticated: true, isLoading: false });
      return { requires2FA: false };
    } catch (error) {
      // Check for 2FA requirement in error response
      if (error instanceof ApiError && error.requires2FA) {
        set({ isLoading: false, pending2FAToken: (error as any).tempToken });
        return { requires2FA: true };
      }
      const message = error instanceof Error ? error.message : 'Login failed';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  verify2FA: async (code: string) => {
    const { pending2FAToken } = get();
    if (!pending2FAToken) {
      throw new Error('No pending 2FA verification');
    }

    set({ isLoading: true, error: null });
    try {
      const response = await authApi.verify2FA(code, pending2FAToken);
      await api.setTokens(response.token, response.refreshToken);
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        pending2FAToken: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '2FA verification failed';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  register: async (email: string, password: string, name?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.register(email, password, name);
      await api.setTokens(response.token, response.refreshToken);
      set({ user: response.user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authApi.logout();
    } catch {
      // Ignore logout API errors
    } finally {
      await api.clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false, pending2FAToken: null });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      await api.init();
      if (!api.isAuthenticated()) {
        set({ isAuthenticated: false, isLoading: false });
        return;
      }
      const { user } = await authApi.me();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      await api.clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
  clear2FA: () => set({ pending2FAToken: null }),
}));
