import { api } from './client';
import type { User } from '@/types';

interface LoginResponse {
  token: string;
  user: User;
}

interface RegisterResponse {
  token: string;
  user: User;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, name?: string) =>
    api.request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  me: () => api.request<{ user: User }>('/auth/me'),

  logout: () =>
    api.request<{ ok: boolean }>('/auth/logout', {
      method: 'POST',
    }),

  refreshToken: () =>
    api.request<{ token: string }>('/auth/refresh', {
      method: 'POST',
    }),
};
