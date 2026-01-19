/**
 * UI components for FiltersTab
 */
import { useState } from "react";
import type { EmailFilter, FilterCondition, FilterAction, Label } from "../../../types";
import { GlassCard } from "../../ui/GlassCard";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { FIELD_OPTIONS, OPERATOR_OPTIONS, ACTION_OPTIONS } from "./filter-constants";

// --- Filter Card ---
interface FilterCardProps {
    filter: EmailFilter;
    onEdit: () => void;
    onDelete: () => void;
    onTest: () => void;
}

export function FilterCard({ filter, onEdit, onDelete, onTest }: FilterCardProps) {
    return (
        <GlassCard className="p-4 flex flex-col md:flex-row justify-between gap-4 group">
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
                <Button variant="ghost" size="sm" onClick={onTest}>Test</Button>
                <Button variant="ghost" size="sm" onClick={onEdit}>Sửa</Button>
                <Button variant="ghost" size="sm" className="text-danger hover:text-danger/80" onClick={onDelete}>Xóa</Button>
            </div>
        </GlassCard>
    );
}

// --- Conditions Section ---
interface ConditionsSectionProps {
    conditions: FilterCondition[];
    matchType: "ALL" | "ANY";
    onMatchTypeChange: (type: "ALL" | "ANY") => void;
    onUpdate: (idx: number, field: keyof FilterCondition, val: string) => void;
    onAdd: () => void;
    onRemove: (idx: number) => void;
}

export function ConditionsSection({ conditions, matchType, onMatchTypeChange, onUpdate, onAdd, onRemove }: ConditionsSectionProps) {
    return (
        <div className="bg-nebula-elevated p-4 rounded-xl border border-nebula-border space-y-3">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-nebula-text">Điều kiện</span>
                <select
                    value={matchType}
                    onChange={(e) => onMatchTypeChange(e.target.value as "ALL" | "ANY")}
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
                        onChange={e => onUpdate(idx, 'field', e.target.value)}
                        className="w-1/3 bg-nebula-surface border border-nebula-border rounded h-10 px-3 text-sm text-nebula-text"
                    >
                        {FIELD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <select
                        value={cond.operator}
                        onChange={e => onUpdate(idx, 'operator', e.target.value)}
                        className="w-1/3 bg-nebula-surface border border-nebula-border rounded h-10 px-3 text-sm text-nebula-text"
                    >
                        {OPERATOR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <Input
                        className="w-1/3"
                        value={cond.value}
                        onChange={e => onUpdate(idx, 'value', e.target.value)}
                        placeholder="Giá trị..."
                    />
                    <button onClick={() => onRemove(idx)} className="text-nebula-text-muted hover:text-danger p-2">×</button>
                </div>
            ))}
            <Button variant="ghost" size="sm" onClick={onAdd}>+ Thêm điều kiện</Button>
        </div>
    );
}

// --- Actions Section ---
interface ActionsSectionProps {
    actions: FilterAction[];
    labels: Label[];
    onUpdate: (idx: number, field: keyof FilterAction, val: string) => void;
    onAdd: () => void;
    onRemove: (idx: number) => void;
}

