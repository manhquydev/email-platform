import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { GeneralSettings } from "../components/settings/GeneralSettings";
import { SecuritySettings } from "../components/settings/SecuritySettings";
import { SubscriptionSettings } from "../components/settings/SubscriptionSettings";
import { NotificationsSettings } from "../components/settings/NotificationsSettings";
import { DeveloperSettings } from "../components/settings/DeveloperSettings";
import { FiltersTab } from "../components/settings/FiltersTab";
import { LabelsTab } from "../components/settings/LabelsTab";
import { SettingsTabs } from "../components/settings/SettingsTabs";
import type { Inbox } from "../types";

// Types
interface UserProfile {
    id: string;
    email: string;
    name?: string;
    role: string;
    createdAt: string;
    tier: string;
    subscriptionEndsAt?: string | null;
    credits: number;
    emailVerified: string | null;
    twoFactorEnabled: boolean;
    _count: { domains: number; inboxes: number };
    usage: { domains: number; inboxes: number; storage: number };
    limits: { domains: number; inboxes: number; storageGB: number; dailyEmails: number };
}

type SettingsTab = 'general' | 'security' | 'subscription' | 'developer' | 'notifications' | 'filters' | 'labels' | 'domains';

export function Settings() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // Sync activeTab with URL params
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab') as SettingsTab;
        if (tab && ['general', 'security', 'subscription', 'developer', 'notifications', 'filters', 'labels'].includes(tab)) {
            if (tab !== activeTab) {
                setActiveTab(tab);
            }
        }
    }, [location.search, activeTab]);

    // Update URL when tab changes
    const changeTab = (tab: string) => {
        setActiveTab(tab as SettingsTab);
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
            console.error("Failed to load profile", err);
        } finally {
            setLoading(false);
        }
    }, [token]);

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
        } catch {
            console.error("Failed to load inboxes", err);
            setInboxes([]);
        }
    }, [token]); // Removed selectedInboxId dependency to break loop

    useEffect(() => {
        loadProfile();
        loadInboxes();
    }, [loadProfile, loadInboxes]);

    return (
        <div className="flex flex-col h-full w-full bg-white dark:bg-bg overflow-hidden">
            {/* Horizontal Tabs Header */}
            <SettingsTabs activeTab={activeTab} onTabChange={changeTab} />

            {/* Main Content Area - Full Width */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto px-6 py-8 pb-24">
                    {activeTab === 'general' && <GeneralSettings profile={profile} loadProfile={loadProfile} loading={loading} />}
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

