import { cn } from '../../utils/cn';
import {
  getClarityDashboardUrl,
  getClarityRecordingsUrl,
  getClarityHeatmapsUrl,
  getClarityInsightsUrl,
  isClarityConfigured
} from '../../utils/clarityLinks';

interface ClarityLinkButtonProps {
  type: 'dashboard' | 'recordings' | 'heatmaps' | 'insights';
  filters?: {
    userId?: string;
    customTag?: string;
    url?: string;
  };
  pageUrl?: string;
  className?: string;
  size?: 'sm' | 'md';
}

const BUTTON_CONFIG = {
  dashboard: {
    label: 'Dashboard',
    icon: 'dashboard',
    getUrl: () => getClarityDashboardUrl(),
  },
  recordings: {
    label: 'Recordings',
    icon: 'videocam',
    getUrl: (filters?: ClarityLinkButtonProps['filters']) => getClarityRecordingsUrl(filters),
  },
  heatmaps: {
    label: 'Heatmaps',
    icon: 'local_fire_department',
    getUrl: (_filters?: ClarityLinkButtonProps['filters'], pageUrl?: string) => getClarityHeatmapsUrl(pageUrl),
  },
  insights: {
    label: 'Insights',
    icon: 'insights',
    getUrl: () => getClarityInsightsUrl(),
  },
};

/**
 * Button component that links to Microsoft Clarity dashboard views
 */
export function ClarityLinkButton({
  type,
  filters,
  pageUrl,
  className,
  size = 'sm'
}: ClarityLinkButtonProps) {
  if (!isClarityConfigured()) return null;

  const config = BUTTON_CONFIG[type];
  const url = config.getUrl(filters, pageUrl);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg transition-all',
        'bg-gradient-to-r from-blue-600/20 to-purple-600/20',
        'border border-blue-500/30 hover:border-blue-400/50',
        'text-blue-400 hover:text-blue-300',
        size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm',
        className
      )}
      title={`Open ${config.label} in Microsoft Clarity`}
    >
      <span className="material-symbols-outlined text-[16px]">{config.icon}</span>
      <span className="font-medium">{config.label}</span>
      <span className="material-symbols-outlined text-[14px] opacity-60">open_in_new</span>
    </a>
  );
}

/**
 * Group of Clarity link buttons for admin pages
 */
export function ClarityLinksGroup({ className }: { className?: string }) {
  if (!isClarityConfigured()) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      <ClarityLinkButton type="dashboard" />
      <ClarityLinkButton type="recordings" />
      <ClarityLinkButton type="heatmaps" />
      <ClarityLinkButton type="insights" />
    </div>
  );
}
