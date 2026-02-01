import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

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
  return useQuery<SystemAnalytics>({
    queryKey: ['admin', 'analytics', 'system'],
    queryFn: async () => {
      const { data } = await api.get('/admin/analytics/system');
      return data;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}
