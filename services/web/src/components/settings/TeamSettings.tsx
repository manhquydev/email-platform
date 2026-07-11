/**
 * TeamSettings - Component for managing teams and sharing inboxes
 * Refactored to use modular hooks and components
 */
import { useAuth } from "../../context/AuthContext";
import type { Inbox } from "../../types";
import {
    useTeamSettingsData,
    CreateTeamModal,
    AddMemberModal,
    ShareInboxModal,
    TeamCard,
    TeamDetailsPanel,
    TeamsListHeader,
    EmptyTeamsState
} from "./team-settings-modules";

interface TeamSettingsProps {
    userInboxes?: Inbox[];
}

export function TeamSettings({ userInboxes = [] }: TeamSettingsProps) {
    const { user } = useAuth();

    const {
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
    } = useTeamSettingsData();

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div>
                <h2 className="text-3xl font-bold text-semantic-text-main mb-2 tracking-tight">Nhóm làm việc</h2>
                <p className="text-semantic-text-muted font-body">Tạo nhóm và chia sẻ inbox với đồng nghiệp.</p>
            </div>

            {/* Teams List */}
            <section className="rounded-xl p-6 bg-semantic-bg-elevated border border-semantic-border border-l-4 border-l-semantic-info/70 shadow-semantic-sm">
                <TeamsListHeader onCreateTeam={() => setIsCreateModalOpen(true)} />

                {loading ? (
                    <div className="text-center py-8 text-semantic-text-muted">Đang tải...</div>
                ) : teams.length === 0 ? (
                    <EmptyTeamsState />
                ) : (
                    <div className="grid gap-3">
                        {teams.map(team => (
                            <TeamCard
                                key={team.id}
                                team={team}
                                isSelected={selectedTeam?.id === team.id}
                                isOwner={team.ownerId === user?.id}
                                onSelect={() => loadTeamDetails(team.id)}
                                onDelete={() => handleDeleteTeam(team.id)}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Team Details Panel */}
            {selectedTeam && (
                <TeamDetailsPanel
                    team={selectedTeam}
                    isOwnerOrAdmin={isOwnerOrAdmin(selectedTeam)}
                    onClose={() => setSelectedTeam(null)}
                    onAddMember={() => setIsAddMemberOpen(true)}
                    onRemoveMember={handleRemoveMember}
                    onShareInbox={() => setIsShareInboxOpen(true)}
                    onUnshareInbox={handleUnshareInbox}
                    hasUserInboxes={userInboxes.length > 0}
                />
            )}

            {/* Modals */}
            <CreateTeamModal
                isOpen={isCreateModalOpen}
                newTeamName={newTeamName}
                setNewTeamName={setNewTeamName}
                newTeamDescription={newTeamDescription}
                setNewTeamDescription={setNewTeamDescription}
                creating={creating}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreateTeam}
            />

            <AddMemberModal
                isOpen={isAddMemberOpen && !!selectedTeam}
                memberEmail={memberEmail}
                setMemberEmail={setMemberEmail}
                memberRole={memberRole}
                setMemberRole={setMemberRole}
                addingMember={addingMember}
                onClose={() => setIsAddMemberOpen(false)}
                onAdd={handleAddMember}
            />

            <ShareInboxModal
                isOpen={isShareInboxOpen && !!selectedTeam}
                selectedInboxId={selectedInboxId}
                setSelectedInboxId={setSelectedInboxId}
                userInboxes={userInboxes}
                sharingInbox={sharingInbox}
                onClose={() => setIsShareInboxOpen(false)}
                onShare={handleShareInbox}
            />
        </div>
    );
}
