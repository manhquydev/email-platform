/**
 * UI components for TeamSettings
 * TeamCard, TeamDetailsPanel, getRoleBadge helper
 */
import { Button } from "../../ui/Button";
import type { Team, TeamRole } from "../../../types";

// --- Role Badge Helper ---
export function getRoleBadge(role: TeamRole) {
    const styles: Record<TeamRole, string> = {
        OWNER: "bg-warning/10 text-warning border-warning/30",
        ADMIN: "bg-nebula-violet/10 text-nebula-violet border-nebula-violet/20",
        MEMBER: "bg-info/10 text-info border-info/30",
        VIEWER: "bg-nebula-elevated text-nebula-text-muted border-nebula-border"
    };
    return (
        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${styles[role]}`}>
            {role}
        </span>
    );
}

// --- Team Card ---
export interface TeamCardProps {
    team: Team;
    isSelected: boolean;
    isOwner: boolean;
    onSelect: () => void;
    onDelete: () => void;
}

export function TeamCard({ team, isSelected, isOwner, onSelect, onDelete }: TeamCardProps) {
    return (
        <div
            onClick={onSelect}
            className={`bg-nebula-elevated/50 rounded-lg p-4 border cursor-pointer transition-all ${
                isSelected
                    ? "border-info ring-1 ring-info/20"
                    : "border-nebula-border hover:border-nebula-border-highlight"
            }`}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-nebula-text truncate">{team.name}</h4>
                        {isOwner && getRoleBadge("OWNER")}
                    </div>
                    {team.description && (
                        <p className="text-sm text-nebula-text-muted truncate">{team.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-nebula-text-muted">
                        <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">person</span>
                            {team._count?.members || 0} thành viên
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">inbox</span>
                            {team._count?.sharedInboxes || 0} inbox
                        </span>
                    </div>
                </div>
                {isOwner && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="p-2 hover:bg-nebula-elevated rounded-md text-nebula-text-muted hover:text-danger transition-colors"
                        title="Xóa nhóm"
                    >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                )}
            </div>
        </div>
    );
}

// --- Team Details Panel ---
export interface TeamDetailsPanelProps {
    team: Team;
    isOwnerOrAdmin: boolean;
    onClose: () => void;
    onAddMember: () => void;
    onRemoveMember: (memberId: string) => void;
    onShareInbox: () => void;
    onUnshareInbox: (inboxId: string) => void;
    hasUserInboxes: boolean;
}

export function TeamDetailsPanel({
    team,
    isOwnerOrAdmin,
    onClose,
    onAddMember,
    onRemoveMember,
    onShareInbox,
    onUnshareInbox,
    hasUserInboxes,
}: TeamDetailsPanelProps) {
    return (
        <section className="glass-panel rounded-xl p-6 bg-nebula-surface border border-nebula-border shadow-sm">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-lg font-bold text-nebula-text mb-1">{team.name}</h3>
                    <p className="text-sm text-nebula-text-muted">{team.description || "Không có mô tả"}</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-nebula-elevated rounded-lg">
                    <span className="material-symbols-outlined text-nebula-text-muted">close</span>
                </button>
            </div>

            {/* Members */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-nebula-text flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">group</span>
                        Thành viên
                    </h4>
                    {isOwnerOrAdmin && (
                        <Button size="sm" variant="secondary" onClick={onAddMember}>
                            + Thêm
                        </Button>
                    )}
                </div>
                <div className="space-y-2">
                    {team.members?.map(member => (
                        <div key={member.id} className="flex items-center justify-between p-3 bg-nebula-elevated/50 rounded-lg border border-nebula-border">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-info/80 to-nebula-violet flex items-center justify-center text-white text-sm font-medium">
                                    {(member.user?.email || "?")[0].toUpperCase()}
                                </div>
                                <div>
                                    <span className="text-sm text-nebula-text">{member.user?.email || "Unknown"}</span>
                                    <div className="mt-0.5">{getRoleBadge(member.role)}</div>
                                </div>
                            </div>
                            {isOwnerOrAdmin && member.role !== "OWNER" && (
                                <button
                                    onClick={() => onRemoveMember(member.id)}
                                    className="p-1.5 hover:bg-nebula-elevated rounded text-nebula-text-muted hover:text-danger transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[18px]">person_remove</span>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Shared Inboxes */}
            <div>
                <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-nebula-text flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">inbox</span>
                        Inbox được chia sẻ
                    </h4>
                    {isOwnerOrAdmin && hasUserInboxes && (
                        <Button size="sm" variant="secondary" onClick={onShareInbox}>
                            + Chia sẻ
                        </Button>
                    )}
                </div>
                {team.sharedInboxes?.length === 0 ? (
                    <p className="text-sm text-nebula-text-muted italic">Chưa có inbox nào được chia sẻ.</p>
                ) : (
                    <div className="space-y-2">
                        {team.sharedInboxes?.map(si => (
                            <div key={si.id} className="flex items-center justify-between p-3 bg-nebula-elevated/50 rounded-lg border border-nebula-border">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-info text-[18px]">mail</span>
                                    <span className="text-sm text-nebula-text font-mono">
                                        {si.inbox?.localPart}@{si.inbox?.domain?.name}
                                    </span>
                                </div>
                                {isOwnerOrAdmin && (
                                    <button
                                        onClick={() => onUnshareInbox(si.inboxId)}
                                        className="p-1.5 hover:bg-nebula-elevated rounded text-nebula-text-muted hover:text-danger transition-colors"
                                        title="Hủy chia sẻ"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">link_off</span>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

// --- Teams List Header ---
export interface TeamsListHeaderProps {
    onCreateTeam: () => void;
}

export function TeamsListHeader({ onCreateTeam }: TeamsListHeaderProps) {
    return (
        <div className="flex justify-between items-start mb-6">
            <div>
                <h3 className="text-lg font-bold text-nebula-text mb-1 flex items-center gap-2">
                    <span className="material-symbols-outlined text-info">groups</span>
                    Nhóm của bạn
                </h3>
                <p className="text-sm text-nebula-text-muted">Quản lý các nhóm bạn sở hữu hoặc tham gia.</p>
            </div>
            <Button size="sm" onClick={onCreateTeam}>
                + Tạo nhóm
            </Button>
        </div>
    );
}

// --- Empty Teams State ---
export function EmptyTeamsState() {
    return (
        <div className="text-center py-12 bg-nebula-elevated/50 rounded-lg border border-nebula-border border-dashed">
            <span className="material-symbols-outlined text-nebula-text-muted text-4xl mb-2">group_off</span>
            <p className="text-nebula-text-muted">Chưa có nhóm nào. Tạo nhóm để bắt đầu chia sẻ inbox.</p>
        </div>
    );
}
