import { useState, useEffect, useCallback } from "react";
import { api } from "../../utils/api";
import { getFriendlyErrorMessage } from "../../utils/errorMapping";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import {
    GlassCard, PremiumTable, TableHeader, TableHeaderCell,
    TableBody, TableRow, TableCell, StatusBadge, SectionHeader, PremiumButton, PremiumInput
} from "../../components/admin/AdminUIComponents";

interface RedemptionCode {
    id: string;
    code: string;
    packageId: string;
    package: { name: string; type: string; price: number };
    maxUses: number;
    usedCount: number;
    expiresAt?: string;
    isActive: boolean;
    createdAt: string;
}

interface ServicePackage {
    id: string;
    name: string;
    price: number;
}

export function CodesPage() {
    const { token } = useAuth();
    const [codes, setCodes] = useState<RedemptionCode[]>([]);
    const [packages, setPackages] = useState<ServicePackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Filter states
    const [filterCode, setFilterCode] = useState("");

    // Form states
    const [formData, setFormData] = useState({
        packageId: "",
        maxUses: 1,
        expiresAt: "",
        prefix: "",
        count: 1
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [codesRes, packagesRes] = await Promise.all([
                api<{ codes: RedemptionCode[] }>("/admin/codes", { token }),
                api<{ packages: ServicePackage[] }>("/admin/packages", { token })
            ]);
            setCodes(codesRes.codes);
            setPackages(packagesRes.packages);
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleGenerate = async () => {
        if (!formData.packageId) return toast.error("Vui lòng chọn gói dịch vụ");

        try {
            await api("/admin/codes/generate", {
                method: "POST",
                token,
                body: {
                    packageId: formData.packageId,
                    maxUses: Number(formData.maxUses),
                    expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : undefined,
                    prefix: formData.prefix || undefined,
                    count: Number(formData.count)
                }
            });
            toast.success(`Đã tạo ${formData.count} mã đổi thưởng`);
            setShowModal(false);
            loadData();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        }
    };

    const handleDelete = async (id: string) => {
        setLoading(true);
        try {
            await api(`/admin/codes/${id}`, { method: "DELETE", token });
            toast.success("Đã xóa mã đổi thưởng");
            await loadData();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Đã copy mã: " + text);
    };

    const filteredCodes = (codes || []).filter(c =>
        c.code.toLowerCase().includes(filterCode.toLowerCase()) ||
        c.package.name.toLowerCase().includes(filterCode.toLowerCase())
    );

    return (
        <div className="p-6 max-w-full space-y-6">
            <SectionHeader
                title="Mã Đổi Thưởng"
                subtitle="Tạo và quản lý mã khuyến mãi/kích hoạt"
                action={
                    <div className="flex gap-2">
                        <PremiumInput
                            placeholder="Tìm kiếm mã..."
                            value={filterCode}
                            onChange={setFilterCode}
                            className="w-48"
                        />
                        <button
                            onClick={() => setShowModal(true)}
                            className="btn-primary px-4 py-2 text-sm"
                        >
                            + Tạo mã
                        </button>
                    </div>
                }
            />

            {loading ? (
                <div className="text-center py-8">Đang tải...</div>
            ) : (
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
                            {filteredCodes.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-muted">Không tìm thấy mã nào</td>
                                </tr>
                            ) : filteredCodes.map(code => (
                                <TableRow key={code.id}>
                                    <TableCell>
                                        <div className="font-mono font-bold text-primary cursor-pointer hover:underline" onClick={() => copyToClipboard(code.code)}>
                                            {code.code}
                                        </div>
                                        <div className="text-[10px] text-muted">Tao: {new Date(code.createdAt).toLocaleDateString()}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{code.package.name}</div>
                                        <div className="text-xs text-muted">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(code.package.price)}</div>
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
                                        <StatusBadge
                                            status={!code.isActive ? "INACTIVE" : (code.usedCount >= code.maxUses ? "USED" : "ACTIVE")}
                                            variant={!code.isActive ? "default" : (code.usedCount >= code.maxUses ? "warning" : "success")}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2 justify-end">
                                            <PremiumButton variant="ghost" size="sm" onClick={() => copyToClipboard(code.code)}>Copy</PremiumButton>
                                            <PremiumButton
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => {
                                                    if (confirm("Bạn có chắc muốn xóa mã này?")) handleDelete(code.id);
                                                }}
                                            >
                                                Xóa
                                            </PremiumButton>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </PremiumTable>
                </GlassCard>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="font-semibold">Tạo mã đổi thưởng</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Gói dịch vụ áp dụng</label>
                                <select
                                    className="input-nebula w-full"
                                    value={formData.packageId}
                                    onChange={e => setFormData({ ...formData, packageId: e.target.value })}
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
                                        onChange={e => setFormData({ ...formData, count: Math.max(1, Number(e.target.value)) })}
                                        min="1" max="100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Prefix (Tùy chọn)</label>
                                    <input
                                        className="input-nebula w-full uppercase"
                                        value={formData.prefix}
                                        onChange={e => setFormData({ ...formData, prefix: e.target.value.toUpperCase() })}
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
                                        onChange={e => setFormData({ ...formData, maxUses: Math.max(1, Number(e.target.value)) })}
                                        min="1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Hết hạn (Tùy chọn)</label>
                                    <input
                                        type="date"
                                        className="input-nebula w-full"
                                        value={formData.expiresAt}
                                        onChange={e => setFormData({ ...formData, expiresAt: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                            <button onClick={() => setShowModal(false)} className="btn btn-secondary px-4">Hủy</button>
                            <button onClick={handleGenerate} className="btn btn-primary px-4">Tạo mã</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
