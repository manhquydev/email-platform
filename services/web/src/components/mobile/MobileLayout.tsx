/**
 * MobileLayout - Wrapper layout for mobile screens
 * Provides bottom tab navigation, FAB, and proper spacing
 */

import { useCallback, type ReactNode } from 'react';
import { BottomTabBar, type TabItem } from './BottomTabBar';
import { FloatingActionButton } from './FloatingActionButton';

/** Tab icon components */
function InboxIcon({ className }: { className?: string }) {
    return (
        <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" />
        </svg>
    );
}

function MailIcon({ className }: { className?: string }) {
    return (
        <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
    );
}

function SearchIcon({ className }: { className?: string }) {
    return (
        <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
    );
}

function SettingsIcon({ className }: { className?: string }) {
    return (
        <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );
}

export type MobileTab = 'inboxes' | 'messages' | 'search' | 'settings';

interface MobileLayoutProps {
    children: ReactNode;
    activeTab: MobileTab;
    onTabChange: (tab: MobileTab) => void;
    /** Unread message count for badge */
    unreadCount?: number;
    /** Handler for FAB click */
    onCreateInbox?: () => void;
    /** Hide FAB */
    hideFab?: boolean;
    /** Additional class for content wrapper */
    className?: string;
}

export function MobileLayout({
    children,
    activeTab,
    onTabChange,
    unreadCount = 0,
    onCreateInbox,
    hideFab = false,
    className
}: MobileLayoutProps) {
    const tabs: TabItem[] = [
        { id: 'inboxes', label: 'Inboxes', icon: <InboxIcon /> },
        { id: 'messages', label: 'Messages', icon: <MailIcon />, badge: unreadCount },
        { id: 'search', label: 'Search', icon: <SearchIcon /> },
        { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
    ];

    const handleTabChange = useCallback((id: string) => {
        onTabChange(id as MobileTab);
    }, [onTabChange]);

    const handleFabClick = useCallback(() => {
        onCreateInbox?.();
    }, [onCreateInbox]);

    return (
        <div className="min-h-screen flex flex-col">
            {/* Main content with bottom padding for tab bar */}
            <main className={`flex-1 pb-16 ${className || ''}`}>
                {children}
            </main>

            {/* FAB - only show on inboxes/messages tabs */}
            {!hideFab && (activeTab === 'inboxes' || activeTab === 'messages') && (
                <FloatingActionButton
                    onClick={handleFabClick}
                    label="Create new inbox"
                />
            )}

            {/* Bottom Tab Bar */}
            <BottomTabBar
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />
        </div>
    );
}
