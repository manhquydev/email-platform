/**
 * UI components for LabelsTab
 */
import { CirclePicker } from "react-color";
import type { ColorResult } from "react-color";
import type { Inbox } from "../../../types";
import { GlassCard } from "../../ui/GlassCard";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { type Label, LABEL_COLORS } from "./labels-tab-utils";

/** Loading state */
export function LoadingState() {
    return <div className="p-8 text-center text-nebula-text-muted">Đang tải...</div>;
}

/** No inbox selected state */
export function NoInboxState() {
    return <div className="p-8 text-center text-nebula-text-muted">Vui lòng chọn một hộp thư để quản lý nhãn.</div>;
}

/** Empty labels state */
export function EmptyLabelsState() {
    return (
        <div className="col-span-full text-center py-8 text-nebula-text-muted italic">
            Chưa có nhãn nào được tạo.
        </div>
    );
}

/** Inbox selector dropdown */
interface InboxSelectorProps {
    inboxes: Inbox[];
    selectedInboxId?: string;
    onInboxChange: (id: string) => void;
}

export function InboxSelector({ inboxes, selectedInboxId, onInboxChange }: InboxSelectorProps) {
    return (
        <select
            value={selectedInboxId}
            onChange={(e) => onInboxChange(e.target.value)}
            className="bg-nebula-elevated border border-nebula-border rounded-lg px-3 py-1.5 text-sm text-nebula-text focus:outline-none focus:border-nebula-violet max-w-[200px]"
        >
            {inboxes.map(ib => (
                <option key={ib.id} value={ib.id}>{ib.localPart}@{ib.domain?.name || '...'}</option>
            ))}
        </select>
    );
}

/** Single label card */
interface LabelCardProps {
    label: Label;
    onEdit: () => void;
    onDelete: () => void;
}

export function LabelCard({ label, onEdit, onDelete }: LabelCardProps) {
    return (
        <GlassCard className="p-4 flex items-center justify-between group">
            <div className="flex items-center gap-3">
                <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: label.color || "#ccc" }}
                />
                <div>
                    <div className="font-medium text-nebula-text">{label.name}</div>
                    <div className="text-xs text-nebula-text-muted">
                        {label._count?.messages || 0} email
                    </div>
                </div>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" onClick={onEdit}>
                    Sửa
                </Button>
                <Button variant="ghost" size="sm" className="text-danger hover:text-danger/80" onClick={onDelete}>
                    Xóa
                </Button>
            </div>
        </GlassCard>
    );
}

/** Create/Edit label modal */
interface LabelModalProps {
    isEditing: boolean;
    name: string;
    onNameChange: (val: string) => void;
    color: string;
    onColorChange: (val: string) => void;
    onSave: () => void;
    onClose: () => void;
}

export function LabelModal({ isEditing, name, onNameChange, color, onColorChange, onSave, onClose }: LabelModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <GlassCard className="w-full max-w-md p-6 space-y-6">
                <h3 className="text-xl font-bold text-nebula-text">
                    {isEditing ? "Chỉnh sửa Nhãn" : "Tạo Nhãn Mới"}
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-nebula-text-muted mb-1">Tên nhãn</label>
                        <Input
                            value={name}
                            onChange={(e) => onNameChange(e.target.value)}
                            placeholder="Ví dụ: Công việc, Gia đình..."
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-nebula-text-muted mb-2">Màu sắc</label>
                        <div className="bg-nebula-elevated p-4 rounded-lg flex justify-center">
                            <CirclePicker
                                color={color}
                                onChange={(res: ColorResult) => onColorChange(res.hex)}
                                width="100%"
                                circleSize={24}
                                circleSpacing={12}
                                colors={LABEL_COLORS}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Button variant="ghost" onClick={onClose}>
                        Hủy
                    </Button>
                    <Button variant="primary" onClick={onSave}>
                        Lưu thay đổi
                    </Button>
                </div>
            </GlassCard>
        </div>
    );
}
