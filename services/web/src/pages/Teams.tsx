/**
 * Teams - Page for managing teams and collaboration
 * Refactored to use modular hooks and components
 */
import {
    useTeamsPageData,
    TeamDetails,
    TeamsPageHeader,
    CreateTeamForm,
    TeamListItem,
    EmptyTeamsState,
    NoTeamSelectedState,
    TeamsLoadingState
} from "./teams-modules";

export function Teams() {
    const {
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
    } = useTeamsPageData();

    if (isLoading) {
        return <TeamsLoadingState />;
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <TeamsPageHeader onCreateClick={() => setIsCreating(true)} />

            {isCreating && (
                <CreateTeamForm
                    newTeamName={newTeamName}
                    setNewTeamName={setNewTeamName}
                    onSubmit={handleCreateTeam}
                    onCancel={() => setIsCreating(false)}
                />
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Team List Sidebar */}
                <div className="md:col-span-1 space-y-2">
                    <h3 className="text-xs font-bold text-nebula-text-muted uppercase tracking-widest px-3 mb-4">Danh sách nhóm</h3>
                    {teams.map(team => (
                        <TeamListItem
                            key={team.id}
                            team={team}
                            isSelected={selectedTeam?.id === team.id}
                            onSelect={() => setSelectedTeam(team)}
                        />
                    ))}

                    {teams.length === 0 && <EmptyTeamsState />}
                </div>

                {/* Team Details */}
                <div className="md:col-span-3">
                    {selectedTeam ? (
                        <TeamDetails team={selectedTeam} onUpdate={fetchTeams} />
                    ) : (
                        <NoTeamSelectedState />
                    )}
                </div>
            </div>
        </div>
    );
}
