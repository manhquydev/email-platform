import { api } from './client';

interface SummarizeResponse {
  summary: string;
  creditsUsed: number;
}

interface CreditsResponse {
  credits: number;
  tier: string;
}

export const aiApi = {
  /**
   * Generate AI summary for a message
   */
  summarize: (messageId: string) =>
    api.request<SummarizeResponse>(`/messages/${messageId}/summarize`, {
      method: 'POST',
    }),

  /**
   * Get user's AI credits balance
   */
  getCredits: () =>
    api.request<CreditsResponse>('/user/credits'),
};
