/**
 * BottomTabBar - Fixed bottom navigation for mobile
 * Thumb-friendly zone, safe area support, smooth transitions
 */

import { BottomTabItem } from './BottomTabItem';
import { cn } from '../../utils/cn';

export interface TabItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    badge?: number;
}

interface BottomTabBarProps {
    tabs: TabItem[];
    activeTab: string;
    onTabChange: (id: string) => void;
    className?: string;
}

export function BottomTabBar({
    tabs,
    activeTab,
    onTabChange,
    className
}: BottomTabBarProps) {
    return (
        <nav
            className={cn(
                "fixed bottom-0 inset-x-0 z-50",
                "bg-v3-bg-elevated/95 backdrop-blur-sm",
                "border-t border-v3-border-default",
                "safe-area-bottom",
                className
            )}
            role="tablist"
            aria-label="Main navigation"
        >
            <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
                {tabs.map(tab => (
                    <BottomTabItem
                        key={tab.id}
                        id={tab.id}
                        label={tab.label}
                        icon={tab.icon}
                        badge={tab.badge}
                        isActive={activeTab === tab.id}
                        onClick={() => onTabChange(tab.id)}
                    />
                ))}
            </div>
        </nav>
    );
}
