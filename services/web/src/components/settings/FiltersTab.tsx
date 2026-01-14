import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { api } from "../../utils/api";
import type {
    EmailFilter,
    FilterField,
    FilterOperator,
    FilterActionType,
    Label,
    FilterCondition,
    FilterAction,
    Inbox
} from "../../types";
import { GlassCard } from "../ui/GlassCard";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

interface FiltersTabProps {
    inboxId?: string;
    inboxes?: Inbox[];
    selectedInboxId?: string;
    onInboxChange?: (id: string) => void;
}

const FIELD_OPTIONS: { value: FilterField; label: string }[] = [
    { value: "FROM", label: "Người gửi (From)" },
    { value: "TO", label: "Người nhận (To)" },
    { value: "SUBJECT", label: "Tiêu đề (Subject)" },
    { value: "BODY", label: "Nội dung (Body)" },
    { value: "HAS_ATTACHMENT", label: "Có đính kèm" },
];

const OPERATOR_OPTIONS: { value: FilterOperator; label: string }[] = [
    { value: "CONTAINS", label: "Chứa" },
    { value: "NOT_CONTAINS", label: "Không chứa" },
    { value: "EQUALS", label: "Bằng chính xác" },
    { value: "NOT_EQUALS", label: "Không bằng" },
    { value: "STARTS_WITH", label: "Bắt đầu bằng" },
    { value: "ENDS_WITH", label: "Kết thúc bằng" },
    { value: "REGEX", label: "Biểu thức chính quy (Regex)" },
];

const ACTION_OPTIONS: { value: FilterActionType; label: string }[] = [
    { value: "MOVE_TO_FOLDER", label: "Di chuyển tới thư mục" }, // Currently UI logic might need folder list, but we can simplify to 'Inbox' | 'Spam' | 'Archive'? Backend allows generic folder ID or 'INBOX' etc.
    { value: "ADD_LABEL", label: "Gán nhãn" },
    { value: "REMOVE_LABEL", label: "Gỡ nhãn" },
    { value: "MARK_READ", label: "Đánh dấu đã đọc" },
    { value: "MARK_SPAM", label: "Đánh dấu Spam" },
    { value: "DELETE", label: "Xóa email" },
    { value: "FORWARD", label: "Chuyển tiếp tới" },
];

