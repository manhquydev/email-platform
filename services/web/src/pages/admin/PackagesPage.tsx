import { useState, useEffect, useCallback } from "react";
import { api } from "../../utils/api";
import { getFriendlyErrorMessage } from "../../utils/errorMapping";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import {
    GlassCard, PremiumTable, TableHeader, TableHeaderCell,
    TableBody, TableRow, TableCell, SectionHeader, PremiumButton, PremiumToggle
} from "../../components/admin/AdminUIComponents";

interface ServicePackage {
    id: string;
    name: string;
    description?: string;
    price: number;
    currency: string;
    type: "TIME_BASED" | "USAGE_BASED";
    durationDays?: number;
    targetTier?: string;
    creditAmount?: number;
    isActive: boolean;
    stripePriceId?: string;
    stripeProductId?: string;
    createdAt: string;
    _count: { codes: number };
}

export function PackagesPage() {
    const { token } = useAuth();
    const [packages, setPackages] = useState<ServicePackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form states
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: 0,
        type: "TIME_BASED",
        durationDays: 30,
        targetTier: "PROFESSIONAL",
        creditAmount: 0,
        stripePriceId: "",
        stripeProductId: "",
        isActive: true
    });

    const loadPackages = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api<{ packages: ServicePackage[] }>("/admin/packages", { token });
            setPackages(res.packages);
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { loadPackages(); }, [loadPackages]);

    const handleSubmit = async () => {
        if (!formData.name) return toast.error("Vui lòng nhập tên gói");

        try {
            const payload = {
                ...formData,
                durationDays: Number(formData.durationDays),
                price: Number(formData.price),
                creditAmount: Number(formData.creditAmount)
            };

            if (editingId) {
                await api(`/admin/packages/${editingId}`, {
                    method: "PATCH",
                    token,
                    body: payload
                });
                toast.success("Đã cập nhật gói dịch vụ");
            } else {
                await api("/admin/packages", {
                    method: "POST",
                    token,
                    body: payload
                });
                toast.success("Đã tạo gói dịch vụ");
            }

            setShowModal(false);
            resetForm();
            loadPackages();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        }
    };

    const handleEdit = (pkg: ServicePackage) => {
        setEditingId(pkg.id);
        setFormData({
            name: pkg.name,
            description: pkg.description || "",
            price: pkg.price,
            type: pkg.type,
            durationDays: pkg.durationDays || 30,
            targetTier: pkg.targetTier || "PROFESSIONAL",
            creditAmount: pkg.creditAmount || 0,
            stripePriceId: pkg.stripePriceId || "",
            stripeProductId: pkg.stripeProductId || "",
            isActive: pkg.isActive
        });
        setShowModal(true);
    };

    const handleDelete = async (pkg: ServicePackage) => {
        if (!window.confirm(`Bạn có chắc muốn xóa gói "${pkg.name}"?`)) return;

        try {
            await api(`/admin/packages/${pkg.id}`, { method: "DELETE", token });
            toast.success("Đã xóa gói dịch vụ");
            loadPackages();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        }
    };

    const handleToggleStatus = async (pkg: ServicePackage, newStatus: boolean) => {
        try {
            await api(`/admin/packages/${pkg.id}`, {
                method: "PATCH",
                token,
                body: { isActive: newStatus }
            });
            setPackages(packages.map(p => p.id === pkg.id ? { ...p, isActive: newStatus } : p));
            toast.success(newStatus ? "Đã kích hoạt gói" : "Đã vô hiệu hóa gói");
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            name: "",
            description: "",
            price: 0,
            type: "TIME_BASED",
            durationDays: 30,
            targetTier: "PROFESSIONAL",
            creditAmount: 0,
            stripePriceId: "",
            stripeProductId: "",
            isActive: true
        });
    };

    return (
        <div className="p-6 max-w-full space-y-6">
            <SectionHeader
                title="Quản lý Gói Dịch Vụ"
                subtitle="Định nghĩa các gói cước và giá bán"
                action={
                    <button
                        onClick={() => { resetForm(); setShowModal(true); }}
                        className="btn-primary px-4 py-2 text-sm"
                    >
                        + Tạo gói mới
                    </button>
                }
            />

            {loading ? (
                <div className="text-center py-8">Đang tải...</div>
            ) : (
                <GlassCard padding="p-0">
                    <PremiumTable>
                        <TableHeader>
                            <tr>
                                <TableHeaderCell>Tên gói</TableHeaderCell>
                                <TableHeaderCell>Loại</TableHeaderCell>
                                <TableHeaderCell>Chi tiết</TableHeaderCell>
                                <TableHeaderCell>Giá</TableHeaderCell>
                                <TableHeaderCell>SL Mã</TableHeaderCell>
                                <TableHeaderCell>Trạng thái</TableHeaderCell>
                                <TableHeaderCell className="text-right">Hành động</TableHeaderCell>
                            </tr>
                        </TableHeader>
                        <TableBody>
                            {packages.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-muted">Chưa có gói dịch vụ nào</td>
                                </tr>
                            ) : packages.map(pkg => (
                                <TableRow key={pkg.id}>
                                    <TableCell>
                                        <div className="font-medium">{pkg.name}</div>
                                        <div className="text-xs text-muted truncate max-w-[200px]">{pkg.description}</div>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`text-xs px-2 py-1 rounded font-medium ${pkg.type === 'TIME_BASED' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                                            {pkg.type === 'TIME_BASED' ? 'Theo thời gian' : 'Theo lượt dùng'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs">
                                            {pkg.type === 'TIME_BASED' ? (
                                                <span>{pkg.durationDays} ngày / {pkg.targetTier}</span>
                                            ) : (
                                                <span>+{pkg.creditAmount} credits</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: pkg.currency }).format(pkg.price)}
                                    </TableCell>
                                    <TableCell>{pkg._count.codes}</TableCell>
                                    <TableCell>
                                        <PremiumToggle
                                            checked={pkg.isActive}
                                            onChange={(checked) => handleToggleStatus(pkg, checked)}
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <PremiumButton variant="ghost" size="sm" onClick={() => handleEdit(pkg)} className="text-blue-500">
                                                Edit
                                            </PremiumButton>
                                            <PremiumButton variant="ghost" size="sm" onClick={() => handleDelete(pkg)} className="text-red-500">
                                                Delete
                                            </PremiumButton>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </PremiumTable>
                </GlassCard>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="font-semibold">{editingId ? "Cập nhật gói dịch vụ" : "Tạo gói dịch vụ mới"}</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium mb-1">Tên gói</label>
                                    <input
                                        className="input-nebula w-full"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ví dụ: Gói Premium 1 Tháng"
                                    />
                                </div>
                                <div className="mt-6">
                                    <PremiumToggle
                                        label="Kích hoạt"
                                        checked={formData.isActive}
                                        onChange={checked => setFormData({ ...formData, isActive: checked })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Mô tả</label>
                                <textarea
                                    className="input-nebula w-full h-20"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Giá (VND)</label>
                                    <input
                                        type="number"
                                        className="input-nebula w-full"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Loại gói</label>
                                    <select
                                        className="input-nebula w-full"
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                    >
                                        <option value="TIME_BASED">Theo thời gian</option>
                                        <option value="USAGE_BASED">Theo lượt dùng</option>
                                    </select>
                                </div>
                            </div>

                            {formData.type === 'TIME_BASED' && (
                                <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                                    <div>
                                        <label className="block text-xs font-medium mb-1 text-muted">Thời hạn (ngày)</label>
                                        <input
                                            type="number"
                                            className="input-nebula w-full"
                                            value={formData.durationDays}
                                            onChange={e => setFormData({ ...formData, durationDays: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1 text-muted">Cấp độ mục tiêu</label>
                                        <select
                                            className="input-nebula w-full"
                                            value={formData.targetTier}
                                            onChange={e => setFormData({ ...formData, targetTier: e.target.value })}
                                        >
                                            <option value="STARTER">STARTER</option>
                                            <option value="PROFESSIONAL">PROFESSIONAL</option>
                                            <option value="ENTERPRISE">ENTERPRISE</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {formData.type === 'USAGE_BASED' && (
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                                    <label className="block text-xs font-medium mb-1 text-muted">Số lượng Credits cộng thêm</label>
                                    <input
                                        type="number"
                                        className="input-nebula w-full"
                                        value={formData.creditAmount}
                                        onChange={e => setFormData({ ...formData, creditAmount: Number(e.target.value) })}
                                        placeholder="100"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                                        Stripe Price ID
                                        <span className="text-[10px] bg-blue-100 text-blue-600 px-1 rounded">Required for Stripe</span>
                                    </label>
                                    <input
                                        className="input-nebula w-full font-mono text-xs"
                                        value={formData.stripePriceId}
                                        onChange={e => setFormData({ ...formData, stripePriceId: e.target.value })}
                                        placeholder="price_..."
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium mb-1">Stripe Product ID (Optional)</label>
                                    <input
                                        className="input-nebula w-full font-mono text-xs"
                                        value={formData.stripeProductId}
                                        onChange={e => setFormData({ ...formData, stripeProductId: e.target.value })}
                                        placeholder="prod_..."
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                            <button onClick={() => setShowModal(false)} className="btn btn-secondary px-4">Hủy</button>
                            <button onClick={handleSubmit} className="btn btn-primary px-4">{editingId ? "Cập nhật" : "Tạo gói"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
