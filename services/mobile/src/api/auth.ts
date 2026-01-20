import { api } from './client';
import type { User } from '@/types';

interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: User;
  requires2FA?: boolean;
}

interface Verify2FAResponse {
  token: string;
  refreshToken?: string;
  user: User;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, name?: string) =>
    api.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  me: () => api.request<{ user: User }>('/auth/me'),

  logout: () =>
    api.request<{ ok: boolean }>('/auth/logout', {
      method: 'POST',
    }),

  refreshToken: () =>
    api.request<{ token: string; refreshToken?: string }>('/auth/refresh', {
      method: 'POST',
    }),

  /** Verify 2FA TOTP code */
  verify2FA: (code: string, tempToken: string) =>
    api.request<Verify2FAResponse>('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ code, tempToken }),
    }),
};
