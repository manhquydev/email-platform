/**
 * Custom hooks for LabelsTab
 */
import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { api } from "../../../utils/api";
import type { Label } from "../../../types";
import { DEFAULT_LABEL_COLOR } from "./labels-tab-utils";

interface UseLabelsOptions {
    effectiveInboxId: string | undefined;
}

/** Hook to manage labels CRUD operations */
export function useLabels({ effectiveInboxId }: UseLabelsOptions) {
    const [labels, setLabels] = useState<Label[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingLabel, setEditingLabel] = useState<Label | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [color, setColor] = useState(DEFAULT_LABEL_COLOR);

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
        setColor(DEFAULT_LABEL_COLOR);
        setEditingLabel(null);
        setIsCreateModalOpen(true);
    };

    const openEditModal = (label: Label) => {
        setName(label.name);
        setColor(label.color || DEFAULT_LABEL_COLOR);
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

    return {
        labels,
        loading,
        isCreateModalOpen,
        setIsCreateModalOpen,
        editingLabel,
        name,
        setName,
        color,
        setColor,
        openCreateModal,
        openEditModal,
        handleSave,
        handleDelete
    };
}
