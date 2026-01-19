/**
 * Hook for TeamSettings data and actions
 * Handles teams CRUD, member management, and inbox sharing
 */
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../utils/api";
import { toast } from "react-hot-toast";
import type { Team, TeamRole } from "../../../types";

export interface UseTeamSettingsDataReturn {
    // Data
    teams: Team[];
    loading: boolean;
    selectedTeam: Team | null;
    setSelectedTeam: (team: Team | null) => void;
    // Create team modal state
    isCreateModalOpen: boolean;
    setIsCreateModalOpen: (open: boolean) => void;
    newTeamName: string;
    setNewTeamName: (name: string) => void;
    newTeamDescription: string;
    setNewTeamDescription: (desc: string) => void;
    creating: boolean;
    // Add member modal state
    isAddMemberOpen: boolean;
    setIsAddMemberOpen: (open: boolean) => void;
    memberEmail: string;
    setMemberEmail: (email: string) => void;
    memberRole: TeamRole;
    setMemberRole: (role: TeamRole) => void;
    addingMember: boolean;
    // Share inbox modal state
    isShareInboxOpen: boolean;
    setIsShareInboxOpen: (open: boolean) => void;
    selectedInboxId: string;
    setSelectedInboxId: (id: string) => void;
    sharingInbox: boolean;
    // Actions
    loadTeamDetails: (teamId: string) => Promise<void>;
    handleCreateTeam: () => Promise<void>;
    handleDeleteTeam: (teamId: string) => Promise<void>;
    handleAddMember: () => Promise<void>;
    handleRemoveMember: (memberId: string) => Promise<void>;
    handleShareInbox: () => Promise<void>;
    handleUnshareInbox: (inboxId: string) => Promise<void>;
    // Helpers
    isOwnerOrAdmin: (team: Team) => boolean;
}

export function useTeamSettingsData(): UseTeamSettingsDataReturn {
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

    const loadTeams = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api<{ teams: Team[] }>("/teams", { token });
            setTeams(data?.teams || []);
        } catch {
            toast.error("Không thể tải danh sách nhóm");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (token) loadTeams();
    }, [token, loadTeams]);

    const loadTeamDetails = useCallback(async (teamId: string) => {
        try {
            const data = await api<{ team: Team }>(`/teams/${teamId}`, { token });
            setSelectedTeam(data.team);
        } catch {
            toast.error("Không thể tải chi tiết nhóm");
        }
    }, [token]);

    const handleCreateTeam = useCallback(async () => {
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
            setTeams(prev => [data.team, ...prev]);
            toast.success("Đã tạo nhóm mới");
            setIsCreateModalOpen(false);
            setNewTeamName("");
            setNewTeamDescription("");
        } catch {
            toast.error("Không thể tạo nhóm");
        } finally {
            setCreating(false);
        }
    }, [newTeamName, newTeamDescription, token]);

    const handleDeleteTeam = useCallback(async (teamId: string) => {
        if (!confirm("Xóa nhóm này? Tất cả thành viên sẽ mất quyền truy cập inbox được chia sẻ.")) return;
        try {
            await api(`/teams/${teamId}`, { method: "DELETE", token });
            setTeams(prev => prev.filter(t => t.id !== teamId));
            if (selectedTeam?.id === teamId) setSelectedTeam(null);
            toast.success("Đã xóa nhóm");
        } catch {
            toast.error("Không thể xóa nhóm");
        }
    }, [token, selectedTeam?.id]);

    const handleAddMember = useCallback(async () => {
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
    }, [selectedTeam, memberEmail, memberRole, token, loadTeamDetails]);

    const handleRemoveMember = useCallback(async (memberId: string) => {
        if (!selectedTeam || !confirm("Xóa thành viên này khỏi nhóm?")) return;
        try {
            await api(`/teams/${selectedTeam.id}/members/${memberId}`, { method: "DELETE", token });
            toast.success("Đã xóa thành viên");
            loadTeamDetails(selectedTeam.id);
        } catch {
            toast.error("Không thể xóa thành viên");
        }
    }, [selectedTeam, token, loadTeamDetails]);

    const handleShareInbox = useCallback(async () => {
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
    }, [selectedTeam, selectedInboxId, token, loadTeamDetails]);

    const handleUnshareInbox = useCallback(async (inboxId: string) => {
        if (!selectedTeam || !confirm("Hủy chia sẻ inbox này?")) return;
        try {
            await api(`/teams/${selectedTeam.id}/inboxes/${inboxId}`, { method: "DELETE", token });
            toast.success("Đã hủy chia sẻ inbox");
            loadTeamDetails(selectedTeam.id);
        } catch {
            toast.error("Không thể hủy chia sẻ");
        }
    }, [selectedTeam, token, loadTeamDetails]);

    const isOwnerOrAdmin = useCallback((team: Team): boolean => {
        if (team.ownerId === user?.id) return true;
        return team.members?.some(m => m.userId === user?.id && (m.role === "OWNER" || m.role === "ADMIN")) ?? false;
    }, [user?.id]);

    return {
        teams,
        loading,
        selectedTeam,
        setSelectedTeam,
        isCreateModalOpen,
        setIsCreateModalOpen,
        newTeamName,
        setNewTeamName,
        newTeamDescription,
        setNewTeamDescription,
        creating,
        isAddMemberOpen,
        setIsAddMemberOpen,
        memberEmail,
        setMemberEmail,
        memberRole,
        setMemberRole,
        addingMember,
        isShareInboxOpen,
        setIsShareInboxOpen,
        selectedInboxId,
        setSelectedInboxId,
        sharingInbox,
        loadTeamDetails,
        handleCreateTeam,
        handleDeleteTeam,
        handleAddMember,
        handleRemoveMember,
        handleShareInbox,
        handleUnshareInbox,
        isOwnerOrAdmin,
    };
}
