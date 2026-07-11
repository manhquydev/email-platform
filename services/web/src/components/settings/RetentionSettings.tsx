/**
 * RetentionSettings - Email retention configuration
 * Modules extracted to retention-settings-modules/
 */
import {
    type RetentionSettingsProps,
    useRetentionSettings,
    TierInfoBanner,
    DefaultRetentionSection,
    InboxItem,
    EmptyInboxState,
    InboxEditPanel,
    InfoBox
} from "./retention-settings-modules";

export function RetentionSettings(props: RetentionSettingsProps) {
    const {
        userInboxes,
        userTier,
        tierInfo,
        retentionOptions,
        selectedInbox,
        setSelectedInbox,
        inboxRetention,
        setInboxRetention,
        defaultRetention,
        setDefaultRetention,
        saving,
        handleInboxSelect,
        handleSaveInboxRetention,
        handleSaveDefaultRetention
    } = useRetentionSettings(props);

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div>
                <h2 className="text-3xl font-bold text-semantic-text-main mb-2 tracking-tight">Thời gian lưu trữ</h2>
                <p className="text-semantic-text-muted font-body">
                    Cấu hình thời gian lưu giữ email trước khi tự động xóa.
                </p>
            </div>

            <TierInfoBanner tierLabel={tierInfo.label} tierMax={tierInfo.max} userTier={userTier} />

            <DefaultRetentionSection
                defaultRetention={defaultRetention}
                setDefaultRetention={setDefaultRetention}
                retentionOptions={retentionOptions}
                tierInfo={tierInfo}
                saving={saving}
                onSave={handleSaveDefaultRetention}
            />

            {/* Per-Inbox Retention Settings */}
            <section className="rounded-xl p-6 bg-semantic-bg-elevated border border-semantic-border border-l-4 border-l-semantic-success/70 shadow-semantic-sm">
                <div className="mb-4">
                    <h3 className="text-lg font-bold text-semantic-text-main mb-1 flex items-center gap-2">
                        <span className="material-symbols-outlined text-semantic-success">inbox</span>
                        Cấu hình theo inbox
                    </h3>
                    <p className="text-sm text-semantic-text-muted">
                        Tùy chỉnh thời gian lưu trữ cho từng inbox cụ thể.
                    </p>
                </div>

                {userInboxes.length === 0 ? (
                    <EmptyInboxState />
                ) : (
                    <div className="space-y-3">
                        {userInboxes.slice(0, 10).map(inbox => (
                            <InboxItem
                                key={inbox.id}
                                inbox={inbox}
                                isSelected={selectedInbox?.id === inbox.id}
                                onSelect={() => handleInboxSelect(inbox)}
                            />
                        ))}
                        {userInboxes.length > 10 && (
                            <p className="text-xs text-semantic-text-muted text-center">+ {userInboxes.length - 10} inbox khác</p>
                        )}
                    </div>
                )}

                {selectedInbox && (
                    <InboxEditPanel
                        inbox={selectedInbox}
                        inboxRetention={inboxRetention}
                        setInboxRetention={setInboxRetention}
                        retentionOptions={retentionOptions}
                        saving={saving}
                        onSave={handleSaveInboxRetention}
                        onCancel={() => setSelectedInbox(null)}
                    />
                )}
            </section>

            <InfoBox tierMax={tierInfo.max} />
        </div>
    );
}
