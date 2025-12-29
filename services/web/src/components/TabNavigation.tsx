import { cn } from "../utils/cn";

interface Tab {
    id: string;
    label: string;
    icon: React.ReactNode;
    badge?: number;
}

interface TabNavigationProps {
    tabs: Tab[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
}

export function TabNavigation({ tabs, activeTab, onTabChange }: TabNavigationProps) {
    return (
        <div className="w-full bg-surface/30 backdrop-blur-md border-b border-white/5">
            <div className="flex items-center gap-1 p-1 overflow-x-auto" role="tablist">
                {tabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            className={cn(
                                "flex items-center gap-2 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium relative whitespace-nowrap min-w-[120px] justify-center md:min-w-0 md:justify-start",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-text-secondary hover:text-text-main hover:bg-white/5",
                                "focus:outline-none focus:ring-2 focus:ring-primary/50"
                            )}
                            onClick={() => onTabChange(tab.id)}
                            role="tab"
                            aria-selected={isActive}
                            aria-controls={`tabpanel-${tab.id}`}
                        >
                            <span className={cn("w-5 h-5 transition-colors", isActive ? "text-primary" : "text-muted")}>
                                {tab.icon}
                            </span>
                            <span className="relative z-10">{tab.label}</span>
                            {tab.badge !== undefined && tab.badge > 0 && (
                                <span className={cn(
                                    "ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                                    isActive ? "bg-primary text-white" : "bg-white/10 text-text-secondary"
                                )}>
                                    {tab.badge}
                                </span>
                            )}
                            {isActive && (
                                <div className="absolute inset-0 rounded-xl bg-primary/5 border border-primary/20 pointer-events-none" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// Tab icons - keeping them simple but potentially could use Lucide icons if available
export const InboxTabIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" />
    </svg>
);

export const MessagesTabIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
);
