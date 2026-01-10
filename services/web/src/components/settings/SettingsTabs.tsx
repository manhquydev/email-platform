import { useState } from "react";
import { cn } from "../../utils/cn";

interface SettingsTabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

interface TabConfig {
    id: string;
    label: string;
    icon: string;
    group?: string;
}

const tabs: TabConfig[] = [
    // Account group
    { id: 'general', label: 'Chung', icon: 'person', group: 'account' },
    { id: 'security', label: 'Bảo mật', icon: 'shield', group: 'account' },
    { id: 'subscription', label: 'Gói & Thanh toán', icon: 'credit_card', group: 'account' },
    { id: 'notifications', label: 'Thông báo', icon: 'notifications', group: 'account' },

    // Email group
    { id: 'filters', label: 'Bộ lọc', icon: 'filter_list', group: 'email' },
    { id: 'labels', label: 'Nhãn', icon: 'label', group: 'email' },
    { id: 'retention', label: 'Lưu trữ', icon: 'schedule', group: 'email' },

    // Collaboration group
    { id: 'teams', label: 'Nhóm', icon: 'groups', group: 'collaboration' },

    // Developer group
    { id: 'developer', label: 'Khóa API', icon: 'code', group: 'developer' },
];

export function SettingsTabs({ activeTab, onTabChange }: SettingsTabsProps) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const activeTabConfig = tabs.find(t => t.id === activeTab) || tabs[0];

    return (
        <div className="border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#0a0a14]/80 backdrop-blur-xl sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
                {/* Header */}
                <div className="mb-4">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Cài đặt</h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-1 hidden sm:block">Quản lý tài khoản, bảo mật và tùy chọn ứng dụng</p>
                </div>

                {/* Mobile: Dropdown selector */}
                <div className="md:hidden relative">
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-left"
                    >
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-[20px] text-primary filled">
                                {activeTabConfig.icon}
                            </span>
                            <span className="font-medium text-slate-900 dark:text-white">{activeTabConfig.label}</span>
                        </div>
                        <span className={cn(
                            "material-symbols-outlined text-[20px] text-slate-400 transition-transform",
                            isDropdownOpen && "rotate-180"
                        )}>
                            expand_more
                        </span>
                    </button>

                    {/* Dropdown menu */}
                    {isDropdownOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setIsDropdownOpen(false)}
                            />
                            <div className="absolute top-full left-0 right-0 mt-2 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-20 max-h-[60vh] overflow-y-auto">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            onTabChange(tab.id);
                                            setIsDropdownOpen(false);
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors min-h-[48px]",
                                            activeTab === tab.id
                                                ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-white"
                                                : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                                        )}
                                    >
                                        <span className={cn(
                                            "material-symbols-outlined text-[20px]",
                                            activeTab === tab.id && "filled"
                                        )}>
                                            {tab.icon}
                                        </span>
                                        <span className="font-medium">{tab.label}</span>
                                        {activeTab === tab.id && (
                                            <span className="material-symbols-outlined text-[18px] ml-auto">check</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Desktop: Horizontal scrollable tabs */}
                <div className="hidden md:flex gap-1 overflow-x-auto scrollbar-hide -mx-2 px-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all whitespace-nowrap text-sm font-medium min-h-[44px]",
                                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                                activeTab === tab.id
                                    ? "bg-primary/10 text-primary border border-primary/20 shadow-sm dark:bg-primary/20 dark:text-white dark:border-primary/30"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-slate-700"
                            )}
                        >
                            <span className={cn("material-symbols-outlined text-[18px]", activeTab === tab.id && "filled")}>
                                {tab.icon}
                            </span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
