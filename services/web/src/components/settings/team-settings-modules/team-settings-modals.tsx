/**
 * Modal components for TeamSettings
 * CreateTeamModal, AddMemberModal, ShareInboxModal
 */
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import type { Inbox, TeamRole } from "../../../types";

// --- Create Team Modal ---
export interface CreateTeamModalProps {
    isOpen: boolean;
    newTeamName: string;
    setNewTeamName: (name: string) => void;
    newTeamDescription: string;
    setNewTeamDescription: (desc: string) => void;
    creating: boolean;
    onClose: () => void;
    onCreate: () => Promise<void>;
}

export function CreateTeamModal({
    isOpen,
    newTeamName,
    setNewTeamName,
    newTeamDescription,
    setNewTeamDescription,
    creating,
    onClose,
    onCreate,
}: CreateTeamModalProps) {
    if (!isOpen) return null;

    return (
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
                    <Button variant="ghost" onClick={onClose}>Hủy</Button>
                    <Button onClick={onCreate} disabled={creating}>
                        {creating ? "Đang tạo..." : "Tạo nhóm"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// --- Add Member Modal ---
export interface AddMemberModalProps {
    isOpen: boolean;
    memberEmail: string;
    setMemberEmail: (email: string) => void;
    memberRole: TeamRole;
    setMemberRole: (role: TeamRole) => void;
    addingMember: boolean;
    onClose: () => void;
    onAdd: () => Promise<void>;
}

export function AddMemberModal({
    isOpen,
    memberEmail,
    setMemberEmail,
    memberRole,
    setMemberRole,
    addingMember,
    onClose,
    onAdd,
}: AddMemberModalProps) {
    if (!isOpen) return null;

    return (
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
                    <Button variant="ghost" onClick={onClose}>Hủy</Button>
                    <Button onClick={onAdd} disabled={addingMember}>
                        {addingMember ? "Đang thêm..." : "Thêm"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// --- Share Inbox Modal ---
export interface ShareInboxModalProps {
    isOpen: boolean;
    selectedInboxId: string;
    setSelectedInboxId: (id: string) => void;
    userInboxes: Inbox[];
    sharingInbox: boolean;
    onClose: () => void;
    onShare: () => Promise<void>;
}

export function ShareInboxModal({
    isOpen,
    selectedInboxId,
    setSelectedInboxId,
    userInboxes,
    sharingInbox,
    onClose,
    onShare,
}: ShareInboxModalProps) {
    if (!isOpen) return null;

    return (
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
                    <Button variant="ghost" onClick={onClose}>Hủy</Button>
                    <Button onClick={onShare} disabled={sharingInbox || !selectedInboxId}>
                        {sharingInbox ? "Đang chia sẻ..." : "Chia sẻ"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
