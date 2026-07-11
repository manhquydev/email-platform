import { useState } from "react";
import { cn } from "../../utils/cn";
import { Tabs, TabsList, TabsTrigger } from "../ui/Tabs";

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

    // Referral group
    { id: 'referral', label: 'Giới thiệu', icon: 'diversity_3', group: 'referral' },
];

export function SettingsTabs({ activeTab, onTabChange }: SettingsTabsProps) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const activeTabConfig = tabs.find(t => t.id === activeTab) || tabs[0];

    return (
        <div className="border-b border-semantic-border bg-semantic-bg-elevated/80 backdrop-blur-xl sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
                {/* Header */}
                <div className="mb-4">
                    <h1 className="text-2xl md:text-3xl font-bold text-semantic-text-main tracking-tight">Cài đặt</h1>
                    <p className="text-sm text-semantic-text-muted mt-1 hidden sm:block">Quản lý tài khoản, bảo mật và tùy chọn ứng dụng</p>
                </div>

                {/* Mobile: Dropdown selector (listbox-style pattern, not a tablist — kept as its own implementation) */}
                <div className="md:hidden relative">
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        aria-haspopup="listbox"
                        aria-expanded={isDropdownOpen}
                        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-semantic-bg-elevated border border-semantic-border text-left"
                    >
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-[20px] text-semantic-accent filled">
                                {activeTabConfig.icon}
                            </span>
                            <span className="font-medium text-semantic-text-main">{activeTabConfig.label}</span>
                        </div>
                        <span className={cn(
                            "material-symbols-outlined text-[20px] text-semantic-text-muted transition-transform",
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
                            <div role="listbox" className="absolute top-full left-0 right-0 mt-2 py-2 bg-semantic-bg-elevated border border-semantic-border rounded-xl shadow-semantic-lg z-20 max-h-[60vh] overflow-y-auto">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        role="option"
                                        aria-selected={activeTab === tab.id}
                                        onClick={() => {
                                            onTabChange(tab.id);
                                            setIsDropdownOpen(false);
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors min-h-[48px]",
                                            activeTab === tab.id
                                                ? "bg-semantic-accent-subtle text-semantic-accent-text"
                                                : "text-semantic-text-secondary hover:bg-semantic-bg-hover"
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

                {/* Desktop: Horizontal scrollable tabs — real ARIA tablist via the Tabs primitive */}
                <Tabs activeId={activeTab} onChange={onTabChange} className="hidden md:block">
                    <TabsList aria-label="Cài đặt" className="overflow-x-auto scrollbar-hide -mx-2 px-2">
                        {tabs.map(tab => (
                            <TabsTrigger key={tab.id} id={tab.id} icon={
                                <span className={cn("material-symbols-outlined text-[18px]", activeTab === tab.id && "filled")}>
                                    {tab.icon}
                                </span>
                            }>
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            </div>
        </div>
    );
}
