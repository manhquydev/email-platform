/**
 * Clarity Live Insights Types
 * Response types from Clarity Data Export API
 */

export interface ClarityLiveInsights {
  activeUsers: number;
  totalSessions: number;
  topPages: Array<{ url: string; views: number }>;
  avgScrollDepth: number;
  avgEngagementTime: number;
  cached: boolean;
}
