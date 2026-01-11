/**
 * Clarity Live Insights Widget
 * Displays real-time analytics from Microsoft Clarity API
 */

import { useState, useEffect } from "react";
import { api } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import type { ClarityLiveInsights } from "../../types/clarity";
import { ClarityLinkButton } from "./ClarityLinkButton";

export function ClarityInsightsWidget() {
  const { token } = useAuth();
  const [insights, setInsights] = useState<ClarityLiveInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInsights() {
      try {
        const data = await api<ClarityLiveInsights>(
          "/admin/analytics/clarity/live-insights",
          { token }
        );
        setInsights(data);
        setError(null);
      } catch (err) {
        const message = (err as Error).message;
        // Don't show error for "not configured" - just hide widget
        if (message.includes("503") || message.includes("not configured")) {
          setError("not_configured");
        } else {
          setError(message);
        }
      } finally {
        setLoading(false);
      }
    }
    if (token) fetchInsights();
  }, [token]);

  if (loading) {
    return (
      <div className="animate-pulse grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-white/5 rounded-xl" />
        ))}
      </div>
    );
  }

  // Hide widget if not configured
  if (error === "not_configured") {
    return (
      <div className="text-center py-6 text-nebula-text-muted">
        <p className="text-sm mb-2">Clarity API chưa được cấu hình</p>
        <p className="text-xs">Thêm CLARITY_API_TOKEN vào biến môi trường API server</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-danger">{error}</p>
      </div>
    );
  }

  if (!insights) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InsightCard
          label="Active Users"
          value={insights.activeUsers}
          icon="person"
          color="text-green-400"
        />
        <InsightCard
          label="Sessions (24h)"
          value={insights.totalSessions}
          icon="timeline"
          color="text-blue-400"
        />
        <InsightCard
          label="Avg Scroll"
          value={`${insights.avgScrollDepth?.toFixed(0) || 0}%`}
          icon="swap_vert"
          color="text-purple-400"
        />
        <InsightCard
          label="Avg Time"
          value={formatSeconds(insights.avgEngagementTime || 0)}
          icon="schedule"
          color="text-amber-400"
        />
      </div>

      {insights.topPages && insights.topPages.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-nebula-text-secondary mb-2">Top Pages</h4>
          <div className="space-y-2">
            {insights.topPages.slice(0, 5).map((page, idx) => (
              <div key={page.url} className="flex items-center gap-3 text-sm">
                <span className="text-xs font-bold text-gray-500 w-5">#{idx + 1}</span>
                <span className="flex-1 truncate text-nebula-text">{page.url}</span>
                <span className="font-semibold text-primary">{page.views}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {insights.cached && (
        <p className="text-xs text-nebula-text-muted text-right">Cached data (5 min TTL)</p>
      )}
    </div>
  );
}

function InsightCard({
  label,
  value,
  icon,
  color
}: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}) {
  return (
    <div
      className="p-4 rounded-xl text-center"
      style={{
        background: 'var(--neo-glass-bg-medium)',
        border: '1px solid var(--neo-glass-border)',
      }}
    >
      <span className={`material-symbols-outlined text-2xl ${color} mb-2`}>{icon}</span>
      <p className="text-xl font-bold text-nebula-text">{value}</p>
      <p className="text-xs text-nebula-text-muted mt-1">{label}</p>
    </div>
  );
}

function formatSeconds(seconds: number): string {
  if (!seconds || seconds === 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

/**
 * Clarity section for AdminDashboard
 * Combines insights widget with deep links
 */
export function ClaritySection() {
  return (
    <div
      className="p-6 rounded-2xl"
      style={{
        background: 'var(--neo-glass-bg-medium)',
        backdropFilter: 'var(--neo-glass-blur-medium)',
        border: '1px solid var(--neo-glass-border)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-nebula-text">Clarity Live Insights</h3>
          <p className="text-xs text-nebula-text-muted mt-0.5">Real-time user behavior analytics</p>
        </div>
        <ClarityLinkButton type="dashboard" />
      </div>
      <ClarityInsightsWidget />
    </div>
  );
}
