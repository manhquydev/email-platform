/* eslint-disable react-refresh/only-export-components */
import { type ReactNode } from "react";
import { NavigationProvider, useNavigation } from "./NavigationContext";
import { DesktopNav } from "./DesktopNav";
import { MobileNav } from "./MobileNav";
import { HamburgerMenu } from "./HamburgerMenu";

interface ResponsiveLayoutProps {
    children: ReactNode;
    context?: "user" | "admin";
    onCompose?: () => void;
    unreadCount?: number;
    showMobileHeader?: boolean;
    headerContent?: ReactNode;
}

// Inner component that uses navigation context
function ResponsiveLayoutInner({
    children,
    context = "user",
    onCompose,
    unreadCount = 0,
    showMobileHeader = true,
    headerContent,
}: ResponsiveLayoutProps) {
    const { isMobile } = useNavigation();

    return (
        <div className="flex flex-row h-screen w-screen overflow-hidden bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-sans relative">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[150px] opacity-40 dark:opacity-60" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] opacity-30 dark:opacity-50" />
            </div>

            {/* Main Content Area - Takes full width, sidebar is on right */}
            <div className="flex-1 flex flex-col min-w-0 relative z-10">
                {/* Mobile Header */}
                {showMobileHeader && isMobile && (
                    <header className="md:hidden h-14 border-b border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg flex items-center justify-between px-4 z-20 shrink-0">
                        {headerContent || (
                            <>
                                <div className="font-bold text-lg bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                                    Ephemera
                                </div>
                                <button
                                    onClick={() => {}}
                                    className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary"
                                >
                                    U
                                </button>
                            </>
                        )}
                    </header>
                )}

                {/* Page Content */}
                <main className="flex-1 relative overflow-hidden flex flex-col">
                    {children}
                </main>

                {/* Mobile Bottom Navigation */}
                <MobileNav
                    context={context}
                    onCompose={onCompose}
                    unreadCount={unreadCount}
                />
            </div>

            {/* Desktop Sidebar (Right side) */}
            <DesktopNav context={context} />

            {/* Mobile Hamburger Drawer */}
            <HamburgerMenu context={context} />
        </div>
    );
}

// Main export with provider wrapper
export function ResponsiveLayout(props: ResponsiveLayoutProps) {
    return (
        <NavigationProvider>
            <ResponsiveLayoutInner {...props} />
        </NavigationProvider>
    );
}

// Re-export components for direct use
export { NavigationProvider, useNavigation } from "./NavigationContext";
export { DesktopNav } from "./DesktopNav";
export { MobileNav } from "./MobileNav";
export { HamburgerMenu } from "./HamburgerMenu";
