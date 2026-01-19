/**
 * UI components for InboxSelector
 */
import { motion } from "framer-motion";
import { cn } from "../../utils/cn";
import { ThemeToggle } from "../ThemeToggle";
import { CountdownTimer } from "../CountdownTimer";
import type { Domain, Inbox, Team } from "../../types";

/** Trigger button for the selector */
interface TriggerButtonProps {
    isOpen: boolean;
    onClick: () => void;
    activeDomain?: Domain;
    activeInbox?: Inbox;
    activeTeam?: Team;
    selectedTeamId?: string;
}

export function TriggerButton({ isOpen, onClick, activeDomain, activeInbox, activeTeam, selectedTeamId }: TriggerButtonProps) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-nebula-elevated border border-transparent hover:border-nebula-border transition-all group max-w-[200px] md:max-w-[300px]"
        >
            <div className="flex flex-col items-start overflow-hidden text-left">
                <span className="text-[10px] text-text-tertiary uppercase font-bold tracking-tight">
                    {selectedTeamId ? `Nhóm: ${activeTeam?.name}` : (activeDomain?.name || "Chọn tên miền")}
                </span>
                <span className="text-sm font-bold text-white truncate w-full flex items-center gap-2">
                    {activeInbox?.localPart || "Chọn hộp thư"}
                    <svg className={cn("w-4 h-4 text-text-tertiary transition-transform", isOpen && "rotate-180")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </span>
            </div>
        </button>
    );
}

/** Team selector section */
interface TeamSelectorProps {
    teams: Team[];
    selectedTeamId: string;
    onSelectTeam?: (id: string) => void;
}

export function TeamSelector({ teams, selectedTeamId, onSelectTeam }: TeamSelectorProps) {
    return (
        <>
            <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider block">Ngữ cảnh</label>
                {onSelectTeam && (
                    <button
                        onClick={() => onSelectTeam("")}
                        className={cn(
                            "text-[10px] px-2 py-0.5 rounded transition-colors",
                            !selectedTeamId ? "bg-primary text-white" : "text-text-tertiary hover:bg-white/5"
                        )}
                    >
                        Cá nhân
                    </button>
                )}
            </div>
            <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto pr-1 small-scrollbar mb-4">
                {teams.map(team => (
                    <button
                        key={team.id}
                        onClick={() => onSelectTeam?.(team.id)}
                        className={cn(
                            "w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2 group/team",
                            selectedTeamId === team.id
                                ? "bg-nebula-violet/20 text-nebula-violet font-medium"
                                : "text-text-secondary hover:bg-white/5 hover:text-white"
                        )}
                    >
                        <div className={cn(
                            "w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold",
                            selectedTeamId === team.id ? "bg-nebula-violet text-white" : "bg-white/10 text-text-tertiary"
                        )}>
                            {team.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate flex-1">{team.name}</span>
                        {selectedTeamId === team.id && <div className="w-1.5 h-1.5 rounded-full bg-nebula-violet" />}
                    </button>
                ))}
            </div>
        </>
    );
}

/** Domain selector section */
interface DomainSelectorProps {
    myDomains: Domain[];
    sharedDomains: Domain[];
    selectedDomainId: string;
    onSelectDomain: (id: string) => void;
}

export function DomainSelector({ myDomains, sharedDomains, selectedDomainId, onSelectDomain }: DomainSelectorProps) {
    return (
        <>
            <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider block mb-2">Tên miền</label>
            <div className="flex flex-col gap-1 max-h-[180px] overflow-y-auto pr-1 small-scrollbar">
                {myDomains.length > 0 && (
                    <div className="space-y-1">
                        <div className="text-[10px] font-semibold text-text-tertiary px-2 opacity-50">Của tôi</div>
                        {myDomains.map(d => (
                            <button
                                key={d.id}
                                onClick={() => onSelectDomain(d.id)}
                                className={cn(
                                    "w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors flex items-center justify-between",
                                    selectedDomainId === d.id
                                        ? "bg-primary/10 text-primary font-medium"
                                        : "text-text-secondary hover:bg-white/5 hover:text-white"
                                )}
                            >
                                <span className="truncate">{d.name}</span>
                            </button>
                        ))}
                    </div>
                )}
                {sharedDomains.length > 0 && (
                    <div className="space-y-1 mt-2">
                        <div className="text-[10px] font-semibold text-text-tertiary px-2 opacity-50">Công khai</div>
                        {sharedDomains.map(d => (
                            <button
                                key={d.id}
                                onClick={() => onSelectDomain(d.id)}
                                className={cn(
                                    "w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors flex items-center justify-between",
                                    selectedDomainId === d.id
                                        ? "bg-primary/10 text-primary font-medium"
                                        : "text-text-secondary hover:bg-white/5 hover:text-white"
                                )}
                            >
                                <span className="truncate">{d.name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

/** Inbox list section */
interface InboxListProps {
    inboxes: Inbox[];
    selectedInboxId: string;
    selectedTeamId?: string;
    onSelectInbox: (id: string) => void;
    onClose: () => void;
}

export function InboxList({ inboxes, selectedInboxId, selectedTeamId, onSelectInbox, onClose }: InboxListProps) {
    return (
        <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-surface-glass border-t border-white/5">
            <div className="flex items-center justify-between px-2 py-1 mb-1">
                <span className="text-xs font-bold text-text-tertiary uppercase tracking-wider">
                    {selectedTeamId ? `Hộp thư của nhóm (${inboxes.length})` : `Hộp thư (${inboxes.length})`}
                </span>
            </div>

            {inboxes.length === 0 && (
                <div className="py-8 text-center flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-text-tertiary">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                    <div className="text-xs text-text-tertiary">Không tìm thấy hộp thư nào</div>
                </div>
            )}

            {inboxes.map(inbox => (
                <button
                    key={inbox.id}
                    onClick={() => { onSelectInbox(inbox.id); onClose(); }}
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
                    {selectedInboxId === inbox.id && <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>}
                </button>
            ))}
        </div>
    );
}

/** Footer with theme toggle and links */
export function DropdownFooter() {
    return (
        <div className="p-2 border-t border-white/5 bg-surface-elevated/50 flex justify-between items-center">
            <ThemeToggle />
            <div className="flex gap-1">
                <a href="/teams" className="p-2 rounded-lg hover:bg-nebula-elevated text-xs text-text-tertiary hover:text-nebula-text flex items-center gap-1 transition-colors">
                    <span className="material-symbols-outlined text-[16px]">groups</span>
                    Nhóm
                </a>
                <a href="/settings" className="p-2 rounded-lg hover:bg-nebula-elevated text-xs text-text-tertiary hover:text-nebula-text flex items-center gap-1 transition-colors">
                    <span className="material-symbols-outlined text-[16px]">settings</span>
                    Cài đặt
                </a>
            </div>
        </div>
    );
}

/** Dropdown animation wrapper */
export const dropdownAnimation = {
    initial: { opacity: 0, y: 10, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 10, scale: 0.95 },
    transition: { duration: 0.2 }
};

export { motion };
