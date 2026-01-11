import { useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { NavigationProvider, DesktopNav, MobileNav, HamburgerMenu } from "../components/Navigation/index";
import { CommandPalette } from "../components/CommandPalette";
import { SearchBar } from "../components/SearchBar";
import { InboxSelector } from "../components/InboxSelector";
import { NotificationCenter } from "../components/NotificationCenter";

import type { Domain, Inbox } from "../types";

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
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const { user } = useAuth();

    const handleSearch = useCallback((q: string) => {
        onSearch?.(q);
        if (q && !recentSearches.includes(q)) {
            setRecentSearches(prev => [q, ...prev.slice(0, 4)]);
        }
    }, [onSearch, recentSearches]);

    return (
        <NavigationProvider>
            <div className="min-h-screen w-full relative overflow-hidden bg-bg text-text-main font-sans selection:bg-primary/30">

                {/* Background Effects */}
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-br from-bg via-slate-100 to-slate-200 dark:from-bg dark:via-[#0f1016] dark:to-[#0a0b0e]" />
                    <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-primary/5 dark:bg-primary/10 blur-[100px]" />
                    <div className="absolute bottom-[10%] left-[-10%] w-[30%] h-[30%] rounded-full bg-nebula-violet/10 dark:bg-nebula-violet/10 blur-[80px]" />
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02]" />
                </div>

                {/* Notification Center - Absolute Top Right */}
                <div className="hidden md:block absolute top-4 right-24 z-[60]">
                    <NotificationCenter />
                </div>

                {/* Header with InboxSelector - Fixed top */}
                <div className="fixed top-0 left-0 right-0 md:right-20 z-[55] h-16 flex items-center px-4 bg-bg/80 backdrop-blur-lg border-b border-white/5">
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

                {/* Desktop Sidebar - Same as AppShell */}
                <DesktopNav context="user" />

                {/* Mobile Hamburger Drawer - Same as AppShell */}
                <HamburgerMenu context="user" />

                <AnimatePresence mode="wait">
                    <motion.main
                        key={location.pathname}
                        className="relative z-10 w-full md:pr-20 pt-16 min-h-screen pb-20 md:pb-0"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                        {children}
                    </motion.main>
                </AnimatePresence>

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
                        if (domains.length > 0) {
                            navigate('/app?action=new_inbox');
                        }
                    }}
                    onSearch={handleSearch}
                />

                {/* Mobile Bottom Nav - Same as AppShell */}
                <MobileNav
                    context="user"
                    onCompose={() => navigate('/app?action=new_inbox')}
                    unreadCount={unreadCount}
                />
            </div>
        </NavigationProvider>
    );
}
