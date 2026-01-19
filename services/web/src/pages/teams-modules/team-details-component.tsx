/**
 * TeamDetails component for Teams page
 * Handles member management and inbox sharing within a team
 */
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../utils/api";
import toast from "react-hot-toast";
import type { Team, TeamRole, Inbox } from "../../types";

interface TeamDetailsProps {
    team: Team;
    onUpdate: () => void;
}

export function TeamDetails({ team, onUpdate }: TeamDetailsProps) {
    const { token, user } = useAuth();
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<TeamRole>("MEMBER");
    const [isInviting, setIsInviting] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [myInboxes, setMyInboxes] = useState<Inbox[]>([]);
    const [selectedInboxToShare, setSelectedInboxToShare] = useState("");

    const isOwner = team.ownerId === user?.id;
    const isAdmin = isOwner || team.members?.find(m => m.userId === user?.id)?.role === "ADMIN";

    useEffect(() => {
        if (isSharing && token) {
            api<{ data: Inbox[] }>("/inboxes?personal=true", { token })
                .then(res => setMyInboxes(res.data))
                .catch(err => console.error("Failed to load inboxes", err));
        }
    }, [isSharing, token]);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail || !token) return;

        try {
            await api(`/teams/${team.id}/members`, {
                method: "POST",
                token,
                body: { email: inviteEmail, role: inviteRole }
            });
            toast.success("Đã thêm thành viên");
            setInviteEmail("");
            setIsInviting(false);
            onUpdate();
        } catch (error: unknown) {
            toast.error((error as Error).message || "Lỗi khi thêm thành viên");
        }
    };

    const handleShareInbox = async () => {
        if (!selectedInboxToShare || !token) return;

        try {
            await api(`/teams/${team.id}/inboxes`, {
                method: "POST",
                token,
                body: { inboxId: selectedInboxToShare }
            });
            toast.success("Đã chia sẻ hộp thư");
            setIsSharing(false);
            onUpdate();
        } catch (error: unknown) {
            toast.error((error as Error).message || "Lỗi khi chia sẻ hộp thư");
        }
    };

    const handleUnshareInbox = async (inboxId: string) => {
        if (!window.confirm("Bạn có chắc muốn dừng chia sẻ hộp thư này?") || !token) return;

        try {
            await api(`/teams/${team.id}/inboxes/${inboxId}`, {
                method: "DELETE",
                token
            });
            toast.success("Đã dừng chia sẻ");
            onUpdate();
        } catch {
            toast.error("Lỗi khi dừng chia sẻ");
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!window.confirm("Bạn có chắc muốn xóa thành viên này?") || !token) return;

        try {
            await api(`/teams/${team.id}/members/${memberId}`, {
                method: "DELETE",
                token
            });
            toast.success("Đã xóa thành viên");
            onUpdate();
        } catch {
            toast.error("Lỗi khi xóa thành viên");
        }
    };

    return (
        <div className="bg-nebula-surface border border-nebula-border rounded-2xl overflow-hidden shadow-sm">
            {/* Header */}
            <div className="p-6 border-b border-nebula-border bg-nebula-elevated/30">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold">{team.name}</h2>
                        <p className="text-sm text-nebula-text-muted mt-1">{team.description || "Không có mô tả"}</p>
                    </div>
                    {isOwner && (
                        <button className="text-nebula-text-muted hover:text-danger transition-colors p-2 rounded-lg hover:bg-danger/10">
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            <div className="p-6">
                {/* Members Section */}
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg">Thành viên ({team.members?.length || 0})</h3>
                    {isAdmin && (
                        <button
                            onClick={() => setIsInviting(!isInviting)}
                            className="text-sm text-primary font-medium hover:underline"
                        >
                            + Thêm thành viên
                        </button>
                    )}
                </div>

                {/* Invite Form */}
                {isInviting && (
                    <form onSubmit={handleInvite} className="mb-6 p-4 bg-nebula-elevated rounded-xl border border-nebula-border animate-in fade-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                            <input
                                type="email"
                                placeholder="Email người dùng"
                                className="px-3 py-2 bg-nebula-surface border border-nebula-border rounded-lg text-sm"
                                value={inviteEmail}
                                onChange={e => setInviteEmail(e.target.value)}
                                required
                            />
                            <select
                                className="px-3 py-2 bg-nebula-surface border border-nebula-border rounded-lg text-sm"
                                value={inviteRole}
                                onChange={e => setInviteRole(e.target.value as TeamRole)}
                            >
                                <option value="MEMBER">Thành viên (Member)</option>
                                <option value="ADMIN">Quản trị viên (Admin)</option>
                                <option value="VIEWER">Chỉ xem (Viewer)</option>
                            </select>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsInviting(false)}
                                className="px-3 py-1.5 text-xs text-nebula-text-secondary hover:bg-nebula-surface rounded-lg"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-lg"
                            >
                                Xác nhận
                            </button>
                        </div>
                    </form>
                )}

                {/* Members List */}
                <div className="space-y-3">
                    {team.members?.map(member => (
                        <div key={member.id} className="flex items-center justify-between p-3 bg-nebula-elevated/50 rounded-xl border border-nebula-border/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-nebula-violet/20 text-nebula-violet flex items-center justify-center font-bold">
                                    {member.user?.email.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="text-sm font-medium">{member.user?.email}</div>
                                    <div className="text-xs text-nebula-text-muted">{member.role}</div>
                                </div>
                            </div>
                            {isAdmin && member.userId !== user?.id && member.role !== "OWNER" && (
                                <button
                                    onClick={() => handleRemoveMember(member.id)}
                                    className="p-2 text-nebula-text-muted hover:text-danger rounded-lg transition-colors"
                                >
                                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Shared Inboxes Section */}
                <div className="mt-8">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-lg">Hộp thư đã chia sẻ ({team.sharedInboxes?.length || 0})</h3>
                        {isAdmin && (
                            <button
                                onClick={() => setIsSharing(!isSharing)}
                                className="text-sm text-primary font-medium hover:underline"
                            >
                                + Chia sẻ hộp thư
                            </button>
                        )}
                    </div>

                    {/* Share Inbox Form */}
                    {isSharing && (
                        <div className="mb-6 p-4 bg-nebula-elevated rounded-xl border border-nebula-border animate-in fade-in slide-in-from-top-2">
                            <p className="text-xs text-nebula-text-muted mb-3">Chọn một hộp thư cá nhân của bạn để chia sẻ với toàn bộ thành viên trong nhóm.</p>
                            <div className="flex gap-3">
                                <select
                                    className="flex-1 px-3 py-2 bg-nebula-surface border border-nebula-border rounded-lg text-sm"
                                    value={selectedInboxToShare}
                                    onChange={e => setSelectedInboxToShare(e.target.value)}
                                >
                                    <option value="">-- Chọn hộp thư --</option>
                                    {myInboxes
                                        .filter(i => !team.sharedInboxes?.some(si => si.inboxId === i.id))
                                        .map(inbox => (
                                            <option key={inbox.id} value={inbox.id}>
                                                {inbox.localPart}@{inbox.domain?.name}
                                            </option>
                                        ))
                                    }
                                </select>
                                <button
                                    onClick={handleShareInbox}
                                    disabled={!selectedInboxToShare}
                                    className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg disabled:opacity-50"
                                >
                                    Chia sẻ ngay
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Shared Inboxes Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {team.sharedInboxes?.map(si => (
                            <div key={si.id} className="p-4 bg-nebula-elevated/50 border border-nebula-border rounded-xl flex items-center justify-between group/inbox">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    <div className="text-sm font-medium truncate">
                                        {si.inbox?.localPart}@{si.inbox?.domain?.name}
                                    </div>
                                </div>
                                {isAdmin && (
                                    <button
                                        onClick={() => handleUnshareInbox(si.inboxId)}
                                        className="p-1.5 text-nebula-text-muted hover:text-danger rounded-lg hover:bg-danger/10 opacity-0 group-hover/inbox:opacity-100 transition-all"
                                        title="Dừng chia sẻ"
                                    >
                                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        ))}
                        {team.sharedInboxes?.length === 0 && (
                            <div className="col-span-full p-6 text-center bg-nebula-elevated/20 border border-dashed border-nebula-border rounded-xl text-nebula-text-muted text-sm italic">
                                Chưa có hộp thư nào được chia sẻ với nhóm này
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
