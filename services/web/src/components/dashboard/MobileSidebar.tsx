/**
 * MobileSidebar Component
 * Slide-out sidebar drawer for mobile devices
 */

import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "../Sidebar";
import { Button } from "../ui/Button";
import type { Domain, Inbox } from "../../types";

interface MobileSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    domains: Domain[];
    inboxes: Inbox[];
    selectedDomainId: string;
    selectedInboxId: string;
    currentUserId?: string;
    onSelectDomain: (id: string) => void;
    onSelectInbox: (id: string) => void;
    onCreateDomain: (name: string) => Promise<void>;
    onCreateInbox: (domainId: string, localPart: string, expiresAt?: number) => Promise<void>;
    onVerifyDomain: (domainId: string, verifyToken: string) => Promise<void>;
    onDeleteDomain: (domain: Domain) => Promise<void>;
    onDeleteInbox: (inbox: Inbox) => Promise<void>;
    onExtendInbox: (inboxId: string) => Promise<void>;
    isAdmin: boolean;
    busy: boolean;
}

export function MobileSidebar({
    isOpen,
    onClose,
    domains,
    inboxes,
    selectedDomainId,
    selectedInboxId,
    currentUserId,
    onSelectDomain,
    onSelectInbox,
    onCreateDomain,
    onCreateInbox,
    onVerifyDomain,
    onDeleteDomain,
    onDeleteInbox,
    onExtendInbox,
    isAdmin,
    busy,
}: MobileSidebarProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    {/* Sidebar Panel */}
                    <motion.div
                        initial={{ x: "-100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "-100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-[300px] h-full bg-surface-elevated border-r border-white/10 shadow-2xl flex flex-col"
                    >
                        <div className="p-4 border-b border-white/5 flex justify-between items-center">
                            <span className="font-bold text-lg">Menu</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>}
                            />
                        </div>
                        <Sidebar
                            domains={domains}
                            inboxes={inboxes}
                            selectedDomainId={selectedDomainId}
                            selectedInboxId={selectedInboxId}
                            currentUserId={currentUserId}
                            onSelectDomain={onSelectDomain}
                            onSelectInbox={(id) => {
                                onSelectInbox(id);
                                onClose();
                            }}
                            onCreateDomain={onCreateDomain}
                            onCreateInbox={onCreateInbox}
                            onVerifyDomain={onVerifyDomain}
                            onDeleteDomain={onDeleteDomain}
                            onDeleteInbox={onDeleteInbox}
                            onExtendInbox={onExtendInbox}
                            isAdmin={isAdmin}
                            busy={busy}
                        />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
