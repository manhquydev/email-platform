import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../utils/cn";
import { ThemeToggle } from "./ThemeToggle";
import { QuickGenerateCard } from "./QuickGenerateCard";
import { CountdownTimer } from "./CountdownTimer";
import type { Domain, Inbox } from "../types";

interface InboxSelectorProps {
    domains: Domain[];
    inboxes: Inbox[];
    selectedDomainId: string;
    selectedInboxId: string;
    onSelectDomain: (id: string) => void;
    onSelectInbox: (id: string) => void;
    onCreateInbox: (domainId: string, localPart: string, expiresAt?: number) => Promise<void>;
    onDeleteInbox: (inbox: Inbox) => void;
    user: any;
    token: string | null;
}

export function InboxSelector({
    domains,
    inboxes,
    selectedDomainId,
    selectedInboxId,
    onSelectDomain,
    onSelectInbox,
    onCreateInbox: _onCreateInbox,
    onDeleteInbox,
    user,
    token
}: InboxSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const activeDomain = domains.find(d => d.id === selectedDomainId);
    const activeInbox = inboxes.find(i => i.id === selectedInboxId);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const myDomains = user?.id ? domains.filter(d => d.ownerId === user.id) : [];
    const sharedDomains = user?.id ? domains.filter(d => d.ownerId !== user.id) : domains;

    return (
        <div className="relative" ref={containerRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all group max-w-[200px] md:max-w-[300px]"
            >
                <div className="flex flex-col items-start overflow-hidden">
                    <span className="text-xs text-text-tertiary">
                        {activeDomain?.name || "Chọn tên miền"}
                    </span>
                    <span className="text-sm font-bold text-white truncate w-full flex items-center gap-2">
                        {activeInbox?.localPart || "Hộp thư"}
                        <svg className={cn("w-4 h-4 text-text-tertiary transition-transform", isOpen && "rotate-180")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </span>
                </div>
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 mt-2 w-[320px] bg-surface-elevated border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[80vh]"
                    >
                        {/* Header / Domain Switcher */}
                        <div className="p-3 bg-surface-elevated/50 border-b border-white/5 space-y-3">
                            <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider block">Tên miền</label>

                            {/* Domain List (Replaces invalid Select) */}
                            <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1 small-scrollbar">
                                {myDomains.length > 0 && (
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-semibold text-text-tertiary px-2">Của tôi</div>
                                        {myDomains.map(d => (
                                            <button
                                                key={d.id}
                                                onClick={() => onSelectDomain(d.id)}
                                                className={cn(
                                                    "w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors flex items-center justify-between group/item",
                                                    selectedDomainId === d.id
                                                        ? "bg-primary/10 text-primary font-medium"
                                                        : "text-text-secondary hover:bg-white/5 hover:text-white"
                                                )}
                                            >
                                                <span className="truncate">{d.name}</span>
                                                {selectedDomainId === d.id && <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {sharedDomains.length > 0 && (
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-semibold text-text-tertiary px-2">Công khai</div>
                                        {sharedDomains.map(d => (
                                            <button
                                                key={d.id}
                                                onClick={() => onSelectDomain(d.id)}
                                                className={cn(
                                                    "w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors flex items-center justify-between group/item",
                                                    selectedDomainId === d.id
                                                        ? "bg-primary/10 text-primary font-medium"
                                                        : "text-text-secondary hover:bg-white/5 hover:text-white"
                                                )}
                                            >
                                                <span className="truncate">{d.name}</span>
                                                {selectedDomainId === d.id && <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Quick Generate */}
                            <QuickGenerateCard
                                domains={domains}
                                token={token}
                                onInboxCreated={(newId) => {
                                    if (activeDomain) onSelectDomain(activeDomain.id); // Refresh
                                    onSelectInbox(newId);
                                    setIsOpen(false);
                                }}
                            />
                        </div>

                        {/* Inbox List */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-surface-glass">
                            <div className="flex items-center justify-between px-2 py-1">
                                <span className="text-xs font-bold text-text-tertiary uppercase">Hộp thư ({inboxes.length})</span>
                                <a href="/app/manager" target="_blank" className="px-2 py-1 rounded bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors flex items-center gap-1">
                                    Quản lý
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </a>
                            </div>

                            {inboxes.length === 0 && (
                                <div className="py-4 text-center text-xs text-text-tertiary">Không tìm thấy hộp thư nào</div>
                            )}

                            {inboxes.map(inbox => (
                                <button
                                    key={inbox.id}
                                    onClick={() => { onSelectInbox(inbox.id); setIsOpen(false); }}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors text-sm group",
                                        selectedInboxId === inbox.id ? "bg-primary/10 text-primary" : "hover:bg-white/5 text-text-secondary hover:text-white"
                                    )}
                                >
                                    <div className={`w-2 h-2 rounded-full ${selectedInboxId === inbox.id ? 'bg-primary animate-pulse' : 'bg-white/20'}`}></div>
                                    <div className="flex-1 min-w-0">
                                        <div className="truncate font-medium">{inbox.localPart}@{inbox.domain?.name}</div>
                                        {inbox.expiresAt && <CountdownTimer expiresAt={inbox.expiresAt} className="text-[10px] opacity-70" />}
                                    </div>
                                    <div className="flex items-center gap-2 ml-auto">
                                        {selectedInboxId === inbox.id && <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDeleteInbox(inbox); }}
                                            className="p-1 rounded-md text-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Xóa hộp thư"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-2 border-t border-white/5 bg-surface-elevated/50 flex justify-between items-center">
                            <ThemeToggle />
                            <a href="/settings" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-xs text-text-tertiary hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-colors">
                                <span className="material-symbols-outlined text-[16px]">settings</span>
                                Cài đặt
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
