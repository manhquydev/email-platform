import { useState, useEffect, useCallback, useRef } from "react";
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
import { TeamSettings } from "../components/settings/TeamSettings";
import { RetentionSettings } from "../components/settings/RetentionSettings";
import { SettingsTabs } from "../components/settings/SettingsTabs";
import { ReferralSection } from "./settings-modules/referral-section";
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
    emailVerified: string | null;
    twoFactorEnabled: boolean;
    retentionDays?: number | null;
    _count: { domains: number; inboxes: number };
    usage: { domains: number; inboxes: number; storage: number };
    limits: { domains: number; inboxes: number; storageGB: number; dailyEmails: number };
}

const SETTINGS_TABS = [
    "general",
    "security",
    "subscription",
    "developer",
    "notifications",
    "filters",
    "labels",
    "teams",
    "retention",
    "referral",
] as const;

type SettingsTab = (typeof SETTINGS_TABS)[number];

const isSettingsTab = (tab: string | null): tab is SettingsTab =>
    tab !== null && SETTINGS_TABS.includes(tab as SettingsTab);

const normalizeSettingsTab = (tab: string | null): SettingsTab | null => {
    if (!tab) return null;
    if (isSettingsTab(tab)) return tab;
    if (tab === "billing") return "subscription";
    return null;
};

export function Settings() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const mainContentRef = useRef<HTMLElement>(null);
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // Sync activeTab with URL params
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get("tab");

        if (tab === "domains") {
            navigate("/my-domains", { replace: true });
            return;
        }

        const normalizedTab = normalizeSettingsTab(tab);

        if (normalizedTab) {
            if (normalizedTab !== activeTab) {
                setActiveTab(normalizedTab);
            }
            if (tab !== normalizedTab) {
                navigate(`?tab=${normalizedTab}`, { replace: true });
            }
            return;
        }

        if (tab) {
            navigate("?tab=general", { replace: true });
        }
    }, [location.search, activeTab, navigate]);

    // Scroll to top when tab changes
    useEffect(() => {
        if (mainContentRef.current) {
            mainContentRef.current.scrollTo({ top: 0, behavior: 'instant' });
        }
    }, [activeTab]);

    // Update URL when tab changes
    const changeTab = (tab: string) => {
        if (!isSettingsTab(tab)) {
            return;
        }

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
        } catch (err) {
            console.error("Failed to load profile", err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const loadInboxes = useCallback(async () => {
        if (!token) return;
        try {
            const res = await api<{ data: Inbox[] }>("/inboxes", { token });
            const inboxesData = res?.data || [];
            setInboxes(inboxesData);

            // Set default selected inbox ONLY if not already set
            if (inboxesData && inboxesData.length > 0) {
                setSelectedInboxId((current: string) => (current ? current : inboxesData[0].id));
            }
        } catch (err) {
            console.error("Failed to load inboxes", err);
            setInboxes([]);
        }
    }, [token]);

    useEffect(() => {
        loadProfile();
        loadInboxes();
    }, [loadProfile, loadInboxes]);

    return (
        <div className="flex flex-col h-full w-full bg-semantic-bg-primary overflow-hidden">
            {/* Horizontal Tabs Header */}
            <SettingsTabs activeTab={activeTab} onTabChange={changeTab} />

            {/* Main Content Area - Full Width */}
            <main ref={mainContentRef} className="flex-1 overflow-y-auto">
                {/* id/aria-labelledby link to the matching TabsTrigger rendered by SettingsTabs (tab-${activeTab}) */}
                <div
                    id={`tabpanel-${activeTab}`}
                    role="tabpanel"
                    aria-labelledby={`tab-${activeTab}`}
                    className="max-w-7xl mx-auto px-6 py-8 pb-24"
                >
                    {activeTab === 'general' && <GeneralSettings profile={profile} loadProfile={loadProfile} loading={loading} />}
                    {activeTab === 'security' && <SecuritySettings profile={profile} loadProfile={loadProfile} />}
                    {activeTab === 'subscription' && <SubscriptionSettings profile={profile} loadProfile={loadProfile} />}
                    {activeTab === 'developer' && <DeveloperSettings />}
                    {activeTab === 'notifications' && <NotificationsSettings />}
                    {activeTab === 'filters' && <FiltersTab inboxes={inboxes} selectedInboxId={selectedInboxId} onInboxChange={setSelectedInboxId} />}
                    {activeTab === 'labels' && <LabelsTab inboxes={inboxes} selectedInboxId={selectedInboxId} onInboxChange={setSelectedInboxId} />}
                    {activeTab === 'retention' && <RetentionSettings userInboxes={inboxes} userTier={profile?.tier} userRetentionDays={profile?.retentionDays} />}
                    {activeTab === 'teams' && <TeamSettings userInboxes={inboxes} />}
                    {activeTab === 'referral' && <ReferralSection />}
                </div>
            </main>
        </div>
    );
}
