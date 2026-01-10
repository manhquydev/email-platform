import { useState, useEffect } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../utils/api";
import { toast } from "react-hot-toast";
import type { Team, TeamMember, Inbox, TeamRole } from "../../types";

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
        } catch (err: any) {
            toast.error(err?.message || "Không thể thêm thành viên");
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
        } catch (err: any) {
            toast.error(err?.message || "Không thể chia sẻ inbox");
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
            OWNER: "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30",
            ADMIN: "bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30",
            MEMBER: "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
            VIEWER: "bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-500/30"
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
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Nhóm làm việc</h2>
                <p className="text-slate-500 dark:text-gray-400 font-body">Tạo nhóm và chia sẻ inbox với đồng nghiệp.</p>
            </div>

            {/* Teams List */}
            <section className="glass-panel rounded-xl p-6 dark:!bg-white/[0.08] border border-slate-200 dark:border-white/15 border-l-4 border-l-cyan-500/70 shadow-sm dark:shadow-none">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                            <span className="material-symbols-outlined text-cyan-500">groups</span>
                            Nhóm của bạn
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-gray-400">Quản lý các nhóm bạn sở hữu hoặc tham gia.</p>
                    </div>
                    <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
                        + Tạo nhóm
                    </Button>
                </div>

                {loading ? (
                    <div className="text-center py-8 text-slate-500 dark:text-gray-500">Đang tải...</div>
                ) : teams.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 dark:bg-black/20 rounded-lg border border-slate-200 dark:border-white/15 border-dashed">
                        <span className="material-symbols-outlined text-slate-400 dark:text-gray-600 text-4xl mb-2">group_off</span>
                        <p className="text-slate-500 dark:text-gray-500">Chưa có nhóm nào. Tạo nhóm để bắt đầu chia sẻ inbox.</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {teams.map(team => (
                            <div
                                key={team.id}
                                onClick={() => loadTeamDetails(team.id)}
                                className={`bg-slate-50 dark:bg-black/30 rounded-lg p-4 border cursor-pointer transition-all ${
                                    selectedTeam?.id === team.id
                                        ? "border-cyan-500 dark:border-cyan-400 ring-1 ring-cyan-500/20"
                                        : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-semibold text-slate-900 dark:text-white truncate">{team.name}</h4>
                                            {team.ownerId === user?.id && getRoleBadge("OWNER")}
                                        </div>
                                        {team.description && (
                                            <p className="text-sm text-slate-500 dark:text-gray-400 truncate">{team.description}</p>
                                        )}
                                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 dark:text-gray-500">
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
                                            className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
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
                <section className="glass-panel rounded-xl p-6 dark:!bg-white/[0.08] border border-slate-200 dark:border-white/15 shadow-sm dark:shadow-none">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{selectedTeam.name}</h3>
                            <p className="text-sm text-slate-500 dark:text-gray-400">{selectedTeam.description || "Không có mô tả"}</p>
                        </div>
                        <button onClick={() => setSelectedTeam(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg">
                            <span className="material-symbols-outlined text-slate-400">close</span>
                        </button>
                    </div>

                    {/* Members */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
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
                                <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-black/30 rounded-lg border border-slate-200 dark:border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-sm font-medium">
                                            {(member.user?.email || "?")[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <span className="text-sm text-slate-900 dark:text-white">{member.user?.email || "Unknown"}</span>
                                            <div className="mt-0.5">{getRoleBadge(member.role)}</div>
                                        </div>
                                    </div>
                                    {isOwnerOrAdmin(selectedTeam) && member.role !== "OWNER" && (
                                        <button
                                            onClick={() => handleRemoveMember(member.id)}
                                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-slate-400 hover:text-red-500 transition-colors"
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
                            <h4 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
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
                            <p className="text-sm text-slate-500 dark:text-gray-500 italic">Chưa có inbox nào được chia sẻ.</p>
                        ) : (
                            <div className="space-y-2">
                                {selectedTeam.sharedInboxes?.map(si => (
                                    <div key={si.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-black/30 rounded-lg border border-slate-200 dark:border-white/10">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-cyan-500 text-[18px]">mail</span>
                                            <span className="text-sm text-slate-900 dark:text-white font-mono">
                                                {si.inbox?.localPart}@{si.inbox?.domain?.name}
                                            </span>
                                        </div>
                                        {isOwnerOrAdmin(selectedTeam) && (
                                            <button
                                                onClick={() => handleUnshareInbox(si.inboxId)}
                                                className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-slate-400 hover:text-red-500 transition-colors"
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
                    <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-white/10 shadow-xl">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Tạo nhóm mới</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-gray-400 mb-1">Tên nhóm *</label>
                                <Input
                                    value={newTeamName}
                                    onChange={e => setNewTeamName(e.target.value)}
                                    placeholder="VD: Team Marketing"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-gray-400 mb-1">Mô tả</label>
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
                    <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-white/10 shadow-xl">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Thêm thành viên</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-gray-400 mb-1">Email *</label>
                                <Input
                                    type="email"
                                    value={memberEmail}
                                    onChange={e => setMemberEmail(e.target.value)}
                                    placeholder="email@example.com"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-gray-400 mb-1">Vai trò</label>
                                <select
                                    value={memberRole}
                                    onChange={e => setMemberRole(e.target.value as TeamRole)}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-white/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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
                    <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-white/10 shadow-xl">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Chia sẻ inbox</h3>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-gray-400 mb-1">Chọn inbox</label>
                            <select
                                value={selectedInboxId}
                                onChange={e => setSelectedInboxId(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-white/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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
