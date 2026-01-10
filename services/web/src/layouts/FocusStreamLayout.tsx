import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { NavigationSidebar } from "../components/NavigationSidebar";
import { CommandPalette } from "../components/CommandPalette";
import { SearchBar } from "../components/SearchBar";
import { NotificationCenter } from "../components/NotificationCenter";
import { InboxSelector } from "../components/InboxSelector";

import type { Domain, Inbox } from "../types";
import { MobileNavigation } from "../components/MobileNavigation";

interface FocusStreamLayoutProps {
    children: React.ReactNode;
    domains: Domain[];
    inboxes: Inbox[];
    selectedDomainId: string;
    selectedInboxId: string;
    onSelectDomain: (id: string) => void;
    onSelectInbox: (id: string) => void;
    onCreateInbox: (domainId: string, localPart: string, expiresAt?: number) => Promise<void>;
    onDeleteInbox: (inbox: Inbox) => void;
    onSearch: (query: string) => void;
    unreadCount?: number;
}

export function FocusStreamLayout({
    children,
    domains,
    inboxes,
    selectedDomainId,
    selectedInboxId,
    onSelectDomain,
    onSelectInbox,
    onCreateInbox,
    onDeleteInbox,
    onSearch,
    unreadCount = 0
}: FocusStreamLayoutProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [showSearchBar, setShowSearchBar] = useState(false);
    const [isNavExpanded, setIsNavExpanded] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const { user } = useAuth();

    // ... existing logic ...

    const getTierBadge = (tier?: string) => {
        switch (tier) {
            case 'ENTERPRISE':
                return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.2)]">Enterprise</span>;
            case 'PROFESSIONAL':
                return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-nebula-cyan/10 text-nebula-cyan border border-nebula-cyan/20 shadow-[0_0_10px_rgba(6,182,212,0.2)]">Pro</span>;
            case 'STARTER':
                return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">Starter</span>;
            default:
                return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10">Free</span>;
        }
    };

    const handleNavToggle = () => setIsNavExpanded(prev => !prev);
    const handleSearch = (q: string) => {
        onSearch?.(q);
        if (q && !recentSearches.includes(q)) {
            setRecentSearches(prev => [q, ...prev.slice(0, 4)]);
        }
    };

    const handleMobileTabChange = (tab: string) => {
        if (tab === 'inbox') navigate('/app');
        if (tab === 'search') setShowSearchBar(true);
        if (tab === 'domains') navigate('/my-domains');
        if (tab === 'settings') navigate('/settings');
    };

    const activeTab = location.pathname.includes('/my-domains') ? 'domains' :
        location.pathname.includes('/settings') ? 'settings' : 'inbox';

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === '[' && !e.metaKey && !e.ctrlKey &&
            document.activeElement?.tagName !== 'INPUT' &&
            document.activeElement?.tagName !== 'TEXTAREA') {
            e.preventDefault();
            handleNavToggle();
        }
    }, []);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return (
        <div className={`min-h-screen w-full relative overflow-hidden bg-bg text-text-main font-sans selection:bg-primary/30 ${isNavExpanded ? 'nav-expanded' : ''}`}>

            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-bg via-slate-100 to-slate-200 dark:from-bg dark:via-[#0f1016] dark:to-[#0a0b0e]" />
                <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-primary/5 dark:bg-primary/10 blur-[100px]" />
                <div className="absolute bottom-[10%] left-[-10%] w-[30%] h-[30%] rounded-full bg-nebula-violet/10 dark:bg-nebula-violet/10 blur-[80px]" />
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02]" />
            </div>

            {/* Notification Center - Absolute Top Right */}
            <div className="absolute top-4 right-4 z-[60]">
                <NotificationCenter />
            </div>

            {/* Header with InboxSelector - Fixed top */}
            <div className="fixed top-0 left-20 right-16 z-[55] h-16 flex items-center px-4 bg-bg/80 backdrop-blur-lg border-b border-white/5">
                <InboxSelector
                    domains={domains}
                    inboxes={inboxes}
                    selectedDomainId={selectedDomainId}
                    selectedInboxId={selectedInboxId}
                    onSelectDomain={onSelectDomain}
                    onSelectInbox={onSelectInbox}
                    onCreateInbox={onCreateInbox}
                    onDeleteInbox={onDeleteInbox}
                    user={user}
                    token={localStorage.getItem('token')}
                />
            </div>

            {/* Mobile Navigation Overlay */}
            {isMobileNavOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileNavOpen(false)} />
            )}

            {/* Replaced IconRail with NavigationSidebar */}
            <div className="fixed left-0 top-0 bottom-0 z-30 flex">
                <NavigationSidebar
                    isExpanded={isNavExpanded}
                    onNavToggle={handleNavToggle}
                />
            </div>

            {/* User Menu Dropdown */}
            {showUserMenu && (
                <div className="fixed bottom-20 left-4 md:left-20 z-50 min-w-[200px] animate-fade-in-up">
                    <div className="bg-white/80 dark:bg-surface/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden p-1">
                        <div className="px-3 py-2 border-b border-slate-100 dark:border-white/15 mb-1">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-sm font-medium text-slate-900 dark:text-text-main truncate max-w-[150px]">{user?.email}</span>
                                {getTierBadge(user?.tier)}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-muted uppercase tracking-wider font-semibold">{user?.role === 'ADMIN' ? 'Administrator' : 'User'}</div>
                        </div>
                        <button
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            onClick={() => {
                                setShowUserMenu(false);
                                navigate('/settings');
                            }}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 18, height: 18 }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Cài đặt</span>
                        </button>
                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                        <button
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                            onClick={() => {
                                setShowUserMenu(false);
                                localStorage.removeItem('token');
                                window.location.href = '/login';
                            }}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 18, height: 18 }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                            </svg>
                            <span>Đăng xuất</span>
                        </button>
                    </div>
                </div>
            )}

            <AnimatePresence mode="wait">
                <motion.main
                    key={location.pathname}
                    className="relative z-10 w-full md:pl-20 pt-16 min-h-screen pb-20 md:pb-0"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                >
                    {children}
                </motion.main>
            </AnimatePresence>

            {/* Mobile Nav Toggle Button */}
            <button
                className="fixed bottom-4 right-4 z-50 md:hidden p-3 bg-primary text-white rounded-full shadow-lg"
                onClick={() => setIsMobileNavOpen(prev => !prev)}
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                    {isMobileNavOpen ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    )}
                </svg>
            </button>

            {/* Search Bar - Dedicated for Email Search */}
            <SearchBar
                isOpen={showSearchBar}
                onClose={() => setShowSearchBar(false)}
                onSearch={handleSearch}
                recentSearches={recentSearches}
            />

            {/* Command Palette - Quick Actions for Power Users */}
            <CommandPalette
                isOpen={showCommandPalette}
                onClose={() => setShowCommandPalette(false)}
                domains={domains}
                inboxes={inboxes}
                onSelectInbox={(inbox: Inbox) => onSelectInbox(inbox.id)}
                onCreateInbox={() => {
                    // Use first domain to create inbox - CommandPalette uses this as a trigger
                    if (domains.length > 0) {
                        // This will open modal, actual create is handled by parent
                    }
                }}
                onSearch={handleSearch}
            />

            <MobileNavigation
                activeTab={activeTab}
                onTabChange={handleMobileTabChange}
                unreadCount={unreadCount}
                onCompose={() => {
                    // Trigger create inbox flow
                }}
            />
        </div>
    );
}
