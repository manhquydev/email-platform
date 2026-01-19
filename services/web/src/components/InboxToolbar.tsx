/**
 * InboxToolbar - Inbox selector and actions toolbar
 * Modules extracted to inbox-toolbar-modules/
 */
import { Button } from "./ui/Button";
import {
    type InboxToolbarProps,
    getEmailAddress,
    getTTLRemaining,
    useInboxToolbar,
    EmptyToolbarState,
    InboxSelectorDropdown,
    TTLIndicator,
    DeleteConfirmPopup,
    InboxSelectorButton
} from "./inbox-toolbar-modules";

export function InboxToolbar({
    inboxes,
    currentInbox,
    onSelectInbox,
    onCreateInbox,
    onDeleteInbox
}: InboxToolbarProps) {
    const currentEmail = currentInbox ? getEmailAddress(currentInbox) : null;

    const {
        showDropdown,
        setShowDropdown,
        showDeleteConfirm,
        setShowDeleteConfirm,
        dropdownRef,
        handleCopyEmail,
        handleDeleteInbox
    } = useInboxToolbar({ currentInbox, currentEmail, onDeleteInbox });

    const ttlRemaining = getTTLRemaining(currentInbox?.expiresAt);

    if (!currentInbox) {
        return <EmptyToolbarState onCreateInbox={onCreateInbox} />;
    }

    return (
        <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-surface-glass border border-white/10 backdrop-blur-md h-[60px]">
            {/* Inbox Selector Dropdown */}
            <div className="relative flex-1 min-w-0" ref={dropdownRef}>
                <InboxSelectorButton
                    currentEmail={currentEmail!}
                    onClick={() => setShowDropdown(!showDropdown)}
                />

                {showDropdown && (
                    <InboxSelectorDropdown
                        inboxes={inboxes}
                        currentInboxId={currentInbox.id}
                        onSelectInbox={onSelectInbox}
                        onCreateInbox={onCreateInbox}
                        onClose={() => setShowDropdown(false)}
                    />
                )}
            </div>

            {/* TTL Indicator */}
            {ttlRemaining && <TTLIndicator ttlRemaining={ttlRemaining} />}

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
                {/* Copy Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyEmail}
                    title="Sao chép địa chỉ email (C)"
                    className="hidden sm:flex"
                    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>}
                />

                {/* Delete Button */}
                {onDeleteInbox && (
                    <div className="relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                            title="Xóa hộp thư này"
                            className="text-danger hover:text-danger hover:bg-danger/10"
                            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>}
                        />

                        {showDeleteConfirm && (
                            <DeleteConfirmPopup
                                onConfirm={handleDeleteInbox}
                                onCancel={() => setShowDeleteConfirm(false)}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
