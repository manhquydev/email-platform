/**
 * TelegramManagementPage - Admin page for managing Telegram integrations
 * Refactored to use modular hooks and components
 */
import { useState } from "react";
import {
    SectionHeader, LoadingSpinner, ConfirmModal
} from "../../components/admin/AdminUIComponents";
import {
    useTelegramData,
    useTelegramActions,
    OverviewTab,
    UserLinksTab,
    InboxLinksTab,
    type TabType
} from "./telegram-management-modules";

export function TelegramManagementPage() {
    const [activeTab, setActiveTab] = useState<TabType>("overview");

    // Use modular data hook
    const {
        loading,
        overview,
        userLinks,
        userLinksTotal,
        userLinksPage,
        userSearch,
        setUserLinksPage,
        setUserSearch,
        inboxLinks,
        inboxLinksTotal,
        inboxLinksPage,
        inboxSearch,
        statusFilter,
        setInboxLinksPage,
        setInboxSearch,
        setStatusFilter,
        loadOverview,
        loadUserLinks,
        loadInboxLinks,
    } = useTelegramData(activeTab);

    // Use modular actions hook
    const {
        confirmUnlink,
        setConfirmUnlink,
        actionLoading,
        handleUnlinkUser,
        handleRevokeInboxLink,
        handleReactivateInboxLink,
    } = useTelegramActions({
        loadUserLinks,
        loadInboxLinks,
        loadOverview,
    });

    if (loading && !overview) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Quản lý Telegram"
                subtitle="Quản lý liên kết Telegram với tài khoản và hòm thư"
            />

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/10">
                {[
                    { id: "overview", label: "Tổng quan" },
                    { id: "user-links", label: "Liên kết Người dùng" },
                    { id: "inbox-links", label: "Liên kết Hòm thư" },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === tab.id
                                ? "border-primary text-primary"
                                : "border-transparent text-gray-400 hover:text-gray-300"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === "overview" && overview && (
                <OverviewTab overview={overview} />
            )}

            {activeTab === "user-links" && (
                <UserLinksTab
                    userLinks={userLinks}
                    userLinksTotal={userLinksTotal}
                    userLinksPage={userLinksPage}
                    userSearch={userSearch}
                    setUserLinksPage={setUserLinksPage}
                    setUserSearch={setUserSearch}
                    onUnlink={setConfirmUnlink}
                />
            )}

            {activeTab === "inbox-links" && (
                <InboxLinksTab
                    inboxLinks={inboxLinks}
                    inboxLinksTotal={inboxLinksTotal}
                    inboxLinksPage={inboxLinksPage}
                    inboxSearch={inboxSearch}
                    statusFilter={statusFilter}
                    setInboxLinksPage={setInboxLinksPage}
                    setInboxSearch={setInboxSearch}
                    setStatusFilter={setStatusFilter}
                    onRevoke={setConfirmUnlink}
                    onReactivate={handleReactivateInboxLink}
                    actionLoading={actionLoading}
                />
            )}

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={!!confirmUnlink}
                onClose={() => setConfirmUnlink(null)}
                onConfirm={() => {
                    if (confirmUnlink?.type === "user") {
                        handleUnlinkUser(confirmUnlink.id);
                    } else if (confirmUnlink?.type === "inbox") {
                        handleRevokeInboxLink(confirmUnlink.id);
                    }
                }}
                title={confirmUnlink?.type === "user" ? "Hủy liên kết Telegram" : "Thu hồi liên kết"}
                message={`Bạn có chắc muốn ${confirmUnlink?.type === "user" ? "hủy liên kết" : "thu hồi"} Telegram cho ${confirmUnlink?.email}?`}
                confirmText={confirmUnlink?.type === "user" ? "Hủy liên kết" : "Thu hồi"}
                isLoading={actionLoading}
            />
        </div>
    );
}
