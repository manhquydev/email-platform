/**
 * InboxManager - Main page component for managing email inboxes
 * Refactored to use modular hooks and layout components
 */
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { FocusStreamLayout } from "../layouts/FocusStreamLayout";
import { useBreakpoint } from "../hooks/useBreakpoint";

// Import modular components
import {
    useInboxFilters,
    useInboxSearch,
    useInboxManagerData,
    useInboxManagerActions,
    DesktopInboxLayout,
    MobileInboxLayout,
    InboxManagerModals
} from "../components/inbox-manager";

export function InboxManager() {
    const { token } = useAuth();
    const breakpoint = useBreakpoint();
    const isDesktop = breakpoint === 'desktop';

    // Use modular data hook
    const {
        domains,
        inboxes,
        messages,
        busy,
        setBusy,
        selectedDomain,
        activeInbox,
        setSelectedDomain,
        setActiveInbox,
        setInboxes,
        setMessages,
        loadInboxes,
        loadMessages
    } = useInboxManagerData();

    // Use modular filter/search hooks
    const { sortBy, filterBy, setSortBy, setFilterBy, getFilteredInboxes } = useInboxFilters();
    const filteredInboxes = getFilteredInboxes(inboxes);
    const { searchQuery, searchResults, isSearching, isSearchMode, handleSearch, clearSearch } = useInboxSearch();

    // Use modular actions hook
    const {
        selectedInboxIds,
        inboxToDelete,
        inboxToTransfer,
        inboxForVisibilityRules,
        showBatchDeleteConfirm,
        isBatchDeleting,
        inboxForActionSheet,
        showDetail,
        selectedMessage,
        setInboxToDelete,
        setInboxToTransfer,
        setInboxForVisibilityRules,
        setShowBatchDeleteConfirm,
        setInboxForActionSheet,
        setShowDetail,
        setSelectedMessage,
        handleSelectInbox,
        handleViewMessages,
        handleToggleSelect,
        handleSelectAll,
        handleDeleteInbox,
        confirmDeleteInbox,
        handleBatchDelete,
        confirmBatchDelete,
        handleCopyAll,
        handleShareModeChange,
        handleExtendInbox,
        handleTogglePermanent,
        handleSelectMessage,
        handleCreateInboxFromSelector,
        handleLongPress,
    } = useInboxManagerActions({
        activeInbox,
        inboxes,
        filteredInboxes,
        setBusy,
        setInboxes,
        setActiveInbox,
        setMessages,
        loadInboxes
    });

    // UI state
    const [activeTab, setActiveTab] = useState<'inboxes' | 'messages'>('inboxes');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Pull refresh handler
    const handlePullRefresh = async () => {
        setIsRefreshing(true);
        try {
            await loadInboxes();
        } finally {
            setIsRefreshing(false);
        }
    };

    // Copy public link handler
    const handleCopyPublicLink = (email: string) => {
        const url = `${window.location.origin}/inbox-viewer/${encodeURIComponent(email)}`;
        navigator.clipboard.writeText(url);
        // Toast notification will be shown by the component if needed
    };

    const unreadCount = messages.filter(m => !m.isRead).length;

    return (
        <FocusStreamLayout
            domains={domains}
            inboxes={inboxes}
            selectedDomainId={selectedDomain}
            selectedInboxId={activeInbox?.id || ""}
            onSelectDomain={setSelectedDomain}
            onSelectInbox={(id) => {
                const inbox = inboxes.find(i => i.id === id);
                if (inbox) handleSelectInbox(inbox);
            }}
            onCreateInbox={handleCreateInboxFromSelector}
            onDeleteInbox={handleDeleteInbox}
            onSearch={handleSearch}
            unreadCount={unreadCount}
        >
            {isDesktop ? (
                <DesktopInboxLayout
                    filteredInboxes={filteredInboxes}
                    inboxes={inboxes}
                    messages={messages}
                    searchResults={searchResults}
                    activeInbox={activeInbox}
                    selectedMessage={selectedMessage}
                    busy={busy}
                    isSearchMode={isSearchMode}
                    isSearching={isSearching}
                    searchQuery={searchQuery}
                    filterBy={filterBy}
                    sortBy={sortBy}
                    onSelectInbox={handleSelectInbox}
                    onDeleteInbox={handleDeleteInbox}
                    onTransferInbox={(inbox) => setInboxToTransfer(inbox)}
                    onExtendInbox={handleExtendInbox}
                    onTogglePermanent={handleTogglePermanent}
                    onShareModeChange={handleShareModeChange}
                    onVisibilityRules={(inbox) => setInboxForVisibilityRules(inbox)}
                    onCopyPublicLink={handleCopyPublicLink}
                    onSelectMessage={handleSelectMessage}
                    onSearch={handleSearch}
                    onClearSearch={clearSearch}
                    onCreateInbox={() => setShowCreateModal(true)}
                    onFilterChange={setFilterBy}
                    onSortChange={setSortBy}
                    loadMessages={loadMessages}
                    setSelectedMessage={setSelectedMessage}
                    setMessages={setMessages}
                />
            ) : (
                <MobileInboxLayout
                    filteredInboxes={filteredInboxes}
                    inboxes={inboxes}
                    messages={messages}
                    searchResults={searchResults}
                    activeInbox={activeInbox}
                    selectedMessage={selectedMessage}
                    busy={busy}
                    isSearchMode={isSearchMode}
                    isSearching={isSearching}
                    searchQuery={searchQuery}
                    filterBy={filterBy}
                    sortBy={sortBy}
                    activeTab={activeTab}
                    focusedIndex={focusedIndex}
                    selectedInboxIds={selectedInboxIds}
                    isRefreshing={isRefreshing}
                    onTabChange={setActiveTab}
                    onSelectInbox={handleSelectInbox}
                    onViewMessages={(inbox) => handleViewMessages(inbox, setActiveTab)}
                    onDeleteInbox={handleDeleteInbox}
                    onTransferInbox={(inbox) => setInboxToTransfer(inbox)}
                    onExtendInbox={handleExtendInbox}
                    onTogglePermanent={handleTogglePermanent}
                    onShareModeChange={handleShareModeChange}
                    onVisibilityRules={(inbox) => setInboxForVisibilityRules(inbox)}
                    onSelectMessage={handleSelectMessage}
                    onClearSearch={clearSearch}
                    onCreateInbox={() => setShowCreateModal(true)}
                    onFilterChange={setFilterBy}
                    onSortChange={setSortBy}
                    onToggleSelect={handleToggleSelect}
                    onSelectAll={handleSelectAll}
                    onBatchDelete={handleBatchDelete}
                    onCopyAll={handleCopyAll}
                    onLongPress={handleLongPress}
                    onPullRefresh={handlePullRefresh}
                    onSetFocusedIndex={setFocusedIndex}
                    loadMessages={loadMessages}
                />
            )}

            <InboxManagerModals
                token={token}
                domains={domains}
                activeInbox={activeInbox}
                showCreateModal={showCreateModal}
                inboxToDelete={inboxToDelete}
                inboxToTransfer={inboxToTransfer}
                inboxForVisibilityRules={inboxForVisibilityRules}
                showBatchDeleteConfirm={showBatchDeleteConfirm}
                inboxForActionSheet={inboxForActionSheet}
                busy={busy}
                isBatchDeleting={isBatchDeleting}
                selectedInboxIds={selectedInboxIds}
                showDetail={showDetail}
                selectedMessage={selectedMessage}
                isDesktop={isDesktop}
                onCloseCreateModal={() => setShowCreateModal(false)}
                onInboxCreated={(newInbox) => {
                    setInboxes(prev => [newInbox, ...prev]);
                    setShowCreateModal(false);
                }}
                onCloseDeleteModal={() => setInboxToDelete(null)}
                onConfirmDelete={confirmDeleteInbox}
                onCloseTransferModal={() => setInboxToTransfer(null)}
                onTransferComplete={() => {
                    if (inboxToTransfer) {
                        setInboxes(prev => prev.filter(i => i.id !== inboxToTransfer.id));
                        if (activeInbox?.id === inboxToTransfer.id) {
                            setActiveInbox(null);
                            setMessages([]);
                        }
                    }
                    setInboxToTransfer(null);
                }}
                onCloseVisibilityRules={() => setInboxForVisibilityRules(null)}
                onCloseBatchDeleteConfirm={() => setShowBatchDeleteConfirm(false)}
                onConfirmBatchDelete={confirmBatchDelete}
                onCloseActionSheet={() => setInboxForActionSheet(null)}
                onCloseDetail={() => setShowDetail(false)}
                onActionSheetCopy={() => {
                    if (inboxForActionSheet) {
                        const email = `${inboxForActionSheet.localPart}@${inboxForActionSheet.domain?.name}`;
                        navigator.clipboard.writeText(email);
                    }
                }}
                onActionSheetViewMessages={() => {
                    if (inboxForActionSheet) handleViewMessages(inboxForActionSheet, setActiveTab);
                }}
                onActionSheetTransfer={() => {
                    if (inboxForActionSheet) setInboxToTransfer(inboxForActionSheet);
                }}
                onActionSheetExtend={() => {
                    if (inboxForActionSheet) handleExtendInbox(inboxForActionSheet);
                }}
                onActionSheetTogglePermanent={() => {
                    if (inboxForActionSheet) handleTogglePermanent(inboxForActionSheet);
                }}
                onActionSheetDelete={() => {
                    if (inboxForActionSheet) handleDeleteInbox(inboxForActionSheet);
                }}
                onActionSheetShareModeChange={(mode) => {
                    if (inboxForActionSheet) handleShareModeChange(inboxForActionSheet.id, mode);
                }}
                onActionSheetVisibilityRules={() => {
                    if (inboxForActionSheet) setInboxForVisibilityRules(inboxForActionSheet);
                }}
                setInboxes={setInboxes}
                setActiveInbox={setActiveInbox}
                setMessages={setMessages}
            />
        </FocusStreamLayout>
    );
}
