/**
 * InboxViewer - Public inbox viewer page
 * Allows viewing public inboxes without authentication
 */
import { useState } from "react";
import { SearchForm } from "../components/inbox-viewer/search-form";
import { TelegramLinkModal } from "../components/telegram-link-modal";
import { BackgroundEffects } from "../components/BackgroundEffects";
import { MobileBottomSheet } from "../components/inbox-viewer/mobile-bottom-sheet";
import { CommandPalette } from "../components/inbox-viewer/command-palette";
import { MessageDetail } from "../components/inbox-viewer/message-detail";
import { DensityProvider } from "../components/inbox-viewer/density-context";
import { useKeyboardNavigation } from "../hooks/use-keyboard-navigation";
import {
    useInboxViewerData,
    AccessErrorDisplay,
    InboxViewerHeader,
    MessageListPane,
    MessageDetailPane
} from "./inbox-viewer-modules";
import { API_URL } from "./inbox-viewer-modules/types";

export function InboxViewer() {
    const [showCommandPalette, setShowCommandPalette] = useState(false);

    const {
        email,
        messages,
        total,
        page,
        loading,
        selectedMessage,
        detailLoading,
        showTelegramModal,
        accessError,
        focusedIndex,
        setShowTelegramModal,
        handleSearch,
        handleSelectMessage,
        handlePageChange,
        handleClearError,
        handleChangeEmail,
        handleCopyShareLink,
        handleCopyEmail,
        handleRefresh,
        handleKeyboardSelect,
        handleKeyboardEnter,
        handleKeyboardEscape,
    } = useInboxViewerData();

    // Handle command palette actions
    const handleCommand = (commandId: string) => {
        switch (commandId) {
            case "refresh":
                handleRefresh();
                break;
            case "change-email":
                handleChangeEmail();
                break;
            case "copy-link":
                handleCopyShareLink();
                break;
            case "telegram":
                setShowTelegramModal(true);
                break;
        }
    };

    // Keyboard navigation (j/k, Enter, Esc, Cmd+K)
    const { setFocusedIndex } = useKeyboardNavigation({
        itemCount: messages.length,
        onSelect: handleKeyboardSelect,
        onEnter: handleKeyboardEnter,
        onEscape: handleKeyboardEscape,
        onRefresh: handleRefresh,
        onOpenCommandPalette: () => setShowCommandPalette(true),
        enabled: !!email && !accessError && messages.length > 0 && !showCommandPalette,
    });

    // Sync focused index with keyboard navigation
    const handleFocusChange = (index: number) => {
        setFocusedIndex(index);
        handleKeyboardSelect(index);
    };

    return (
        <DensityProvider>
        <div className="min-h-screen bg-black relative">
            {/* Background Effects */}
            <BackgroundEffects variant="subtle" />

            {/* Header */}
            <InboxViewerHeader
                email={email}
                hasError={!!accessError}
                onCopyShareLink={handleCopyShareLink}
                onOpenTelegram={() => setShowTelegramModal(true)}
            />

            <main className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6 relative z-10">
                {accessError ? (
                    <AccessErrorDisplay error={accessError} onClear={handleClearError} />
                ) : !email ? (
                    <div className="py-20">
                        <SearchForm onSearch={handleSearch} loading={loading} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-[40%_60%] lg:grid-cols-[33%_67%] gap-0 md:gap-4 h-[calc(100vh-180px)]">
                        {/* Message List */}
                        <MessageListPane
                            email={email}
                            messages={messages}
                            selectedMessage={selectedMessage}
                            total={total}
                            page={page}
                            loading={loading}
                            focusedIndex={focusedIndex}
                            onSelect={handleSelectMessage}
                            onPageChange={handlePageChange}
                            onCopyEmail={handleCopyEmail}
                            onCopyShareLink={handleCopyShareLink}
                            onRefresh={handleRefresh}
                            onChangeEmail={handleChangeEmail}
                            onFocusChange={handleFocusChange}
                        />

                        {/* Message Detail */}
                        <MessageDetailPane
                            message={selectedMessage}
                            loading={detailLoading}
                        />
                    </div>
                )}
            </main>

            {/* Telegram Modal */}
            {showTelegramModal && (
                <TelegramLinkModal
                    inboxEmail={email}
                    onClose={() => setShowTelegramModal(false)}
                />
            )}

            {/* Command Palette (Desktop) */}
            <CommandPalette
                isOpen={showCommandPalette}
                onClose={() => setShowCommandPalette(false)}
                onCommand={handleCommand}
            />

            {/* Mobile Bottom Sheet */}
            <MobileBottomSheet
                isOpen={!!selectedMessage}
                onClose={handleKeyboardEscape}
            >
                <MessageDetail
                    message={selectedMessage}
                    loading={detailLoading}
                    apiUrl={API_URL}
                />
            </MobileBottomSheet>
        </div>
        </DensityProvider>
    );
}
