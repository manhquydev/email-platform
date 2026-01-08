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

    // Developer group
    { id: 'developer', label: 'Khóa API', icon: 'code', group: 'developer' },
];

export function SettingsTabs({ activeTab, onTabChange }: SettingsTabsProps) {
    return (
        <div className="border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#0a0a14]/80 backdrop-blur-xl sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-6 py-4">
                {/* Header */}
                <div className="mb-4">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Cài đặt</h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">Quản lý tài khoản, bảo mật và tùy chọn ứng dụng</p>
                </div>

                {/* Horizontal tabs */}
                <div className="flex gap-1 overflow-x-auto scrollbar-hide -mx-2 px-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all whitespace-nowrap text-sm font-medium",
                                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                                activeTab === tab.id
                                    ? "bg-primary/10 text-primary border border-primary/20 shadow-sm dark:bg-primary/20 dark:text-white dark:border-primary/30"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5"
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
