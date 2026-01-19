/**
 * Sidebar - Domain selector and inbox list
 * Modules extracted to sidebar-modules/
 */
import { TrustBadge } from "./trust-badge";
import {
    type SidebarProps,
    useSidebar,
    DomainSelector,
    QuickCreateButton,
    InboxListHeader,
    CreateInboxForm,
    InboxItem,
    EmptyInboxState,
    NoDomainSelectedState
} from "./sidebar-modules";

export function Sidebar(props: SidebarProps) {
    const {
        inboxes,
        selectedInboxId,
        currentUserId,
        onSelectDomain,
        onSelectInbox,
        onDeleteInbox,
        onExtendInbox,
        busy,
        isCreatingInbox,
        setIsCreatingInbox,
        newInboxName,
        setNewInboxName,
        activeDomain,
        isOwnerOrAdmin,
        canCreateInbox,
        myDomains,
        sharedDomains,
        selectedDomainId,
        handleCreateInbox,
        handleQuickCreate
    } = useSidebar(props);

    return (
        <div className="flex flex-col h-full bg-nebula-surface rounded-xl border border-nebula-border overflow-hidden">
            {/* Header: Domain selector + Quick create */}
            <div className="p-3 border-b border-nebula-border space-y-3">
                <DomainSelector
                    selectedDomainId={selectedDomainId}
                    myDomains={myDomains}
                    sharedDomains={sharedDomains}
                    onSelectDomain={onSelectDomain}
                />
                {canCreateInbox && (
                    <QuickCreateButton onClick={handleQuickCreate} disabled={busy} />
                )}
            </div>

            {/* Inbox List */}
            <div className="flex-1 overflow-y-auto">
                <InboxListHeader
                    count={inboxes.length}
                    canCreate={!!canCreateInbox}
                    onCreateClick={() => setIsCreatingInbox(true)}
                />

                {isCreatingInbox && (
                    <CreateInboxForm
                        value={newInboxName}
                        onChange={setNewInboxName}
                        domainName={activeDomain?.name}
                        onSubmit={handleCreateInbox}
                        onCancel={() => setIsCreatingInbox(false)}
                        busy={busy}
                    />
                )}

                {/* Inbox Items */}
                <div className="p-2 space-y-0.5">
                    {inboxes.map(inbox => {
                        const fullEmail = `${inbox.localPart}@${inbox.domain?.name || activeDomain?.name || ''}`;
                        const isSelected = selectedInboxId === inbox.id;
                        const isShared = inbox.ownerId !== currentUserId;

                        return (
                            <InboxItem
                                key={inbox.id}
                                inbox={inbox}
                                isSelected={isSelected}
                                isShared={isShared}
                                fullEmail={fullEmail}
                                isOwnerOrAdmin={!!isOwnerOrAdmin}
                                busy={busy}
                                onSelect={() => onSelectInbox(inbox.id)}
                                onExtend={() => onExtendInbox(inbox.id)}
                                onDelete={() => onDeleteInbox(inbox)}
                            />
                        );
                    })}

                    {inboxes.length === 0 && activeDomain && <EmptyInboxState />}
                    {!activeDomain && <NoDomainSelectedState />}
                </div>
            </div>

            {/* Trust Badge Footer */}
            <div className="p-3 border-t border-nebula-border">
                <TrustBadge variant="compact" className="w-full justify-center" />
            </div>
        </div>
    );
}
