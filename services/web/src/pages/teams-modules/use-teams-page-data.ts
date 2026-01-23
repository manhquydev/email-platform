/**
 * Hook for Teams page data and actions
 * Handles teams loading and creation
 */
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../utils/api";
import toast from "react-hot-toast";
import type { Team } from "../../types";

export interface UseTeamsPageDataReturn {
    teams: Team[];
    isLoading: boolean;
    isCreating: boolean;
    setIsCreating: (creating: boolean) => void;
    newTeamName: string;
    setNewTeamName: (name: string) => void;
    selectedTeam: Team | null;
    setSelectedTeam: (team: Team | null) => void;
    fetchTeams: () => Promise<void>;
    handleCreateTeam: (e: React.FormEvent) => Promise<void>;
}

export function useTeamsPageData(): UseTeamsPageDataReturn {
    const { token } = useAuth();
    const [teams, setTeams] = useState<Team[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newTeamName, setNewTeamName] = useState("");
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

    const fetchTeams = useCallback(async () => {
        if (!token) return;
        try {
            const res = await api<{ teams: Team[] }>("/teams", { token });
            setTeams(res.teams);
            if (res.teams.length > 0 && !selectedTeam) {
                setSelectedTeam(res.teams[0]);
            }
        } catch (error) {
            console.error(error);
            toast.error("Không thể tải danh sách nhóm");
        } finally {
            setIsLoading(false);
        }
    }, [token, selectedTeam]);

    useEffect(() => {
        fetchTeams();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const handleCreateTeam = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTeamName.trim() || !token) return;

        try {
            await api("/teams", {
                method: "POST",
                token,
                body: { name: newTeamName }
            });
            toast.success("Đã tạo nhóm mới");
            setNewTeamName("");
            setIsCreating(false);
            fetchTeams();
        } catch {
            toast.error("Lỗi khi tạo nhóm");
        }
    }, [newTeamName, token, fetchTeams]);

    return {
        teams,
        isLoading,
        isCreating,
        setIsCreating,
        newTeamName,
        setNewTeamName,
        selectedTeam,
        setSelectedTeam,
        fetchTeams,
        handleCreateTeam,
    };
}
