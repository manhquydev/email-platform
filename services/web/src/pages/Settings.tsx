import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { GeneralSettings } from "../components/settings/GeneralSettings";
import { SecuritySettings } from "../components/settings/SecuritySettings";
import { SubscriptionSettings } from "../components/settings/SubscriptionSettings";
import { NotificationsSettings } from "../components/settings/NotificationsSettings";
import { DeveloperSettings } from "../components/settings/DeveloperSettings";
import { FiltersTab } from "../components/settings/FiltersTab";
import { LabelsTab } from "../components/settings/LabelsTab";
import type { Inbox } from "../types";

// Types
interface UserProfile {
    id: string;
    email: string;
    role: string;
    createdAt: string;
    tier: string;
    subscriptionEndsAt?: string | null;
    credits: number;
    emailVerified: string | null;
    twoFactorEnabled: boolean;
    _count: { domains: number; inboxes: number };
}

type SettingsTab = 'general' | 'security' | 'subscription' | 'developer' | 'notifications' | 'filters' | 'labels' | 'domains';

export function Settings() {
    const { token, user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // Sync activeTab with URL params
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab') as SettingsTab;
        if (tab && ['general', 'security', 'subscription', 'developer', 'notifications', 'filters', 'labels', 'domains'].includes(tab)) {
            if (tab !== activeTab) {
                setActiveTab(tab);
            }
        }
    }, [location.search, activeTab]);

    // Update URL when tab changes
    const changeTab = (tab: SettingsTab) => {
        setActiveTab(tab);
        navigate(`?tab=${tab}`, { replace: true });
    };

    // Inboxes for filters/labels
    const [inboxes, setInboxes] = useState<Inbox[]>([]);
    const [selectedInboxId, setSelectedInboxId] = useState<string>("");

    const loadProfile = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await api<{ user: UserProfile }>("/auth/me", { token });
            if (res?.user) setProfile(res.user);
        } catch {
            // Fallback if load fails
            setProfile({
                id: user?.id || "",
                email: user?.email || "",
                role: user?.role || "USER",
                createdAt: new Date().toISOString(),
                tier: "FREE",
                credits: 0,
                emailVerified: null,
                twoFactorEnabled: false,
                subscriptionEndsAt: null,
                _count: { domains: 0, inboxes: 0 }
            });
        } finally {
            setLoading(false);
        }
    }, [token, user?.id, user?.email, user?.role]); // Use primitives

    const loadInboxes = useCallback(async () => {
        if (!token) return;
        try {
            const res = await api<{ inboxes: Inbox[] }>("/inboxes", { token });
            const inboxesData = res?.inboxes || [];
            setInboxes(inboxesData);

            // Set default selected inbox ONLY if not already set
            if (inboxesData && inboxesData.length > 0) {
                setSelectedInboxId((current: string) => (current ? current : inboxesData[0].id));
            }
        } catch (err) {
            console.error("Failed to load inboxes", err);
            setInboxes([]);
        }
    }, [token]); // Removed selectedInboxId dependency to break loop

    useEffect(() => {
        loadProfile();
        loadInboxes();
    }, [loadProfile, loadInboxes]);

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <div className="flex h-full w-full relative bg-transparent text-white font-display overflow-hidden">
            {/* Sidebar Navigation */}
            <aside className="w-64 flex-shrink-0 h-full border-r border-white/10 bg-[#0a0a14]/50 backdrop-blur-xl flex flex-col z-10 relative">
                <div className="p-6 pb-2">
                    <h2 className="text-xl font-bold tracking-tight text-white mb-2">Cài đặt</h2>
                </div>

                <nav className="flex-1 px-4 py-2 flex flex-col gap-1 overflow-y-auto">
                    <p className="px-4 text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 mt-2">Tài khoản</p>
                    <NavButon active={activeTab === 'general'} icon="person" label="Chung" onClick={() => changeTab('general')} />
                    <NavButon active={activeTab === 'security'} icon="shield" label="Bảo mật" onClick={() => changeTab('security')} />
                    <NavButon active={activeTab === 'subscription'} icon="credit_card" label="Gói & Thanh toán" onClick={() => changeTab('subscription')} />
                    <NavButon active={activeTab === 'notifications'} icon="notifications" label="Thông báo" onClick={() => changeTab('notifications')} />

                    <p className="px-4 text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 mt-6">Email</p>
                    <NavButon active={activeTab === 'filters'} icon="filter_list" label="Bộ lọc" onClick={() => changeTab('filters')} />
                    <NavButon active={activeTab === 'labels'} icon="label" label="Nhãn" onClick={() => changeTab('labels')} />
                    <Link to="/my-domains" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                        <span className="material-symbols-outlined text-[20px]">globe</span>
                        <span className="text-sm font-medium">Tên miền riêng</span>
                    </Link>

                    <p className="px-4 text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 mt-6">Nhà phát triển</p>
                    <NavButon active={activeTab === 'developer'} icon="code" label="Khóa API" onClick={() => changeTab('developer')} />
                </nav>

                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white/5 border border-white/5 mb-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 flex items-center justify-center text-sm font-bold">
                            {profile?.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-xs font-medium text-white truncate">{profile?.email?.split('@')[0]}</p>
                            <p className="text-[10px] text-primary truncate">Gói {profile?.tier}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-white text-sm py-2 transition-colors hover:bg-white/5 rounded-lg"
                    >
                        <span className="material-symbols-outlined text-[18px]">logout</span>
                        Đăng xuất
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 h-full overflow-y-auto relative z-0 scrollbar-hide">
                <div className="max-w-5xl mx-auto px-8 py-10 pb-24">
                    {activeTab === 'general' && <GeneralSettings profile={profile} loading={loading} />}
                    {activeTab === 'security' && <SecuritySettings profile={profile} loadProfile={loadProfile} />}
                    {activeTab === 'subscription' && <SubscriptionSettings profile={profile} loadProfile={loadProfile} />}
                    {activeTab === 'developer' && <DeveloperSettings />}
                    {activeTab === 'notifications' && <NotificationsSettings />}
                    {activeTab === 'filters' && <FiltersTab inboxes={inboxes} selectedInboxId={selectedInboxId} onInboxChange={setSelectedInboxId} />}
                    {activeTab === 'labels' && <LabelsTab inboxes={inboxes} selectedInboxId={selectedInboxId} onInboxChange={setSelectedInboxId} />}
                </div>
            </main>
        </div>
    );
}

function NavButon({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all w-full text-left ${active
                ? 'bg-primary/20 text-white border border-primary/30 shadow-[0_0_15px_rgba(37,37,244,0.3)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
        >
            <span className={`material-symbols-outlined text-[20px] ${active ? 'filled' : ''}`}>{icon}</span>
            <span className="text-sm font-medium">{label}</span>
        </button>
    );
}
