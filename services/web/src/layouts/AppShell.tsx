import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MobileNavigation } from "../components/MobileNavigation";
import { NavigationSidebar } from "../components/NavigationSidebar";
import { CommandPalette } from "../components/CommandPalette";
import { SearchAdvanced } from "../components/SearchAdvanced";
import { api } from "../utils/api";
import type { Domain, Inbox, PaginatedResponse } from "../types";

interface AppShellProps {
    children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    const { user, token } = useAuth();
    // const { theme } = useTheme(); // Unused
    const location = useLocation();
    const navigate = useNavigate();

    // UI States
    const [isRailExpanded, setIsRailExpanded] = useState(false);
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

    const activeTab = location.pathname.includes('/my-domains') ? 'domains' :
        location.pathname.includes('/settings') ? 'settings' : 'inbox';

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
        <div className="app-shell flex flex-row h-screen w-screen overflow-hidden bg-bg text-text-main font-sans relative">
            {/* Nebula Background Effects - Wireframe Match */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[150px] opacity-60"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] opacity-50"></div>
                <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] bg-cyan-500/10 rounded-full blur-[100px] opacity-30"></div>
            </div>
            {/* 1. Sidebar (Desktop) - Wireframe Match */}
            <div className="hidden md:flex flex-shrink-0 relative z-30">
                <NavigationSidebar isExpanded={true} onNavToggle={() => setIsRailExpanded(!isRailExpanded)} /> {/* Force Rebuild Check */}
            </div>

            {/* 2. Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 relative">

                {/* Mobile Header (Only visible on mobile) */}
                <header className="md:hidden h-14 border-b border-border bg-surface/80 backdrop-blur flex items-center justify-between px-4 z-20">
                    <div className="font-bold text-lg bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                        Ephemera
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        {user?.email?.charAt(0).toUpperCase()}
                    </div>
                </header>

                <main id="app-main-scroll" className="flex-1 relative overflow-hidden flex flex-col">
                    {children}
                </main>

                {/* Mobile Bottom Nav */}
                <MobileNavigation
                    activeTab={activeTab}
                    onTabChange={(tab) => {
                        if (tab === 'inbox') navigate('/app');
                        if (tab === 'domains') navigate('/my-domains');
                        if (tab === 'settings') navigate('/settings');
                    }}
                    unreadCount={0}
                    onCompose={() => navigate('/app?action=compose')}
                />
            </div>

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
    );
}
