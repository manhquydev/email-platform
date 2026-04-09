import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { NavigationProvider, DesktopNav, MobileNav, HamburgerMenu, useNavigation } from "../components/Navigation/index";
import { CommandPalette } from "../components/CommandPalette";
import { SearchAdvanced } from "../components/SearchAdvanced";
import { NotificationCenter } from "../components/NotificationCenter";
import { BackgroundEffects } from "../components/BackgroundEffects";
import { api } from "../utils/api";
import { useReducedMotion } from "../hooks/use-reduced-motion";
import type { Domain, Inbox, PaginatedResponse } from "../types";

interface AppShellProps {
    children: React.ReactNode;
    /** Enable page transition animations (default: true) */
    animate?: boolean;
}

// Inner component to access NavigationContext
function AppShellInner({ children, animate = true }: AppShellProps) {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { openDrawer } = useNavigation();
    const reducedMotion = useReducedMotion();

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
        navigate(`/app/manager?inboxId=${inbox.id}`);
        setShowCommandPalette(false);
    };

    const handleSearch = (query: string) => {
        navigate(`/app/manager?q=${encodeURIComponent(query)}`);
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
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={animate ? location.pathname : 'static'}
                                className="flex-1 overflow-auto flex flex-col"
                                initial={animate && !reducedMotion ? { opacity: 0, x: 20 } : false}
                                animate={animate && !reducedMotion ? { opacity: 1, x: 0 } : undefined}
                                exit={animate && !reducedMotion ? { opacity: 0, x: -20 } : undefined}
                                transition={{ duration: 0.2, ease: 'easeOut' }}
                            >
                                {children}
                            </motion.div>
                        </AnimatePresence>
                    </main>

                    {/* Mobile Bottom Nav */}
                    <MobileNav
                        context="user"
                        onCompose={() => navigate('/app/manager')}
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
                        onCreateInbox={() => { navigate('/app/manager'); setShowCommandPalette(false); }}
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