export function ActionsSection({ actions, labels, onUpdate, onAdd, onRemove }: ActionsSectionProps) {
    return (
        <div className="bg-nebula-elevated p-4 rounded-xl border border-nebula-border space-y-3">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-nebula-text">Hành động</span>
            </div>

            {actions.map((act, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                    <select
                        value={act.type}
                        onChange={e => onUpdate(idx, 'type', e.target.value)}
                        className="w-1/3 bg-nebula-surface border border-nebula-border rounded h-10 px-3 text-sm text-nebula-text"
                    >
                        {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>

                    <div className="w-2/3 flex gap-2">
                        {(act.type === 'ADD_LABEL' || act.type === 'REMOVE_LABEL') ? (
                            <select
                                value={act.value || ""}
                                onChange={e => onUpdate(idx, 'value', e.target.value)}
                                className="w-full bg-nebula-surface border border-nebula-border rounded h-10 px-3 text-sm text-nebula-text"
                            >
                                <option value="">-- Chọn nhãn --</option>
                                {labels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        ) : (act.type === 'FORWARD' || act.type === 'MOVE_TO_FOLDER') ? (
                            <Input
                                value={act.value || ""}
                                onChange={e => onUpdate(idx, 'value', e.target.value)}
                                placeholder={act.type === 'FORWARD' ? "Email nhận..." : "Folder ID..."}
                                className="w-full"
                            />
                        ) : (
                            <div className="w-full h-10 flex items-center px-3 text-nebula-text-muted text-sm italic bg-nebula-surface/50 rounded border border-transparent">
                                Không cần tham số
                            </div>
                        )}
                    </div>

                    <button onClick={() => onRemove(idx)} className="text-nebula-text-muted hover:text-danger p-2">×</button>
                </div>
            ))}
            <Button variant="ghost" size="sm" onClick={onAdd}>+ Thêm hành động</Button>
        </div>
    );
}

// --- Filter Modal ---
interface FilterModalProps {
    isEditing: boolean;
    name: string;
    onNameChange: (name: string) => void;
    matchType: "ALL" | "ANY";
    onMatchTypeChange: (type: "ALL" | "ANY") => void;
    conditions: FilterCondition[];
    actions: FilterAction[];
    labels: Label[];
    onUpdateCondition: (idx: number, field: keyof FilterCondition, val: string) => void;
    onAddCondition: () => void;
    onRemoveCondition: (idx: number) => void;
    onUpdateAction: (idx: number, field: keyof FilterAction, val: string) => void;
    onAddAction: () => void;
    onRemoveAction: (idx: number) => void;
    onSave: () => void;
    onClose: () => void;
}

export function FilterModal({
    isEditing,
    name,
    onNameChange,
    matchType,
    onMatchTypeChange,
    conditions,
    actions,
    labels,
    onUpdateCondition,
    onAddCondition,
    onRemoveCondition,
    onUpdateAction,
    onAddAction,
    onRemoveAction,
    onSave,
    onClose
}: FilterModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="min-h-full py-8 flex items-center justify-center w-full">
                <GlassCard className="w-full max-w-2xl p-6 space-y-6 relative animate-fade-in-up">
                    <h3 className="text-xl font-bold text-nebula-text">
                        {isEditing ? "Chỉnh sửa Bộ lọc" : "Tạo Bộ lọc Mới"}
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-nebula-text-muted mb-1">Tên bộ lọc</label>
                            <Input value={name} onChange={e => onNameChange(e.target.value)} placeholder="VD: Hóa đơn Amazon" />
                        </div>

                        <ConditionsSection
                            conditions={conditions}
                            matchType={matchType}
                            onMatchTypeChange={onMatchTypeChange}
                            onUpdate={onUpdateCondition}
                            onAdd={onAddCondition}
                            onRemove={onRemoveCondition}
                        />

                        <ActionsSection
                            actions={actions}
                            labels={labels}
                            onUpdate={onUpdateAction}
                            onAdd={onAddAction}
                            onRemove={onRemoveAction}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-nebula-border">
                        <Button variant="ghost" onClick={onClose}>Hủy</Button>
                        <Button variant="primary" onClick={onSave}>Lưu Bộ lọc</Button>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}

// --- Test Filter Modal ---
interface TestFilterModalProps {
    filter: EmailFilter;
    testResult: { matches: boolean; allMatchingFilters: { id: string; name: string }[] } | null;
    loading: boolean;
    onTest: (data: { fromAddress?: string; toAddress?: string; subject?: string; body?: string; hasAttachment?: boolean }) => void;
    onClose: () => void;
}

export function TestFilterModal({ filter, testResult, loading, onTest, onClose }: TestFilterModalProps) {
    const [fromAddress, setFromAddress] = useState("");
    const [toAddress, setToAddress] = useState("");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [hasAttachment, setHasAttachment] = useState(false);

    const handleSubmit = () => {
        onTest({ fromAddress, toAddress, subject, body, hasAttachment });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="min-h-full py-8 flex items-center justify-center w-full">
                <GlassCard className="w-full max-w-lg p-6 space-y-5 relative animate-fade-in-up">
                    <h3 className="text-xl font-bold text-nebula-text">
                        Kiểm tra Bộ lọc: {filter.name}
                    </h3>

                    <p className="text-sm text-nebula-text-muted">
                        Nhập dữ liệu email mẫu để kiểm tra bộ lọc có khớp không.
                    </p>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-nebula-text-muted mb-1">Từ (From)</label>
                            <Input value={fromAddress} onChange={e => setFromAddress(e.target.value)} placeholder="sender@example.com" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-nebula-text-muted mb-1">Đến (To)</label>
                            <Input value={toAddress} onChange={e => setToAddress(e.target.value)} placeholder="inbox@yourdomain.com" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-nebula-text-muted mb-1">Tiêu đề (Subject)</label>
                            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Test email subject" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-nebula-text-muted mb-1">Nội dung (Body)</label>
                            <textarea
                                value={body}
                                onChange={e => setBody(e.target.value)}
                                placeholder="Email body content..."
                                className="w-full bg-nebula-surface border border-nebula-border rounded-lg px-3 py-2 text-sm text-nebula-text focus:outline-none focus:border-nebula-violet min-h-[80px]"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="hasAttachment"
                                checked={hasAttachment}
                                onChange={e => setHasAttachment(e.target.checked)}
                                className="rounded border-nebula-border"
                            />
                            <label htmlFor="hasAttachment" className="text-sm text-nebula-text">Có đính kèm</label>
                        </div>
                    </div>

                    {/* Test Result */}
                    {testResult && (
                        <div className={`p-4 rounded-lg border ${testResult.matches ? 'bg-success/10 border-success/30' : 'bg-warning/10 border-warning/30'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`text-lg ${testResult.matches ? 'text-success' : 'text-warning'}`}>
                                    {testResult.matches ? '✓' : '✗'}
                                </span>
                                <span className={`font-semibold ${testResult.matches ? 'text-success' : 'text-warning'}`}>
                                    {testResult.matches ? 'Bộ lọc KHỚP!' : 'Bộ lọc KHÔNG khớp'}
                                </span>
                            </div>
                            {testResult.allMatchingFilters.length > 0 && (
                                <div className="text-sm text-nebula-text-muted">
                                    Tất cả bộ lọc khớp: {testResult.allMatchingFilters.map(f => f.name).join(', ')}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-nebula-border">
                        <Button variant="ghost" onClick={onClose}>Đóng</Button>
                        <Button variant="primary" onClick={handleSubmit} disabled={loading}>
                            {loading ? 'Đang kiểm tra...' : 'Kiểm tra'}
                        </Button>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
