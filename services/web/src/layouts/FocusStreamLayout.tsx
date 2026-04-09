import { useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { NavigationProvider, DesktopNav, MobileNav, HamburgerMenu } from "../components/Navigation/index";
import { CommandPalette } from "../components/CommandPalette";
import { SearchBar } from "../components/SearchBar";
import { InboxSelector } from "../components/InboxSelector";
import { NotificationCenter } from "../components/NotificationCenter";
import { BackgroundEffects } from "../components/BackgroundEffects";

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
            <div className="flex flex-row h-screen w-screen overflow-hidden bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-sans relative">
                {/* Background Effects */}
                <BackgroundEffects variant="default" />

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0 relative z-10">
                    {/* Mobile Header */}
                    <header className="md:hidden h-14 border-b border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg flex items-center justify-between px-4 z-20 shrink-0">
                        <div className="font-bold text-lg bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                            Ephemera
                        </div>
                        <div className="flex items-center gap-2">
                            <NotificationCenter />
                        </div>
                    </header>

                    {/* Desktop Header with InboxSelector */}
                    <header className="hidden md:flex h-16 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg items-center px-4 z-20 shrink-0">
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
                    </header>

                    <main id="main-content" className="flex-1 relative overflow-hidden flex flex-col">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={location.pathname}
                                className="flex-1 overflow-auto"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                            >
                                {children}
                            </motion.div>
                        </AnimatePresence>
                    </main>

                    {/* Mobile Bottom Nav */}
                    <MobileNav
                        context="user"
                        onCompose={() => navigate('/app/manager')}
                        unreadCount={unreadCount}
                    />
                </div>

                {/* Desktop Sidebar (Right side) - uses order-last */}
                <DesktopNav context="user" />

                {/* Mobile Hamburger Drawer */}
                <HamburgerMenu context="user" />

                {/* Overlays */}
                <SearchBar
                    isOpen={showSearchBar}
                    onClose={() => setShowSearchBar(false)}
                    onSearch={handleSearch}
                    recentSearches={recentSearches}
                />

                <CommandPalette
                    isOpen={showCommandPalette}
                    onClose={() => setShowCommandPalette(false)}
                    domains={domains}
                    inboxes={inboxes}
                    onSelectInbox={(inbox: Inbox) => onSelectInbox(inbox.id)}
                    onCreateInbox={() => {
                        if (domains.length > 0) {
                            navigate('/app/manager');
                        }
                    }}
                    onSearch={handleSearch}
                />
            </div>
        </NavigationProvider>
    );
}
