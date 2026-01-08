import { useMemo, useState } from "react";
import type { Message } from "../types";

export type EmailCategory = "primary" | "updates" | "promotions" | "social" | "all";

interface CategoryTabsProps {
    messages: Message[];
    activeCategory: EmailCategory;
    onCategoryChange: (category: EmailCategory) => void;
}

interface CategoryConfig {
    id: EmailCategory;
    label: string;
    icon: React.ReactNode;
    color: string;
    keywords: string[];
}

const categories: CategoryConfig[] = [
    {
        id: "all",
        label: "Tất cả",
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        color: "text-text-main",
        keywords: [],
    },
    {
        id: "primary",
        label: "Chính",
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        color: "text-primary",
        keywords: [], // Primary is default - messages not matching other categories
    },
    {
        id: "updates",
        label: "Cập nhật",
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        color: "text-blue-500",
        keywords: ["notification", "alert", "update", "thông báo", "cập nhật", "reminder", "confirm", "verification", "verify", "password", "login", "security", "account"],
    },
    {
        id: "promotions",
        label: "Khuyến mãi",
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        color: "text-green-500",
        keywords: ["sale", "discount", "offer", "promo", "deal", "off", "free", "giảm giá", "khuyến mãi", "ưu đãi", "miễn phí", "coupon", "voucher", "shop", "store", "buy"],
    },
    {
        id: "social",
        label: "Mạng xã hội",
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        color: "text-purple-500",
        keywords: ["facebook", "twitter", "instagram", "linkedin", "youtube", "tiktok", "social", "follow", "like", "comment", "share", "friend", "connection", "invite", "join"],
    },
];

// Categorize a single message
function categorizeMessage(message: Message): EmailCategory {
    const searchText = `${message.subject || ''} ${message.fromAddress || ''} ${message.textBody?.substring(0, 200) || ''}`.toLowerCase();

    for (const category of categories) {
        if (category.id === "all" || category.id === "primary") continue;

        for (const keyword of category.keywords) {
            if (searchText.includes(keyword.toLowerCase())) {
                return category.id;
            }
        }
    }

    return "primary";
}

export function CategoryTabs({ messages, activeCategory, onCategoryChange }: CategoryTabsProps) {
    // Calculate counts for each category
    const categoryCounts = useMemo(() => {
        const counts: Record<EmailCategory, number> = {
            all: messages.length,
            primary: 0,
            updates: 0,
            promotions: 0,
            social: 0,
        };

        messages.forEach(msg => {
            const category = categorizeMessage(msg);
            counts[category]++;
        });

        return counts;
    }, [messages]);

    return (
        <div className="flex items-center gap-1 p-1 bg-bg rounded-lg border border-border overflow-x-auto scrollbar-hide">
            {categories.map(category => {
                const count = categoryCounts[category.id];
                const isActive = activeCategory === category.id;

                return (
                    <button
                        key={category.id}
                        onClick={() => onCategoryChange(category.id)}
                        className={`
                            flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium
                            transition-all whitespace-nowrap
                            ${isActive
                                ? 'bg-surface shadow-sm ' + category.color
                                : 'text-muted hover:text-text-main hover:bg-surface/50'
                            }
                        `}
                    >
                        {category.icon}
                        <span>{category.label}</span>
                        {count > 0 && (
                            <span className={`
                                text-[10px] px-1.5 py-0.5 rounded-full font-medium
                                ${isActive ? 'bg-primary/10' : 'bg-border'}
                            `}>
                                {count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

// Filter messages by category
// eslint-disable-next-line react-refresh/only-export-components
export function filterByCategory(messages: Message[], category: EmailCategory): Message[] {
    if (category === "all") return messages;

    return messages.filter(msg => categorizeMessage(msg) === category);
}

// Hook for category state
// eslint-disable-next-line react-refresh/only-export-components
export function useCategoryFilter(messages: Message[]) {
    const [activeCategory, setActiveCategory] = useState<EmailCategory>("all");

    const filteredMessages = useMemo(() => {
        return filterByCategory(messages, activeCategory);
    }, [messages, activeCategory]);

    return {
        activeCategory,
        setActiveCategory,
        filteredMessages,
        allMessages: messages,
    };
}
