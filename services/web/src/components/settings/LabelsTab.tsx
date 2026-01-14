import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { CirclePicker } from "react-color";
import type { ColorResult } from "react-color";
import { api } from "../../utils/api";
import type { Label, Inbox } from "../../types";
import { GlassCard } from "../ui/GlassCard";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

interface LabelsTabProps {
    inboxId?: string; // Kept for backward compat or direct usage
    inboxes?: Inbox[];
    selectedInboxId?: string;
    onInboxChange?: (id: string) => void;
}

export function LabelsTab({ inboxId, inboxes = [], selectedInboxId, onInboxChange }: LabelsTabProps) {
    // Resolve effective ID
    const effectiveInboxId = selectedInboxId || inboxId;

    const [labels, setLabels] = useState<Label[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingLabel, setEditingLabel] = useState<Label | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [color, setColor] = useState("#6366f1");

    const loadLabels = useCallback(async () => {
        if (!effectiveInboxId) return;
        setLoading(true);
        try {
            const res = await api<{ labels: Label[] }>(`/inboxes/${effectiveInboxId}/labels`);
            setLabels(res.labels);
        } catch (err) {
            console.error("Failed to load labels", err);
            toast.error("Không thể tải danh sách nhãn");
        } finally {
            setLoading(false);
        }
    }, [effectiveInboxId]);

    useEffect(() => {
        if (effectiveInboxId) {
            loadLabels();
        } else {
            setLabels([]);
        }
    }, [effectiveInboxId, loadLabels]);

    const openCreateModal = () => {
        setName("");
        setColor("#6366f1");
        setEditingLabel(null);
        setIsCreateModalOpen(true);
    };

    const openEditModal = (label: Label) => {
        setName(label.name);
        setColor(label.color || "#6366f1");
        setEditingLabel(label);
        setIsCreateModalOpen(true);
    };

    const handleSave = async () => {
        if (!effectiveInboxId) return;
        if (!name.trim()) {
            toast.error("Vui lòng nhập tên nhãn");
            return;
        }

        try {
            if (editingLabel) {
                // Update
                const updated = await api<Label>(`/labels/${editingLabel.id}`, {
                    method: "PATCH",
                    body: { name, color },
                });
                setLabels(labels.map((l) => (l.id === updated.id ? updated : l)));
                toast.success("Đã cập nhật nhãn");
            } else {
                // Create
                const created = await api<Label>("/labels", {
                    method: "POST",
                    body: { inboxId: effectiveInboxId, name, color },
                });
                setLabels([...labels, created]);
                toast.success("Đã tạo nhãn mới");
            }
            setIsCreateModalOpen(false);
        } catch (err) {
            console.error("Failed to save label", err);
            toast.error("Không thể lưu nhãn");
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa nhãn này?")) return;

        try {
            await api(`/labels/${id}`, { method: "DELETE" });
            setLabels(labels.filter((l) => l.id !== id));
            toast.success("Đã xóa nhãn");
        } catch (err) {
            console.error("Failed to delete label", err);
            toast.error("Không thể xóa nhãn");
        }
    };

    if (loading && labels.length === 0) {
        return <div className="p-8 text-center text-nebula-text-muted">Đang tải...</div>;
    }

    if (!effectiveInboxId && (!inboxes || inboxes.length === 0)) {
        return <div className="p-8 text-center text-nebula-text-muted">Vui lòng chọn một hộp thư để quản lý nhãn.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                    <h3 className="text-lg font-semibold text-nebula-text whitespace-nowrap">Danh sách nhãn</h3>
                    {inboxes.length > 0 && onInboxChange && (
                        <select
                            value={selectedInboxId}
                            onChange={(e) => onInboxChange(e.target.value)}
                            className="bg-nebula-elevated border border-nebula-border rounded-lg px-3 py-1.5 text-sm text-nebula-text focus:outline-none focus:border-nebula-violet max-w-[200px]"
                        >
                            {inboxes.map(ib => (
                                <option key={ib.id} value={ib.id}>{ib.localPart}@{ib.domain?.name || '...'}</option>
                            ))}
                        </select>
                    )}
                </div>
                <Button onClick={openCreateModal} variant="primary" size="sm" disabled={!effectiveInboxId}>
                    + Thêm Nhãn
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {labels.map((label) => (
                    <GlassCard key={label.id} className="p-4 flex items-center justify-between group">
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
                            <Button variant="ghost" size="sm" onClick={() => openEditModal(label)}>
                                Sửa
                            </Button>
                            <Button variant="ghost" size="sm" className="text-danger hover:text-danger/80" onClick={() => handleDelete(label.id)}>
                                Xóa
                            </Button>
                        </div>
                    </GlassCard>
                ))}

                {labels.length === 0 && (
                    <div className="col-span-full text-center py-8 text-nebula-text-muted italic">
                        Chưa có nhãn nào được tạo.
                    </div>
                )}
            </div>

            {/* Modal Create/Edit */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <GlassCard className="w-full max-w-md p-6 space-y-6">
                        <h3 className="text-xl font-bold text-nebula-text">
                            {editingLabel ? "Chỉnh sửa Nhãn" : "Tạo Nhãn Mới"}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-nebula-text-muted mb-1">Tên nhãn</label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ví dụ: Công việc, Gia đình..."
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-nebula-text-muted mb-2">Màu sắc</label>
                                <div className="bg-nebula-elevated p-4 rounded-lg flex justify-center">
                                    <CirclePicker
                                        color={color}
                                        onChange={(res: ColorResult) => setColor(res.hex)}
                                        width="100%"
                                        circleSize={24}
                                        circleSpacing={12}
                                        colors={[
                                            "#f44336", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5", "#2196f3",
                                            "#03a9f4", "#00bcd4", "#009688", "#4caf50", "#8bc34a", "#cddc39",
                                            "#ffeb3b", "#ffc107", "#ff9800", "#ff5722", "#795548", "#607d8b"
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
                                Hủy
                            </Button>
                            <Button variant="primary" onClick={handleSave}>
                                Lưu thay đổi
                            </Button>
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
}
