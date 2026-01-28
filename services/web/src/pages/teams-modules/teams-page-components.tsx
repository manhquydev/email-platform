/**
 * UI components for Teams page
 * Dark theme with monochrome outline icons (Lucide-style)
 * Glassmorphism cards with compact professional layout
 */
import type { Team } from "../../types";

// ============================================
// ICON COMPONENTS - Monochrome Outline Style
// ============================================

/** Plus icon - add action */
function IconPlus({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/** Users icon - team/group */
function IconUsers({ className = "w-5 h-5" }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/** Close icon - X mark */
function IconClose({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/** Loader icon - spinning */
function IconLoader({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={`${className} animate-spin`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
        </svg>
    );
}

// ============================================
// PAGE HEADER
// ============================================

export interface TeamsPageHeaderProps {
    onCreateClick: () => void;
}

export function TeamsPageHeader({ onCreateClick }: TeamsPageHeaderProps) {
    return (
        <div className="flex justify-between items-center mb-6">
            <div>
                <h1 className="text-xl font-bold text-zinc-100">Quản lý nhóm</h1>
                <p className="text-sm text-zinc-500 mt-0.5">Hợp tác và chia sẻ hộp thư với đồng nghiệp</p>
            </div>
            <button
                onClick={onCreateClick}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-900 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors"
            >
                <IconPlus className="w-4 h-4" />
                Tạo nhóm mới
            </button>
        </div>
    );
}

// ============================================
// CREATE TEAM FORM
// ============================================

export interface CreateTeamFormProps {
    newTeamName: string;
    setNewTeamName: (name: string) => void;
    onSubmit: (e: React.FormEvent) => Promise<void>;
    onCancel: () => void;
    isSubmitting?: boolean;
}

export function CreateTeamForm({ newTeamName, setNewTeamName, onSubmit, onCancel, isSubmitting }: CreateTeamFormProps) {
    return (
        <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-800/30">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                        <IconUsers className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <h2 className="text-sm font-semibold text-zinc-200">Tạo nhóm mới</h2>
                </div>
                <button
                    onClick={onCancel}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                    <IconClose className="w-4 h-4" />
                </button>
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className="p-4">
                <div className="flex gap-3">
                    <input
                        autoFocus
                        type="text"
                        placeholder="Tên nhóm (v.d. Marketing, Dev Team...)"
                        className="flex-1 px-3 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 transition-all"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                    />
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || !newTeamName.trim()}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-900 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                        {isSubmitting ? (
                            <>
                                <IconLoader className="w-3.5 h-3.5" />
                                Đang tạo...
                            </>
                        ) : (
                            <>
                                <IconPlus className="w-3.5 h-3.5" />
                                Tạo nhóm
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

// ============================================
// TEAM LIST ITEM
// ============================================

export interface TeamListItemProps {
    team: Team;
    isSelected: boolean;
    onSelect: () => void;
}

export function TeamListItem({ team, isSelected, onSelect }: TeamListItemProps) {
    const memberCount = team._count?.members || 0;

    return (
        <button
            onClick={onSelect}
            className={`group w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 border ${
                isSelected
                    ? "bg-cyan-500/10 border-cyan-500/20 ring-1 ring-cyan-500/20"
                    : "bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900/70 hover:border-zinc-700"
            }`}
        >
            <div className="flex items-center gap-3">
                <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                    isSelected
                        ? "bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/30"
                        : "bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700"
                }`}>
                    {team.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                    <div className={`text-sm font-medium truncate ${
                        isSelected ? "text-cyan-300" : "text-zinc-200"
                    }`}>
                        {team.name}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                        {memberCount} thành viên
                    </div>
                </div>
            </div>
        </button>
    );
}

// ============================================
// EMPTY STATES
// ============================================

export function EmptyTeamsState() {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-6 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30">
            <div className="w-12 h-12 rounded-xl bg-zinc-800/50 border border-zinc-700 flex items-center justify-center mb-4">
                <IconUsers className="w-6 h-6 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-500 text-center">Bạn chưa tham gia nhóm nào</p>
        </div>
    );
}

export function NoTeamSelectedState() {
    return (
        <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-zinc-800 bg-zinc-900/50">
            <div className="w-14 h-14 rounded-xl bg-zinc-800/50 border border-zinc-700 flex items-center justify-center mb-4">
                <IconUsers className="w-7 h-7 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-500">Chọn một nhóm để xem chi tiết</p>
        </div>
    );
}

// ============================================
// LOADING STATE
// ============================================

export function TeamsLoadingState() {
    return (
        <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
                <IconLoader className="w-6 h-6 text-cyan-400" />
                <span className="text-sm text-zinc-500">Đang tải...</span>
            </div>
        </div>
    );
}
