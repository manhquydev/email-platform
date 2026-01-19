/**
 * Focus Dashboard Page - Streamlined email reading interface
 * Refactored to use modular hooks and components
 */
import { useState, useEffect, lazy, Suspense } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { Loading } from "../components/Loading";
import { FocusStreamLayout } from "../layouts/FocusStreamLayout";
import { EmailStream } from "../components/EmailStream";
import { InboxToolbar } from "../components/InboxToolbar";
import { Button } from "../components/ui/Button";
import type { Inbox, Message } from "../types";

// Import modular components
import {
    useFocusDashboardData,
    useFocusMessageActions,
    useFocusInboxActions,
    MessageDetailModal,
    WelcomeState,
} from "./focus-dashboard-modules";

// Lazy load modals
const ComposeModal = lazy(() => import("../components/ComposeModal").then(m => ({ default: m.ComposeModal })));
const CreateInboxModal = lazy(() => import("../components/CreateInboxModal").then(m => ({ default: m.CreateInboxModal })));

export function FocusDashboard() {
    const { token } = useAuth();

    // UI States
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [showCompose, setShowCompose] = useState(false);
    const [showCreateInbox, setShowCreateInbox] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [busy, setBusy] = useState(false);

    // Use modular data hook
    const {
        domains,
        inboxes,
        messages,
        selectedDomain,
        selectedInbox,
        busy: dataBusy,
        setSelectedDomain,
        setSelectedInbox,
        setMessages,
        loadInboxes,
        loadMessages,
    } = useFocusDashboardData(searchQuery);

    const currentInbox = inboxes.find(i => i.id === selectedInbox);
    const unreadCount = messages.filter(m => !m.isRead).length;

    // Message actions
    const { handleSelectMessage, handleDeleteMessage, handleTogglePin, handleMarkUnread } = useFocusMessageActions({
        selectedMessage,
        setSelectedMessage,
        setMessages,
        setShowDetail,
        setBusy,
    });

    // Inbox actions
    const { handleDeleteInbox, handleCopyEmail, handleCreateInboxFromSelector } = useFocusInboxActions({
        inboxes,
        selectedInbox,
        currentInbox,
        setInboxes: () => loadInboxes(), // Reload instead of local update
        setSelectedInbox,
        setMessages: setMessages as React.Dispatch<React.SetStateAction<unknown[]>>,
        setBusy,
    });

    // Keyboard shortcut for copy
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'c' && !e.metaKey && !e.ctrlKey && !e.altKey &&
                document.activeElement?.tagName !== 'INPUT' &&
                document.activeElement?.tagName !== 'TEXTAREA' &&
                currentInbox) {
                e.preventDefault();
                handleCopyEmail();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleCopyEmail, currentInbox]);

    const handleSelectInbox = (inbox: Inbox) => setSelectedInbox(inbox.id);
    const isBusy = busy || dataBusy;

    return (
        <FocusStreamLayout
            domains={domains}
            inboxes={inboxes}
            selectedDomainId={selectedDomain}
            selectedInboxId={selectedInbox}
            onSelectDomain={setSelectedDomain}
            onSelectInbox={(id) => {
                const inbox = inboxes.find(i => i.id === id);
                if (inbox) handleSelectInbox(inbox);
            }}
            onCreateInbox={handleCreateInboxFromSelector}
            onDeleteInbox={handleDeleteInbox}
            onSearch={setSearchQuery}
            unreadCount={unreadCount}
        >
            <div className="flex flex-col h-screen max-h-screen overflow-hidden">
                {/* Header with InboxToolbar */}
                <div className="flex-shrink-0 px-4 py-3 border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-20">
                    <div className="flex items-center justify-between gap-4 max-w-5xl mx-auto w-full">
                        <div className="flex-1 min-w-0">
                            <InboxToolbar
                                inboxes={inboxes}
                                currentInbox={currentInbox || null}
                                onSelectInbox={handleSelectInbox}
                                onCreateInbox={() => setShowCreateInbox(true)}
                                onDeleteInbox={handleDeleteInbox}
                            />
                        </div>
                        <div className="flex items-center">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => selectedInbox && loadMessages(selectedInbox)}
                                title="Làm mới (R)"
                                className={isBusy ? "animate-spin" : ""}
                                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>}
                            />
                        </div>
                    </div>
                </div>

                {/* Email Stream or Welcome State */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
                    <div className="max-w-5xl mx-auto w-full p-4 pb-20">
                        {isBusy && messages.length === 0 ? (
                            <div className="flex justify-center p-12">
                                <Loading />
                            </div>
                        ) : !selectedInbox ? (
                            <WelcomeState
                                domains={domains}
                                token={token}
                                onInboxCreated={(id, email) => {
                                    loadInboxes();
                                    setSelectedInbox(id);
                                    toast.success(`Đã tạo: ${email}`);
                                }}
                            />
                        ) : (
                            <EmailStream
                                messages={messages}
                                selectedMessageId={selectedMessage?.id || null}
                                onSelectMessage={handleSelectMessage}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Message Detail Modal */}
            <MessageDetailModal
                message={selectedMessage}
                show={showDetail}
                onClose={() => setShowDetail(false)}
                onTogglePin={handleTogglePin}
                onMarkUnread={handleMarkUnread}
                onDelete={handleDeleteMessage}
            />

            {/* Compose Modal */}
            <Suspense fallback={null}>
                {showCompose && (
                    <ComposeModal
                        token={token}
                        inboxes={inboxes}
                        onClose={() => {
                            setShowCompose(false);
                            loadInboxes();
                        }}
                    />
                )}
            </Suspense>

            {/* Create Inbox Modal */}
            <Suspense fallback={null}>
                {showCreateInbox && (
                    <CreateInboxModal
                        domains={domains}
                        token={token}
                        onClose={() => setShowCreateInbox(false)}
                        onInboxCreated={(inbox) => {
                            loadInboxes();
                            setSelectedInbox(inbox.id);
                            setShowCreateInbox(false);
                            toast.success(`Đã tạo: ${inbox.localPart}@${inbox.domain?.name}`);
                        }}
                    />
                )}
            </Suspense>
        </FocusStreamLayout>
    );
}
