/**
 * UI components for CodesPage
 */
import {
    GlassCard, PremiumTable, TableHeader, TableHeaderCell,
    TableBody, TableRow, TableCell, StatusBadge, PremiumButton
} from "../../../components/admin/AdminUIComponents";
import type { RedemptionCode, ServicePackage, CodeFormData } from "./codes-types";
import { getCodeStatus, formatVND } from "./codes-types";
import { copyToClipboard } from "./codes-hooks";

/** Codes table component */
interface CodesTableProps {
    codes: RedemptionCode[];
    loading: boolean;
    onDelete: (code: RedemptionCode) => void;
}

export function CodesTable({ codes, loading, onDelete }: CodesTableProps) {
    if (loading && codes.length === 0) {
        return <div className="text-center py-8">Đang tải...</div>;
    }

    return (
        <GlassCard padding="p-0">
            <PremiumTable>
                <TableHeader>
                    <tr>
                        <TableHeaderCell>Mã Code</TableHeaderCell>
                        <TableHeaderCell>Gói áp dụng</TableHeaderCell>
                        <TableHeaderCell>Lượt dùng</TableHeaderCell>
                        <TableHeaderCell>Hết hạn</TableHeaderCell>
                        <TableHeaderCell>Trạng thái</TableHeaderCell>
                        <TableHeaderCell className="text-right">Hành động</TableHeaderCell>
                    </tr>
                </TableHeader>
                <TableBody>
                    {codes.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="text-center py-8 text-muted">Không tìm thấy mã nào</td>
                        </tr>
                    ) : codes.map(code => {
                        const { status, variant } = getCodeStatus(code);
                        return (
                            <TableRow key={code.id}>
                                <TableCell>
                                    <div className="font-mono font-bold text-primary cursor-pointer hover:underline" onClick={() => copyToClipboard(code.code)}>
                                        {code.code}
                                    </div>
                                    <div className="text-[10px] text-muted">Tao: {new Date(code.createdAt).toLocaleDateString()}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="font-medium">{code.package.name}</div>
                                    <div className="text-xs text-muted">{formatVND(code.package.price)}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-xs">
                                        <span className={code.usedCount >= code.maxUses ? "text-red-500 font-bold" : "text-green-600"}>
                                            {code.usedCount}
                                        </span>
                                        <span className="text-muted"> / {code.maxUses}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-xs">
                                        {code.expiresAt ? new Date(code.expiresAt).toLocaleDateString() : "Vĩnh viễn"}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <StatusBadge status={status} variant={variant} />
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-2 justify-end">
                                        <PremiumButton variant="ghost" size="sm" onClick={() => copyToClipboard(code.code)}>Copy</PremiumButton>
                                        <PremiumButton
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => onDelete(code)}
                                        >
                                            Xóa
                                        </PremiumButton>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </PremiumTable>
        </GlassCard>
    );
}

/** Create code modal */
interface CreateCodeModalProps {
    show: boolean;
    packages: ServicePackage[];
    formData: CodeFormData;
    onUpdateField: <K extends keyof CodeFormData>(field: K, value: CodeFormData[K]) => void;
    onClose: () => void;
    onSubmit: () => void;
}

export function CreateCodeModal({ show, packages, formData, onUpdateField, onClose, onSubmit }: CreateCodeModalProps) {
    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-nebula-surface rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-nebula-border">
                <div className="p-4 border-b border-nebula-border flex justify-between items-center">
                    <h3 className="font-semibold">Tạo mã đổi thưởng</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Gói dịch vụ áp dụng</label>
                        <select
                            className="input-nebula w-full"
                            value={formData.packageId}
                            onChange={e => onUpdateField("packageId", e.target.value)}
                        >
                            <option value="">-- Chọn gói --</option>
                            {packages.map(p => (
                                <option key={p.id} value={p.id}>{p.name} - {p.price.toLocaleString()}đ</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Số lượng mã</label>
                            <input
                                type="number"
                                className="input-nebula w-full"
                                value={formData.count}
                                onChange={e => onUpdateField("count", Math.max(1, Number(e.target.value)))}
                                min="1" max="100"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Prefix (Tùy chọn)</label>
                            <input
                                className="input-nebula w-full uppercase"
                                value={formData.prefix}
                                onChange={e => onUpdateField("prefix", e.target.value.toUpperCase())}
                                placeholder="SALE"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Lượt dùng tối đa / mã</label>
                            <input
                                type="number"
                                className="input-nebula w-full"
                                value={formData.maxUses}
                                onChange={e => onUpdateField("maxUses", Math.max(1, Number(e.target.value)))}
                                min="1"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Hết hạn (Tùy chọn)</label>
                            <input
                                type="date"
                                className="input-nebula w-full"
                                value={formData.expiresAt}
                                onChange={e => onUpdateField("expiresAt", e.target.value)}
                            />
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                    <button onClick={onClose} className="btn btn-secondary px-4">Hủy</button>
                    <button onClick={onSubmit} className="btn btn-primary px-4">Tạo mã</button>
                </div>
            </div>
        </div>
    );
}
