/**
 * UI components for Teams page
 * TeamListItem, CreateTeamForm, EmptyTeamsState, PageHeader
 */
import type { Team } from "../../types";

// --- Page Header ---
export interface TeamsPageHeaderProps {
    onCreateClick: () => void;
}

export function TeamsPageHeader({ onCreateClick }: TeamsPageHeaderProps) {
    return (
        <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-2xl font-bold text-nebula-text">Quản lý nhóm</h1>
                <p className="text-nebula-text-muted mt-1">Hợp tác và chia sẻ hộp thư với đồng nghiệp</p>
            </div>
            <button
                onClick={onCreateClick}
                className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Tạo nhóm mới
            </button>
        </div>
    );
}

// --- Create Team Form ---
export interface CreateTeamFormProps {
    newTeamName: string;
    setNewTeamName: (name: string) => void;
    onSubmit: (e: React.FormEvent) => Promise<void>;
    onCancel: () => void;
}

export function CreateTeamForm({ newTeamName, setNewTeamName, onSubmit, onCancel }: CreateTeamFormProps) {
    return (
        <div className="mb-8 p-6 bg-nebula-surface border border-nebula-border rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Tạo nhóm mới</h2>
            <form onSubmit={onSubmit} className="flex gap-3">
                <input
                    autoFocus
                    type="text"
                    placeholder="Tên nhóm (v.d. Marketing, Dev Team...)"
                    className="flex-1 px-4 py-2 bg-nebula-elevated border border-nebula-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                />
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-nebula-text-secondary hover:bg-nebula-elevated rounded-lg transition-colors"
                >
                    Hủy
                </button>
                <button
                    type="submit"
                    className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                    Tạo nhóm
                </button>
            </form>
        </div>
    );
}

// --- Team List Item ---
export interface TeamListItemProps {
    team: Team;
    isSelected: boolean;
    onSelect: () => void;
}

export function TeamListItem({ team, isSelected, onSelect }: TeamListItemProps) {
    return (
        <button
            onClick={onSelect}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all border ${
                isSelected
                    ? "bg-primary/10 border-primary/20 text-primary font-medium"
                    : "bg-nebula-surface border-transparent text-nebula-text-secondary hover:border-nebula-border"
            }`}
        >
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                    isSelected ? "bg-primary text-white" : "bg-nebula-elevated text-nebula-text-muted"
                }`}>
                    {team.name.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                    <div className="truncate">{team.name}</div>
                    <div className="text-[10px] opacity-60 uppercase">{team._count?.members || 0} thành viên</div>
                </div>
            </div>
        </button>
    );
}

// --- Empty Teams State ---
export function EmptyTeamsState() {
    return (
        <div className="p-8 text-center bg-nebula-surface border border-dashed border-nebula-border rounded-xl">
            <p className="text-sm text-nebula-text-muted italic">Bạn chưa tham gia nhóm nào</p>
        </div>
    );
}

// --- No Team Selected State ---
export function NoTeamSelectedState() {
    return (
        <div className="h-64 flex flex-col items-center justify-center bg-nebula-surface border border-nebula-border rounded-2xl text-nebula-text-muted">
            <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24" className="mb-4 opacity-20">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p>Chọn một nhóm để xem chi tiết</p>
        </div>
    );
}

// --- Loading State ---
export function TeamsLoadingState() {
    return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );
}
