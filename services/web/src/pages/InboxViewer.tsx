/**
 * InboxViewer - Public inbox viewer page
 * Allows viewing public inboxes without authentication
 */
import { SearchForm } from "../components/inbox-viewer/search-form";
import { TelegramLinkModal } from "../components/telegram-link-modal";
import { BackgroundEffects } from "../components/BackgroundEffects";
import {
    useInboxViewerData,
    AccessErrorDisplay,
    InboxViewerHeader,
    MessageListPane,
    MessageDetailPane
} from "./inbox-viewer-modules";

export function InboxViewer() {
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
        setShowTelegramModal,
        handleSearch,
        handleSelectMessage,
        handlePageChange,
        handleClearError,
        handleChangeEmail,
        handleCopyShareLink,
        handleCopyEmail,
        handleRefresh,
    } = useInboxViewerData();

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 relative">
            {/* Background Effects */}
            <BackgroundEffects variant="subtle" />

            {/* Header */}
            <InboxViewerHeader
                email={email}
                hasError={!!accessError}
                onCopyShareLink={handleCopyShareLink}
                onOpenTelegram={() => setShowTelegramModal(true)}
            />

            <main className="max-w-7xl mx-auto px-4 py-6 relative z-10">
                {accessError ? (
                    <AccessErrorDisplay error={accessError} onClear={handleClearError} />
                ) : !email ? (
                    <div className="py-20">
                        <SearchForm onSearch={handleSearch} loading={loading} />
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-180px)]">
                        {/* Message List */}
                        <MessageListPane
                            email={email}
                            messages={messages}
                            selectedMessage={selectedMessage}
                            total={total}
                            page={page}
                            loading={loading}
                            onSelect={handleSelectMessage}
                            onPageChange={handlePageChange}
                            onCopyEmail={handleCopyEmail}
                            onCopyShareLink={handleCopyShareLink}
                            onRefresh={handleRefresh}
                            onChangeEmail={handleChangeEmail}
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
        </div>
    );
}
