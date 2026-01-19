import { api } from './client';
import type { Message, PaginatedResponse } from '@/types';

export const messagesApi = {
  list: (inboxId: string, params?: { limit?: number; offset?: number }) =>
    api.request<PaginatedResponse<Message>>(`/inboxes/${inboxId}/messages`, {
      query: params,
    }),

  get: (id: string) =>
    api.request<{ message: Message }>(`/messages/${id}`),

  markRead: (id: string, isRead: boolean) =>
    api.request<{ message: Message }>(`/messages/${id}/read`, {
      method: 'PATCH',
      body: JSON.stringify({ isRead }),
    }),

  delete: (id: string) =>
    api.request<{ ok: boolean }>(`/messages/${id}`, {
      method: 'DELETE',
    }),

  summarize: (id: string) =>
    api.request<{ summary: string }>(`/messages/${id}/summarize`, {
      method: 'POST',
    }),
};
