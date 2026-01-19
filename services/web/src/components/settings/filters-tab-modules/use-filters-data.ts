/**
 * Custom hook for FiltersTab data and actions
 */
import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { api } from "../../../utils/api";
import type { EmailFilter, Label, FilterCondition, FilterAction } from "../../../types";

/** Test filter result from API */
export interface FilterTestResult {
    matches: boolean;
    filter: { id: string; name: string };
    allMatchingFilters: { id: string; name: string }[];
}

export function useFiltersData(effectiveInboxId: string | undefined) {
    const [filters, setFilters] = useState<EmailFilter[]>([]);
    const [labels, setLabels] = useState<Label[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFilter, setEditingFilter] = useState<EmailFilter | null>(null);

    // Test filter state
    const [isTestModalOpen, setIsTestModalOpen] = useState(false);
    const [testingFilter, setTestingFilter] = useState<EmailFilter | null>(null);
    const [testResult, setTestResult] = useState<FilterTestResult | null>(null);
    const [testLoading, setTestLoading] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [matchType, setMatchType] = useState<"ALL" | "ANY">("ALL");
    const [conditions, setConditions] = useState<FilterCondition[]>([
        { field: "FROM", operator: "CONTAINS", value: "" }
    ]);
    const [actions, setActions] = useState<FilterAction[]>([
        { type: "MARK_READ" }
    ]);

    const loadData = useCallback(async () => {
        if (!effectiveInboxId) return;
        setLoading(true);
        try {
            const [filterRes, labelRes] = await Promise.all([
                api<{ filters: EmailFilter[] }>(`/inboxes/${effectiveInboxId}/filters`),
                api<{ labels: Label[] }>(`/inboxes/${effectiveInboxId}/labels`)
            ]);
            setFilters(filterRes.filters);
            setLabels(labelRes.labels);
        } catch (err) {
            console.error("Failed to load filters data", err);
            toast.error("Không thể tải danh sách bộ lọc");
        } finally {
            setLoading(false);
        }
    }, [effectiveInboxId]);

    useEffect(() => {
        if (effectiveInboxId) {
            loadData();
        } else {
            setFilters([]);
        }
    }, [effectiveInboxId, loadData]);

    const openCreateModal = () => {
        setEditingFilter(null);
        setName("");
        setMatchType("ALL");
        setConditions([{ field: "FROM", operator: "CONTAINS", value: "" }]);
        setActions([{ type: "MARK_READ" }]);
        setIsModalOpen(true);
    };

    const openEditModal = (filter: EmailFilter) => {
        setEditingFilter(filter);
        setName(filter.name);
        setMatchType(filter.matchType);
        setConditions(filter.conditions);
        setActions(filter.actions);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!effectiveInboxId) return;
        if (!name.trim()) {
            toast.error("Vui lòng nhập tên bộ lọc");
            return;
        }

        const payload = {
            inboxId: effectiveInboxId,
            name,
            matchType,
            conditions,
            actions,
            isEnabled: true
        };

        try {
            if (editingFilter) {
                const updated = await api<EmailFilter>(`/filters/${editingFilter.id}`, {
                    method: "PATCH",
                    body: payload
                });
                setFilters(filters.map(f => f.id === updated.id ? updated : f));
                toast.success("Đã cập nhật bộ lọc");
            } else {
                const created = await api<EmailFilter>("/filters", {
                    method: "POST",
                    body: payload
                });
                setFilters([...filters, created]);
                toast.success("Đã tạo bộ lọc mới");
            }
            setIsModalOpen(false);
        } catch (err) {
            console.error("Failed to save filter", err);
            toast.error("Không thể lưu bộ lọc");
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Xóa bộ lọc này?")) return;
        try {
            await api(`/filters/${id}`, { method: "DELETE" });
            setFilters(filters.filter(f => f.id !== id));
            toast.success("Đã xóa bộ lọc");
        } catch {
            toast.error("Lỗi khi xóa bộ lọc");
        }
    };

    // Form Helpers
    const updateCondition = (idx: number, field: keyof FilterCondition, val: string) => {
        const newConditions = [...conditions];
        newConditions[idx] = { ...newConditions[idx], [field]: val };
        setConditions(newConditions);
    };

    const addCondition = () => {
        setConditions([...conditions, { field: "SUBJECT", operator: "CONTAINS", value: "" }]);
    };

    const removeCondition = (idx: number) => {
        if (conditions.length === 1) return;
        setConditions(conditions.filter((_, i) => i !== idx));
    };

    const updateAction = (idx: number, field: keyof FilterAction, val: string) => {
        const newActions = [...actions];
        (newActions[idx] as unknown as Record<string, string>) = { ...newActions[idx], [field]: val };
        setActions(newActions);
    };

    const addAction = () => {
        setActions([...actions, { type: "MARK_READ" }]);
    };

    const removeAction = (idx: number) => {
        if (actions.length === 1) return;
        setActions(actions.filter((_, i) => i !== idx));
    };

    const closeModal = () => setIsModalOpen(false);

    // Test filter functions
    const openTestModal = (filter: EmailFilter) => {
        setTestingFilter(filter);
        setTestResult(null);
        setIsTestModalOpen(true);
    };

    const closeTestModal = () => {
        setIsTestModalOpen(false);
        setTestingFilter(null);
        setTestResult(null);
    };

    const handleTestFilter = async (testData: {
        fromAddress?: string;
        toAddress?: string;
        subject?: string;
        body?: string;
        hasAttachment?: boolean;
    }) => {
        if (!testingFilter) return;
        setTestLoading(true);
        try {
            const result = await api<FilterTestResult>(`/filters/${testingFilter.id}/test`, {
                method: "POST",
                body: testData
            });
            setTestResult(result);
        } catch (err) {
            console.error("Failed to test filter", err);
            toast.error("Không thể kiểm tra bộ lọc");
        } finally {
            setTestLoading(false);
        }
    };

    return {
        filters,
        labels,
        loading,
        isModalOpen,
        editingFilter,
        name,
        setName,
        matchType,
        setMatchType,
        conditions,
        actions,
        openCreateModal,
        openEditModal,
        handleSave,
        handleDelete,
        updateCondition,
        addCondition,
        removeCondition,
        updateAction,
        addAction,
        removeAction,
        closeModal,
        // Test filter
        isTestModalOpen,
        testingFilter,
        testResult,
        testLoading,
        openTestModal,
        closeTestModal,
        handleTestFilter
    };
}
