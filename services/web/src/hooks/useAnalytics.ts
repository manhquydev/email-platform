import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { tokenManager } from '../utils/token-manager';

export interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface SystemAnalytics {
  queues: {
    emailIngest: QueueMetrics;
    outbound: QueueMetrics;
    webhooks: QueueMetrics;
  };
  counts: {
    users: number;
    totalEmails: number;
    sentEmails: number;
  };
  timeseries: Array<{
    date: string;
    received: number;
    sent: number;
  }>;
}

export function useSystemAnalytics() {
  const token = tokenManager.getAccessToken() ?? undefined;
  return useQuery<SystemAnalytics>({
    queryKey: ['admin', 'analytics', 'system'],
    queryFn: async () => {
      return api<SystemAnalytics>('/admin/analytics/system', { token });
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}
