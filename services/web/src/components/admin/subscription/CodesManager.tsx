import { useState, useEffect, useCallback } from "react";
import { api } from "../../../utils/api";
import { getFriendlyErrorMessage } from "../../../utils/errorMapping";
import toast from "react-hot-toast";
import {
    GlassCard, PremiumTable, TableHeader, TableHeaderCell,
    TableBody, TableRow, TableCell, StatusBadge, Pagination
} from "../AdminUIComponents";

interface RedemptionCode {
    id: string;
    code: string;
    packageId: string;
    maxUses: number;
    usedCount: number;
    expiresAt?: string;
    status: "ACTIVE" | "USED" | "EXPIRED" | "REVOKED";
    createdAt: string;
    package: {
        name: string;
        type: string;
    }
}

interface ServicePackage {
    id: string;
    name: string;
}

const PAGE_SIZE = 20;

export function CodesManager({ token }: { token: string }) {
    const [codes, setCodes] = useState<RedemptionCode[]>([]);
    const [packages, setPackages] = useState<ServicePackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const [showModal, setShowModal] = useState(false);

    // Filter
    const [filterPkg, setFilterPkg] = useState("");
    const [search, setSearch] = useState("");

    // Generate Form
    const [genForm, setGenForm] = useState({
        packageId: "",
        quantity: 1,
        maxUses: 1,
        expiresAt: "",
        prefix: ""
    });

    const loadCodes = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set("limit", String(PAGE_SIZE));
            params.set("offset", String(page * PAGE_SIZE));
            if (filterPkg) params.set("packageId", filterPkg);
            if (search) params.set("search", search);

            const res = await api<{ data: RedemptionCode[]; meta: { total: number } }>(`/admin/codes?${params}`, { token });
            setCodes(res.data);
            setTotal(res.meta.total);
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoading(false);
        }
    }, [token, page, filterPkg, search]);

    // Load available packages for dropdown
    const loadPackages = useCallback(async () => {
        try {
            const res = await api<{ packages: ServicePackage[] }>("/admin/packages", { token });
            setPackages(res.packages);
        } catch (e) { }
    }, [token]);

    useEffect(() => { loadCodes(); }, [loadCodes]);
    useEffect(() => { loadPackages(); }, [loadPackages]);

    const handleGenerate = async () => {
        if (!genForm.packageId) return toast.error("Vui lòng chọn gói dịch vụ");

        try {
            const payload: any = {
                ...genForm,
                quantity: Number(genForm.quantity),
                maxUses: Number(genForm.maxUses)
            };
            if (genForm.expiresAt) payload.expiresAt = new Date(genForm.expiresAt).toISOString();

            await api("/admin/codes/generate", {
                method: "POST",
                token,
                body: payload
            });

            toast.success(`Đã tạo ${genForm.quantity} mã mới`);
            setShowModal(false);
            loadCodes();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        }
    };

    const handleRevoke = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn hủy mã này? Mã sẽ không thể sử dụng được nữa.")) return;
        try {
            await api(`/admin/codes/${id}/revoke`, { method: "PUT", token });
            toast.success("Đã hủy mã");
            loadCodes();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        }
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center gap-4 flex-wrap">
                <div className="flex gap-2 items-center flex-1">
                    <input
                        className="input-nebula text-sm w-48"
                        placeholder="Tìm kiếm mã..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <select
                        className="input-nebula text-sm w-48"
                        value={filterPkg}
                        onChange={(e) => setFilterPkg(e.target.value)}
                    >
                        <option value="">Tất cả các gói</option>
                        {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <button onClick={loadCodes} className="btn btn-secondary px-3 py-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </button>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="btn-primary px-4 py-2 text-sm whitespace-nowrap"
                >
                    + Tạo mã hàng loạt
                </button>
            </div>

            {loading ? (
                <div className="text-center py-8">Đang tải...</div>
            ) : (
                <GlassCard padding="p-0">
                    <PremiumTable>
                        <TableHeader>
                            <tr>
                                <TableHeaderCell>Mã quy đổi</TableHeaderCell>
                                <TableHeaderCell>Gói dịch vụ</TableHeaderCell>
                                <TableHeaderCell>Lượt dùng</TableHeaderCell>
                                <TableHeaderCell>Trạng thái</TableHeaderCell>
                                <TableHeaderCell>Hết hạn</TableHeaderCell>
                                <TableHeaderCell className="text-right">Thao tác</TableHeaderCell>
                            </tr>
                        </TableHeader>
                        <TableBody>
                            {codes.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-muted">Chưa có mã nào</td>
                                </tr>
                            ) : codes.map(code => (
                                <TableRow key={code.id}>
                                    <TableCell>
                                        <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-mono font-bold select-all">
                                            {code.code}
                                        </code>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">{code.package.name}</div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs">
                                            {code.usedCount} / {code.maxUses}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge
                                            status={code.status}
                                            variant={code.status === "ACTIVE" ? "success" : code.status === "USED" ? "default" : "danger"}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {code.expiresAt ? new Date(code.expiresAt).toLocaleDateString("vi-VN") : "—"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {code.status === "ACTIVE" && (
                                            <button
                                                onClick={() => handleRevoke(code.id)}
                                                className="text-xs text-red-600 hover:text-red-700 font-medium"
                                            >
                                                Hủy mã
                                            </button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </PremiumTable>
                </GlassCard>
            )}

            {totalPages > 1 && (
                <Pagination
                    currentPage={page + 1}
                    totalPages={totalPages}
                    onPageChange={(p) => setPage(p - 1)}
                />
            )}

            {/* Generate Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="font-semibold">Tạo mã quy đổi</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Gói dịch vụ <span className="text-red-500">*</span></label>
                                <select
                                    className="input-nebula w-full"
                                    value={genForm.packageId}
                                    onChange={e => setGenForm({ ...genForm, packageId: e.target.value })}
                                >
                                    <option value="">Chọn gói...</option>
                                    {packages.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Số lượng mã</label>
                                    <input
                                        type="number"
                                        className="input-nebula w-full"
                                        value={genForm.quantity}
                                        onChange={e => setGenForm({ ...genForm, quantity: Number(e.target.value) })}
                                        min={1} max={100}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Lượt dùng tối đa</label>
                                    <input
                                        type="number"
                                        className="input-nebula w-full"
                                        value={genForm.maxUses}
                                        onChange={e => setGenForm({ ...genForm, maxUses: Number(e.target.value) })}
                                        min={1}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Tiền tố (Prefix) - Tùy chọn</label>
                                <input
                                    className="input-nebula w-full uppercase"
                                    value={genForm.prefix}
                                    onChange={e => setGenForm({ ...genForm, prefix: e.target.value.toUpperCase() })}
                                    placeholder="VD: TET2025-"
                                    maxLength={10}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Ngày hết hạn - Tùy chọn</label>
                                <input
                                    type="datetime-local"
                                    className="input-nebula w-full"
                                    value={genForm.expiresAt}
                                    onChange={e => setGenForm({ ...genForm, expiresAt: e.target.value })}
                                />
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
