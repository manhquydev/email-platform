/**
 * FolderTabs - Gmail-style horizontal filter tabs
 * Filters: All | Unread | Starred | Has Attachment
 */
import { cn } from '../utils/cn';

export type FolderTab = 'all' | 'unread' | 'starred' | 'attachment';

interface FolderTabsProps {
  activeTab: FolderTab;
  onTabChange: (tab: FolderTab) => void;
  counts: {
    all: number;
    unread: number;
    starred: number;
    attachment: number;
  };
  className?: string;
}

const tabs: { id: FolderTab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'all',
    label: 'Tất cả',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
    ),
  },
  {
    id: 'unread',
    label: 'Chưa đọc',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'starred',
    label: 'Gắn sao',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    id: 'attachment',
    label: 'Đính kèm',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
      </svg>
    ),
  },
];

export function FolderTabs({ activeTab, onTabChange, counts, className }: FolderTabsProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 px-2 py-1.5 border-b border-nebula-border bg-nebula-surface/50 overflow-x-auto scrollbar-hide",
        className
      )}
      role="tablist"
      aria-label="Email filters"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const count = counts[tab.id];

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 whitespace-nowrap",
              isActive
                ? "bg-primary/15 text-primary border border-primary/30"
                : "text-nebula-text-muted hover:text-nebula-text hover:bg-nebula-elevated"
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {count > 0 && (
              <span
                className={cn(
                  "min-w-[18px] h-[18px] px-1 rounded-full text-xs flex items-center justify-center",
                  isActive
                    ? "bg-primary/20 text-primary"
                    : "bg-nebula-elevated text-nebula-text-muted"
                )}
              >
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
