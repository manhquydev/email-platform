import { useState, useEffect } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../utils/api";
import { toast } from "react-hot-toast";
import type { Team, Inbox, TeamRole } from "../../types";

interface TeamSettingsProps {
    userInboxes?: Inbox[];
}

export function TeamSettings({ userInboxes = [] }: TeamSettingsProps) {
    const { token, user } = useAuth();

    // Teams state
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

    // Create team modal
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newTeamName, setNewTeamName] = useState("");
    const [newTeamDescription, setNewTeamDescription] = useState("");
    const [creating, setCreating] = useState(false);

    // Add member modal
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [memberEmail, setMemberEmail] = useState("");
    const [memberRole, setMemberRole] = useState<TeamRole>("MEMBER");
    const [addingMember, setAddingMember] = useState(false);

    // Share inbox modal
    const [isShareInboxOpen, setIsShareInboxOpen] = useState(false);
    const [selectedInboxId, setSelectedInboxId] = useState("");
    const [sharingInbox, setSharingInbox] = useState(false);

    useEffect(() => {
        if (token) loadTeams();
    }, [token]);

    const loadTeams = async () => {
        setLoading(true);
        try {
            const data = await api<{ teams: Team[] }>("/teams", { token });
            setTeams(data?.teams || []);
        } catch {
            toast.error("Không thể tải danh sách nhóm");
        } finally {
            setLoading(false);
        }
    };

    const loadTeamDetails = async (teamId: string) => {
        try {
            const data = await api<{ team: Team }>(`/teams/${teamId}`, { token });
            setSelectedTeam(data.team);
        } catch {
            toast.error("Không thể tải chi tiết nhóm");
        }
    };

    const handleCreateTeam = async () => {
        if (!newTeamName.trim()) {
            toast.error("Vui lòng nhập tên nhóm");
            return;
        }
        setCreating(true);
        try {
            const data = await api<{ team: Team }>("/teams", {
                method: "POST",
                token,
                body: { name: newTeamName, description: newTeamDescription }
            });
            setTeams([data.team, ...teams]);
            toast.success("Đã tạo nhóm mới");
            setIsCreateModalOpen(false);
            setNewTeamName("");
            setNewTeamDescription("");
        } catch {
            toast.error("Không thể tạo nhóm");
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteTeam = async (teamId: string) => {
        if (!confirm("Xóa nhóm này? Tất cả thành viên sẽ mất quyền truy cập inbox được chia sẻ.")) return;
        try {
            await api(`/teams/${teamId}`, { method: "DELETE", token });
            setTeams(teams.filter(t => t.id !== teamId));
            if (selectedTeam?.id === teamId) setSelectedTeam(null);
            toast.success("Đã xóa nhóm");
        } catch {
            toast.error("Không thể xóa nhóm");
        }
    };

    const handleAddMember = async () => {
        if (!selectedTeam || !memberEmail.trim()) return;
        setAddingMember(true);
        try {
            await api(`/teams/${selectedTeam.id}/members`, {
                method: "POST",
                token,
                body: { email: memberEmail, role: memberRole }
            });
            toast.success("Đã thêm thành viên");
            setIsAddMemberOpen(false);
            setMemberEmail("");
            setMemberRole("MEMBER");
            loadTeamDetails(selectedTeam.id);
        } catch (err: unknown) {
            toast.error((err as Error)?.message || "Không thể thêm thành viên");
        } finally {
            setAddingMember(false);
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!selectedTeam || !confirm("Xóa thành viên này khỏi nhóm?")) return;
        try {
            await api(`/teams/${selectedTeam.id}/members/${memberId}`, { method: "DELETE", token });
            toast.success("Đã xóa thành viên");
            loadTeamDetails(selectedTeam.id);
        } catch {
            toast.error("Không thể xóa thành viên");
        }
    };

    const handleShareInbox = async () => {
        if (!selectedTeam || !selectedInboxId) return;
        setSharingInbox(true);
        try {
            await api(`/teams/${selectedTeam.id}/inboxes`, {
                method: "POST",
                token,
                body: { inboxId: selectedInboxId }
            });
            toast.success("Đã chia sẻ inbox với nhóm");
            setIsShareInboxOpen(false);
            setSelectedInboxId("");
            loadTeamDetails(selectedTeam.id);
        } catch (err: unknown) {
            toast.error((err as Error)?.message || "Không thể chia sẻ inbox");
        } finally {
            setSharingInbox(false);
        }
    };

    const handleUnshareInbox = async (inboxId: string) => {
        if (!selectedTeam || !confirm("Hủy chia sẻ inbox này?")) return;
        try {
            await api(`/teams/${selectedTeam.id}/inboxes/${inboxId}`, { method: "DELETE", token });
            toast.success("Đã hủy chia sẻ inbox");
            loadTeamDetails(selectedTeam.id);
        } catch {
            toast.error("Không thể hủy chia sẻ");
        }
    };

    const getRoleBadge = (role: TeamRole) => {
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
    };

    const isOwnerOrAdmin = (team: Team) => {
        if (team.ownerId === user?.id) return true;
        return team.members?.some(m => m.userId === user?.id && (m.role === "OWNER" || m.role === "ADMIN"));
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div>
                <h2 className="text-3xl font-bold text-nebula-text mb-2 tracking-tight">Nhóm làm việc</h2>
                <p className="text-nebula-text-muted font-body">Tạo nhóm và chia sẻ inbox với đồng nghiệp.</p>
            </div>

            {/* Teams List */}
            <section className="glass-panel rounded-xl p-6 bg-nebula-surface border border-nebula-border border-l-4 border-l-info/70 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-nebula-text mb-1 flex items-center gap-2">
                            <span className="material-symbols-outlined text-info">groups</span>
                            Nhóm của bạn
                        </h3>
                        <p className="text-sm text-nebula-text-muted">Quản lý các nhóm bạn sở hữu hoặc tham gia.</p>
                    </div>
                    <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
                        + Tạo nhóm
                    </Button>
                </div>

                {loading ? (
                    <div className="text-center py-8 text-nebula-text-muted">Đang tải...</div>
                ) : teams.length === 0 ? (
                    <div className="text-center py-12 bg-nebula-elevated/50 rounded-lg border border-nebula-border border-dashed">
                        <span className="material-symbols-outlined text-nebula-text-muted text-4xl mb-2">group_off</span>
                        <p className="text-nebula-text-muted">Chưa có nhóm nào. Tạo nhóm để bắt đầu chia sẻ inbox.</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {teams.map(team => (
                            <div
                                key={team.id}
                                onClick={() => loadTeamDetails(team.id)}
                                className={`bg-nebula-elevated/50 rounded-lg p-4 border cursor-pointer transition-all ${
                                    selectedTeam?.id === team.id
                                        ? "border-info ring-1 ring-info/20"
                                        : "border-nebula-border hover:border-nebula-border-highlight"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-semibold text-nebula-text truncate">{team.name}</h4>
                                            {team.ownerId === user?.id && getRoleBadge("OWNER")}
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
                                    {team.ownerId === user?.id && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteTeam(team.id); }}
                                            className="p-2 hover:bg-nebula-elevated rounded-md text-nebula-text-muted hover:text-danger transition-colors"
                                            title="Xóa nhóm"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">delete</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Team Details Panel */}
            {selectedTeam && (
                <section className="glass-panel rounded-xl p-6 bg-nebula-surface border border-nebula-border shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-nebula-text mb-1">{selectedTeam.name}</h3>
                            <p className="text-sm text-nebula-text-muted">{selectedTeam.description || "Không có mô tả"}</p>
                        </div>
                        <button onClick={() => setSelectedTeam(null)} className="p-2 hover:bg-nebula-elevated rounded-lg">
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
                            {isOwnerOrAdmin(selectedTeam) && (
                                <Button size="sm" variant="secondary" onClick={() => setIsAddMemberOpen(true)}>
                                    + Thêm
                                </Button>
                            )}
                        </div>
                        <div className="space-y-2">
                            {selectedTeam.members?.map(member => (
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
                                    {isOwnerOrAdmin(selectedTeam) && member.role !== "OWNER" && (
                                        <button
                                            onClick={() => handleRemoveMember(member.id)}
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
                            {isOwnerOrAdmin(selectedTeam) && userInboxes.length > 0 && (
                                <Button size="sm" variant="secondary" onClick={() => setIsShareInboxOpen(true)}>
                                    + Chia sẻ
                                </Button>
                            )}
                        </div>
                        {selectedTeam.sharedInboxes?.length === 0 ? (
                            <p className="text-sm text-nebula-text-muted italic">Chưa có inbox nào được chia sẻ.</p>
                        ) : (
                            <div className="space-y-2">
                                {selectedTeam.sharedInboxes?.map(si => (
                                    <div key={si.id} className="flex items-center justify-between p-3 bg-nebula-elevated/50 rounded-lg border border-nebula-border">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-info text-[18px]">mail</span>
                                            <span className="text-sm text-nebula-text font-mono">
                                                {si.inbox?.localPart}@{si.inbox?.domain?.name}
                                            </span>
                                        </div>
                                        {isOwnerOrAdmin(selectedTeam) && (
                                            <button
                                                onClick={() => handleUnshareInbox(si.inboxId)}
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
            )}

            {/* Create Team Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-nebula-surface rounded-xl p-6 border border-nebula-border shadow-xl">
                        <h3 className="text-xl font-bold text-nebula-text mb-4">Tạo nhóm mới</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-nebula-text-secondary mb-1">Tên nhóm *</label>
                                <Input
                                    value={newTeamName}
                                    onChange={e => setNewTeamName(e.target.value)}
                                    placeholder="VD: Team Marketing"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-nebula-text-secondary mb-1">Mô tả</label>
                                <Input
                                    value={newTeamDescription}
                                    onChange={e => setNewTeamDescription(e.target.value)}
                                    placeholder="Mô tả ngắn về nhóm"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Hủy</Button>
                            <Button onClick={handleCreateTeam} disabled={creating}>
                                {creating ? "Đang tạo..." : "Tạo nhóm"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Member Modal */}
            {isAddMemberOpen && selectedTeam && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-nebula-surface rounded-xl p-6 border border-nebula-border shadow-xl">
                        <h3 className="text-xl font-bold text-nebula-text mb-4">Thêm thành viên</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-nebula-text-secondary mb-1">Email *</label>
                                <Input
                                    type="email"
                                    value={memberEmail}
                                    onChange={e => setMemberEmail(e.target.value)}
                                    placeholder="email@example.com"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-nebula-text-secondary mb-1">Vai trò</label>
                                <select
                                    value={memberRole}
                                    onChange={e => setMemberRole(e.target.value as TeamRole)}
                                    className="w-full px-3 py-2 rounded-lg border border-nebula-border bg-nebula-surface text-nebula-text"
                                >
                                    <option value="VIEWER">Viewer - Chỉ xem</option>
                                    <option value="MEMBER">Member - Xem và trả lời</option>
                                    <option value="ADMIN">Admin - Quản lý nhóm</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <Button variant="ghost" onClick={() => setIsAddMemberOpen(false)}>Hủy</Button>
                            <Button onClick={handleAddMember} disabled={addingMember}>
                                {addingMember ? "Đang thêm..." : "Thêm"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Inbox Modal */}
            {isShareInboxOpen && selectedTeam && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-nebula-surface rounded-xl p-6 border border-nebula-border shadow-xl">
                        <h3 className="text-xl font-bold text-nebula-text mb-4">Chia sẻ inbox</h3>
                        <div>
                            <label className="block text-sm font-medium text-nebula-text-secondary mb-1">Chọn inbox</label>
                            <select
                                value={selectedInboxId}
                                onChange={e => setSelectedInboxId(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-nebula-border bg-nebula-surface text-nebula-text"
                            >
                                <option value="">-- Chọn inbox --</option>
                                {userInboxes.map(inbox => (
                                    <option key={inbox.id} value={inbox.id}>
                                        {inbox.localPart}@{inbox.domain?.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <Button variant="ghost" onClick={() => setIsShareInboxOpen(false)}>Hủy</Button>
                            <Button onClick={handleShareInbox} disabled={sharingInbox || !selectedInboxId}>
                                {sharingInbox ? "Đang chia sẻ..." : "Chia sẻ"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