export function FiltersTab({ inboxId, inboxes = [], selectedInboxId, onInboxChange }: FiltersTabProps) {
    // Resolve effective ID
    const effectiveInboxId = selectedInboxId || inboxId;

    const [filters, setFilters] = useState<EmailFilter[]>([]);
    const [labels, setLabels] = useState<Label[]>([]); // Needed for 'ADD_LABEL' action
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFilter, setEditingFilter] = useState<EmailFilter | null>(null);

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
        setConditions(filter.conditions); // Don't reference directly if mutating, but here we replace state
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

    // --- Form Helpers ---

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
        // If changing type, reset value potentially? For now just set.
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

    if (loading && filters.length === 0) return <div className="p-8 text-center text-nebula-text-muted">Đang tải...</div>;

    if (!effectiveInboxId && (!inboxes || inboxes.length === 0)) {
        return <div className="p-8 text-center text-nebula-text-muted">Vui lòng chọn hộp thư.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                    <h3 className="text-lg font-semibold text-nebula-text whitespace-nowrap">Bộ lọc tự động</h3>
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
                    + Thêm Bộ lọc
                </Button>
            </div>

            <div className="space-y-4">
                {filters.map(filter => (
                    <GlassCard key={filter.id} className="p-4 flex flex-col md:flex-row justify-between gap-4 group">
                        <div>
                            <div className="font-semibold text-nebula-text mb-1">{filter.name}</div>
                            <div className="text-sm text-nebula-text-muted space-y-1">
                                <div>
                                    <span className="text-nebula-text-secondary font-medium">Khi {filter.matchType === 'ALL' ? 'tất cả' : 'bất kỳ'}: </span>
                                    {filter.conditions.map((c, i) => {
                                        const fieldLabel = FIELD_OPTIONS.find(o => o.value === c.field)?.label || c.field;
                                        const opLabel = OPERATOR_OPTIONS.find(o => o.value === c.operator)?.label.toLowerCase() || c.operator.toLowerCase();
                                        return (
                                            <span key={i} className="inline-block bg-nebula-elevated px-2 py-0.5 rounded text-xs mr-2 border border-nebula-border">
                                                {fieldLabel} {opLabel} "{c.value}"
                                            </span>
                                        );
                                    })}
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-nebula-violet font-medium">Thì: </span>
                                    {filter.actions.map((a, i) => {
                                        const actionLabel = ACTION_OPTIONS.find(o => o.value === a.type)?.label || a.type;
                                        return (
                                            <span key={i} className="inline-block bg-nebula-violet/20 text-nebula-violet px-2 py-0.5 rounded text-xs border border-nebula-violet/30">
                                                {actionLabel} {a.value ? `(${a.value})` : ''}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="sm" onClick={() => openEditModal(filter)}>Sửa</Button>
                            <Button variant="ghost" size="sm" className="text-danger hover:text-danger/80" onClick={() => handleDelete(filter.id)}>Xóa</Button>
                        </div>
                    </GlassCard>
                ))}
                {filters.length === 0 && (
                    <div className="text-center py-10 border border-dashed border-nebula-border rounded-xl text-nebula-text-muted">
                        Chưa có bộ lọc nào. Hãy tạo bộ lọc đầu tiên để tự động hóa hộp thư của bạn.
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                    <div className="min-h-full py-8 flex items-center justify-center w-full">
                        <GlassCard className="w-full max-w-2xl p-6 space-y-6 relative animate-fade-in-up">
                            <h3 className="text-xl font-bold text-nebula-text">
                                {editingFilter ? "Chỉnh sửa Bộ lọc" : "Tạo Bộ lọc Mới"}
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-nebula-text-muted mb-1">Tên bộ lọc</label>
                                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="VD: Hóa đơn Amazon" />
                                </div>

                                {/* Conditions Section */}
                                <div className="bg-nebula-elevated p-4 rounded-xl border border-nebula-border space-y-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-semibold text-nebula-text">Điều kiện</span>
                                        <select
                                            value={matchType}
                                            onChange={(e) => setMatchType(e.target.value as "ALL" | "ANY")}
                                            className="bg-nebula-surface border border-nebula-border rounded px-2 py-1 text-xs text-nebula-text focus:outline-none focus:border-nebula-violet"
                                        >
                                            <option value="ALL">Thỏa mãn TẤT CẢ (AND)</option>
                                            <option value="ANY">Thỏa mãn BẤT KỲ (OR)</option>
                                        </select>
                                    </div>

                                    {conditions.map((cond, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <select
                                                value={cond.field}
                                                onChange={e => updateCondition(idx, 'field', e.target.value)}
                                                className="w-1/3 bg-nebula-surface border border-nebula-border rounded h-10 px-3 text-sm text-nebula-text"
                                            >
                                                {FIELD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                            </select>
                                            <select
                                                value={cond.operator}
                                                onChange={e => updateCondition(idx, 'operator', e.target.value)}
                                                className="w-1/3 bg-nebula-surface border border-nebula-border rounded h-10 px-3 text-sm text-nebula-text"
                                            >
                                                {OPERATOR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                            </select>
                                            <Input
                                                className="w-1/3"
                                                value={cond.value}
                                                onChange={e => updateCondition(idx, 'value', e.target.value)}
                                                placeholder="Giá trị..."
                                            />
                                            <button onClick={() => removeCondition(idx)} className="text-nebula-text-muted hover:text-danger p-2">×</button>
                                        </div>
                                    ))}
                                    <Button variant="ghost" size="sm" onClick={addCondition}>+ Thêm điều kiện</Button>
                                </div>

                                {/* Actions Section */}
                                <div className="bg-nebula-elevated p-4 rounded-xl border border-nebula-border space-y-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-semibold text-nebula-text">Hành động</span>
                                    </div>

                                    {actions.map((act, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <select
                                                value={act.type}
                                                onChange={e => updateAction(idx, 'type', e.target.value)}
                                                className="w-1/3 bg-nebula-surface border border-nebula-border rounded h-10 px-3 text-sm text-nebula-text"
                                            >
                                                {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                            </select>

                                            {/* Dynamic Value Input based on Type */}
                                            <div className="w-2/3 flex gap-2">
                                                {(act.type === 'ADD_LABEL' || act.type === 'REMOVE_LABEL') ? (
                                                    <select
                                                        value={act.value || ""}
                                                        onChange={e => updateAction(idx, 'value', e.target.value)}
                                                        className="w-full bg-nebula-surface border border-nebula-border rounded h-10 px-3 text-sm text-nebula-text"
                                                    >
                                                        <option value="">-- Chọn nhãn --</option>
                                                        {labels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                                    </select>
                                                ) : (act.type === 'FORWARD' || act.type === 'MOVE_TO_FOLDER') ? (
                                                    <Input
                                                        value={act.value || ""}
                                                        onChange={e => updateAction(idx, 'value', e.target.value)}
                                                        placeholder={act.type === 'FORWARD' ? "Email nhận..." : "Folder ID..."}
                                                        className="w-full"
                                                    />
                                                ) : (
                                                    <div className="w-full h-10 flex items-center px-3 text-nebula-text-muted text-sm italic bg-nebula-surface/50 rounded border border-transparent">
                                                        Không cần tham số
                                                    </div>
                                                )}
                                            </div>

                                            <button onClick={() => removeAction(idx)} className="text-nebula-text-muted hover:text-danger p-2">×</button>
                                        </div>
                                    ))}
                                    <Button variant="ghost" size="sm" onClick={addAction}>+ Thêm hành động</Button>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-nebula-border">
                                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Hủy</Button>
                                <Button variant="primary" onClick={handleSave}>Lưu Bộ lọc</Button>
                            </div>
                        </GlassCard>
                    </div>
                </div>
            )}
        </div>
    );
}
