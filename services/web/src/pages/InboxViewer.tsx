/**
 * InboxViewer - Public inbox viewer page
 * Allows viewing public inboxes without authentication
 */
import { useState } from "react";
import { InboxHeroSection } from "../components/inbox-viewer/inbox-hero-section";
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

    const { setFocusedIndex } = useKeyboardNavigation({
        itemCount: messages.length,
        onSelect: handleKeyboardSelect,
        onEnter: handleKeyboardEnter,
        onEscape: handleKeyboardEscape,
        onRefresh: handleRefresh,
        onOpenCommandPalette: () => setShowCommandPalette(true),
        enabled: !!email && !accessError && messages.length > 0 && !showCommandPalette,
    });

    const handleFocusChange = (index: number) => {
        setFocusedIndex(index);
        handleKeyboardSelect(index);
    };

    return (
        <DensityProvider>
        <div className="min-h-screen bg-black relative">
            <BackgroundEffects variant="subtle" />

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
                    <InboxHeroSection onSearch={handleSearch} loading={loading} />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-[40%_60%] lg:grid-cols-[33%_67%] gap-0 md:gap-4 h-[calc(100vh-180px)]">
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

                        <MessageDetailPane
                            message={selectedMessage}
                            loading={detailLoading}
                        />
                    </div>
                )}
            </main>

            {showTelegramModal && (
                <TelegramLinkModal
                    inboxEmail={email}
                    onClose={() => setShowTelegramModal(false)}
                />
            )}

            <CommandPalette
                isOpen={showCommandPalette}
                onClose={() => setShowCommandPalette(false)}
                onCommand={handleCommand}
            />

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

            {/* Minimal Footer - Branding (only on empty state) */}
            {!email && (
                <footer className="absolute bottom-0 left-0 right-0 py-4 text-center text-zinc-600 text-xs z-10">
                    <div className="flex items-center justify-center gap-4">
                        <span>© 2026 Ephemera</span>
                        <span className="w-px h-3 bg-zinc-800" />
                        <a href="/terms" className="hover:text-zinc-400 transition-colors">Điều khoản</a>
                        <span className="w-px h-3 bg-zinc-800" />
                        <a href="/privacy" className="hover:text-zinc-400 transition-colors">Bảo mật</a>
                    </div>
                </footer>
            )}
        </div>
        </DensityProvider>
    );
}
