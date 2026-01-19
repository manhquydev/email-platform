import { api } from './client';
import type { Inbox, PaginatedResponse } from '@/types';

export const inboxesApi = {
  list: (params?: { limit?: number; offset?: number }) =>
    api.request<PaginatedResponse<Inbox>>('/inboxes', {
      query: params,
    }),

  get: (id: string) =>
    api.request<{ inbox: Inbox }>(`/inboxes/${id}`),

  create: (domainId: string, localPart: string) =>
    api.request<{ inbox: Inbox }>('/inboxes', {
      method: 'POST',
      body: JSON.stringify({ domainId, localPart }),
    }),

  delete: (id: string) =>
    api.request<{ ok: boolean }>(`/inboxes/${id}`, {
      method: 'DELETE',
    }),
};
