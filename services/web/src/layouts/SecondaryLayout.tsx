import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { IconRail } from "../components/IconRail";
import { MobileNavigation } from "../components/MobileNavigation";

interface SecondaryLayoutProps {
    children: React.ReactNode;
    title?: string;
}

/**
 * Secondary layout for pages like Settings, Domains, Forwarding, Authenticator
 * Uses the same IconRail as FocusStreamLayout for consistent navigation
 */
export function SecondaryLayout({ children, title }: SecondaryLayoutProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [isNavExpanded, setIsNavExpanded] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);

    const handleNavToggle = useCallback(() => {
        setIsNavExpanded(prev => !prev);
    }, []);

    const handleUserMenuAction = useCallback((action: 'settings' | 'logout') => {
        setShowUserMenu(false);
        if (action === 'settings') {
            navigate('/settings');
        } else if (action === 'logout') {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
    }, [navigate]);

    // Keyboard shortcut for nav toggle
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === '[' && !e.metaKey && !e.ctrlKey &&
                document.activeElement?.tagName !== 'INPUT' &&
                document.activeElement?.tagName !== 'TEXTAREA') {
                e.preventDefault();
                handleNavToggle();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleNavToggle]);

    // Close user menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (showUserMenu && !(e.target as HTMLElement).closest('.user-menu-container')) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showUserMenu]);



    const handleMobileTabChange = (tab: string) => {
        if (tab === 'inbox') navigate('/app');
        if (tab === 'domains') navigate('/my-domains');
        if (tab === 'settings') navigate('/settings');
    };

    const activeTab = location.pathname.includes('/my-domains') ? 'domains' :
        location.pathname.includes('/settings') ? 'settings' : 'inbox';

    return (
        <div className={`focus-stream-layout ${isNavExpanded ? 'nav-expanded' : ''}`}>

            <IconRail
                onSearchClick={() => { }}
                onQuickActionsClick={() => { }}
                onFocusModeClick={() => { }}
                onNavToggle={handleNavToggle}
                onUserClick={() => setShowUserMenu(prev => !prev)}
                isFocusMode={false}
                isExpanded={isNavExpanded}
                unreadCount={0}
            />

            {/* User Menu Dropdown */}
            {showUserMenu && (
                <div className="user-menu-container">
                    <div className="user-menu">
                        <button
                            className="user-menu-item"
                            onClick={() => handleUserMenuAction('settings')}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 18, height: 18 }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Cài đặt</span>
                        </button>
                        <div className="user-menu-divider" />
                        <button
                            className="user-menu-item user-menu-item--danger"
                            onClick={() => handleUserMenuAction('logout')}
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
                    className="focus-stream-main"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                >
                    <div className="focus-stream-content" style={{ maxWidth: '1200px' }}>
                        {title && (
                            <div className="focus-stream-header" style={{ border: 'none', padding: '0 0 24px 0', marginBottom: '24px' }}>
                                <h1 style={{ fontSize: '24px', fontWeight: 700 }}>{title}</h1>
                            </div>
                        )}
                        {children}
                    </div>
                </motion.main>
            </AnimatePresence>

            <MobileNavigation
                activeTab={activeTab}
                onTabChange={handleMobileTabChange}
                unreadCount={0}
                onCompose={() => navigate('/app')}
            />
        </div>
    );
}
