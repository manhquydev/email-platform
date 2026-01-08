import { type ReactNode } from "react";
import { ResponsiveLayout as NavigationLayout } from "../components/Navigation/index";

interface ResponsiveLayoutProps {
    children: ReactNode;
    context?: "user" | "admin";
    onCompose?: () => void;
    unreadCount?: number;
    showMobileHeader?: boolean;
    headerContent?: ReactNode;
}

/**
 * ResponsiveLayout wrapper for pages
 *
 * Features:
 * - Desktop: Right sidebar navigation (collapsible)
 * - Tablet: Auto-collapsed sidebar (icons only)
 * - Mobile: Bottom navigation bar + hamburger drawer
 *
 * Usage:
 * ```tsx
 * <ResponsiveLayout context="user" onCompose={() => setShowCompose(true)}>
 *   <YourPageContent />
 * </ResponsiveLayout>
 * ```
 */
export function ResponsiveLayout({
    children,
    context = "user",
    onCompose,
    unreadCount = 0,
    showMobileHeader = true,
    headerContent,
}: ResponsiveLayoutProps) {
    return (
        <NavigationLayout
            context={context}
            onCompose={onCompose}
            unreadCount={unreadCount}
            showMobileHeader={showMobileHeader}
            headerContent={headerContent}
        >
            {children}
        </NavigationLayout>
    );
}
