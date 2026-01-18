import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NavigationProvider, DesktopNav, MobileNav, HamburgerMenu, useNavigation } from "../components/Navigation/index";
import { CommandPalette } from "../components/CommandPalette";
import { SearchAdvanced } from "../components/SearchAdvanced";
import { NotificationCenter } from "../components/NotificationCenter";
import { BackgroundEffects } from "../components/BackgroundEffects";
import { api } from "../utils/api";
import type { Domain, Inbox, PaginatedResponse } from "../types";

interface AppShellProps {
    children: React.ReactNode;
}

// Inner component to access NavigationContext
function AppShellInner({ children }: AppShellProps) {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const { openDrawer } = useNavigation();

    // UI States
    const [showSearch, setShowSearch] = useState(false);
    const [showCommandPalette, setShowCommandPalette] = useState(false);

    // Data for CommandPalette
    const [domains, setDomains] = useState<Domain[]>([]);
    const [inboxes, setInboxes] = useState<Inbox[]>([]);

    // Load global nav data
    useEffect(() => {
        if (!token) return;
        const loadNavData = async () => {
            try {
                // Fetch domains (limit 100)
                const dRes = await api<PaginatedResponse<Domain>>("/domains?limit=100", { token });
                setDomains(dRes.data);

                // Fetch user's inboxes (limit 100)
                const iRes = await api<PaginatedResponse<Inbox>>("/inboxes?limit=100&personal=true", { token });
                setInboxes(iRes.data);
            } catch (e) {
                console.error("Failed to load nav data", e);
            }
        };
        loadNavData();
    }, [token]);

    // Command Actions
    const handleSelectInbox = (inbox: Inbox) => {
        navigate(`/app?inboxId=${inbox.id}`);
        setShowCommandPalette(false);
    };

    const handleSearch = (query: string) => {
        navigate(`/app?q=${encodeURIComponent(query)}`);
        setShowCommandPalette(false);
        setShowSearch(false);
    };

    return (
        <>
            <div className="app-shell flex flex-row h-screen w-screen overflow-hidden bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-sans relative">
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
                            <button
                                onClick={openDrawer}
                                className="w-10 h-10 rounded-full bg-gradient-to-br from-nebula-violet to-nebula-violet-dark flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-nebula-violet/20 active:scale-95 transition-transform"
                                aria-label="Mở menu"
                            >
                                {user?.email?.charAt(0).toUpperCase() || "U"}
                            </button>
                        </div>
                    </header>

                    <main id="main-content" className="flex-1 relative overflow-hidden flex flex-col">
                        {children}
                    </main>

                    {/* Mobile Bottom Nav */}
                    <MobileNav
                        context="user"
                        onCompose={() => navigate('/app?action=compose')}
                        unreadCount={0}
                    />
                </div>

                {/* Desktop Sidebar (Right side) */}
                <DesktopNav context="user" />

                {/* Mobile Hamburger Drawer */}
                <HamburgerMenu context="user" />

                {/* Overlays */}
                {showSearch && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-20" onClick={() => setShowSearch(false)}>
                        <div className="w-full max-w-2xl px-4" onClick={e => e.stopPropagation()}>
                            <SearchAdvanced
                                value=""
                                onChange={handleSearch}
                                onClose={() => setShowSearch(false)}
                                className="shadow-2xl"
                            />
                        </div>
                    </div>
                )}

                {showCommandPalette && (
                    <CommandPalette
                        isOpen={showCommandPalette}
                        onClose={() => setShowCommandPalette(false)}
                        domains={domains}
                        inboxes={inboxes}
                        onSelectInbox={handleSelectInbox}
                        onCreateInbox={() => { navigate('/app?action=new_inbox'); setShowCommandPalette(false); }}
                        onSearch={handleSearch}
                    />
                )}
            </div>
        </>
    );
}

// Wrapper component that provides NavigationContext
export function AppShell({ children }: AppShellProps) {
    return (
        <NavigationProvider>
            <AppShellInner>{children}</AppShellInner>
        </NavigationProvider>
    );
}
