import { useState, useEffect, useCallback } from "react";
import { api } from "../../utils/api";
import { getFriendlyErrorMessage } from "../../utils/errorMapping";
import toast from "react-hot-toast";
import {
    GlassCard, SectionHeader, PremiumTable, TableHeader, TableHeaderCell,
    TableBody, TableRow, TableCell, StatusBadge, PremiumButton, PremiumInput,
    EmptyState, LoadingSpinner, Pagination, BulkActionsBar
} from "./AdminUIComponents";

interface Domain {
    id: string;
    name: string;
    status: "PENDING" | "VERIFIED" | "FAILED";
    contributionStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
    isPublic: boolean;
    owner?: { email: string };
    createdAt: string;
}

const PAGE_SIZE = 10;

export function AdminDomains({ token }: { token: string }) {
    const [domains, setDomains] = useState<Domain[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<string>("ALL");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (filter !== "ALL") params.set("contributionStatus", filter);
            params.set("limit", String(PAGE_SIZE));
            params.set("offset", String(page * PAGE_SIZE));

            const res = await api<{ data: Domain[]; meta: { total: number } }>(`/admin/domains?${params}`, { token });
            setDomains(res.data);
            setTotal(res.meta.total);
            setSelectedIds(new Set());
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoading(false);
        }
    }, [token, search, filter, page]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleReview = async (domainId: string, status: "APPROVED" | "REJECTED") => {
        setUpdating(domainId);
        try {
            await api(`/admin/domains/${domainId}/review`, {
                method: "POST",
                token,
                body: { status }
            });
            toast.success(status === "APPROVED" ? "Đã duyệt tên miền" : "Đã từ chối");
            await loadData();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setUpdating(null);
        }
    };

    const handleBulkAction = async (action: "APPROVED" | "REJECTED") => {
        const ids = Array.from(selectedIds);
        setLoading(true);
        try {
            // Bulk review logic would go here if backend supported it,
            // for now we iterate to match the individual review endpoint.
            await Promise.all(ids.map(id =>
                api(`/admin/domains/${id}/review`, {
                    method: "POST",
                    token,
                    body: { status: action }
                })
            ));
            toast.success(`Đã xử lý ${ids.length} mục`);
            await loadData();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-4">
            <SectionHeader
                title="Quản lý Tên miền"
                subtitle="Duyệt và quản lý tên miền do người dùng đóng góp"
                action={
                    <div className="flex items-center gap-3">
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800"
                        >
                            <option value="ALL">Tất cả</option>
                            <option value="PENDING">Chờ duyệt</option>
                            <option value="APPROVED">Đã duyệt</option>
                            <option value="REJECTED">Bị từ chối</option>
                        </select>
                        <PremiumInput
                            value={search}
                            onChange={setSearch}
                            placeholder="Tìm tên miền..."
                            className="w-48"
                        />
                    </div>
                }
            />

            <BulkActionsBar
                selectedCount={selectedIds.size}
                onClear={() => setSelectedIds(new Set())}
            >
                <PremiumButton size="sm" onClick={() => handleBulkAction("APPROVED")}>Duyệt hàng loạt</PremiumButton>
                <PremiumButton size="sm" variant="danger" onClick={() => handleBulkAction("REJECTED")}>Từ chối</PremiumButton>
            </BulkActionsBar>

            {loading ? (
                <LoadingSpinner />
            ) : (
                <GlassCard padding="p-0" hover={false}>
                    <PremiumTable>
                        <TableHeader>
                            <tr>
                                <TableHeaderCell className="w-10">
                                    <input
                                        type="checkbox"
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedIds(new Set(domains.map(d => d.id)));
                                            else setSelectedIds(new Set());
                                        }}
                                        checked={selectedIds.size === domains.length && domains.length > 0}
                                        className="rounded border-slate-300 dark:border-slate-600"
                                    />
                                </TableHeaderCell>
                                <TableHeaderCell>Tên miền</TableHeaderCell>
                                <TableHeaderCell>Chủ sở hữu</TableHeaderCell>
                                <TableHeaderCell>Xác thực</TableHeaderCell>
                                <TableHeaderCell>Đóng góp</TableHeaderCell>
                                <TableHeaderCell>Phạm vi</TableHeaderCell>
                                <TableHeaderCell className="text-right">Hành động</TableHeaderCell>
                            </tr>
                        </TableHeader>
                        <TableBody>
                            {domains.map((domain) => (
                                <TableRow key={domain.id}>
                                    <TableCell>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(domain.id)}
                                            onChange={() => {
                                                const newSet = new Set(selectedIds);
                                                if (newSet.has(domain.id)) newSet.delete(domain.id);
                                                else newSet.add(domain.id);
                                                setSelectedIds(newSet);
                                            }}
                                            className="rounded border-slate-300 dark:border-slate-600"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium text-slate-900 dark:text-white">{domain.name}</div>
                                        <div className="text-xs text-slate-500">{new Date(domain.createdAt).toLocaleDateString()}</div>
                                    </TableCell>
                                    <TableCell className="text-xs">{domain.owner?.email || "—"}</TableCell>
                                    <TableCell>
                                        <StatusBadge
                                            status={domain.status}
                                            variant={domain.status === "VERIFIED" ? "success" : "warning"}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge
                                            status={domain.contributionStatus}
                                            variant={
                                                domain.contributionStatus === "APPROVED" ? "success" :
                                                    domain.contributionStatus === "REJECTED" ? "danger" :
                                                        domain.contributionStatus === "PENDING" ? "warning" : "default"
                                            }
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <span className={`text-xs px-2 py-1 rounded-lg ${domain.isPublic ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40" : "bg-slate-100 text-slate-600"}`}>
                                            {domain.isPublic ? "Public" : "Private"}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {domain.contributionStatus === "PENDING" && (
                                                <>
                                                    <button
                                                        onClick={() => handleReview(domain.id, "APPROVED")}
                                                        disabled={updating === domain.id}
                                                        className="text-xs text-green-600 hover:text-green-700 font-medium"
                                                    >
                                                        Duyệt
                                                    </button>
                                                    <button
                                                        onClick={() => handleReview(domain.id, "REJECTED")}
                                                        disabled={updating === domain.id}
                                                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                                                    >
                                                        Từ chối
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </PremiumTable>

                    {domains.length === 0 && (
                        <EmptyState title="Không tìm thấy tên miền" description="Thay đổi bộ lọc hoặc tìm kiếm khác" />
                    )}
                </GlassCard>
            )}

            {totalPages > 1 && (
                <Pagination
                    currentPage={page + 1}
                    totalPages={totalPages}
                    onPageChange={(p) => setPage(p - 1)}
                />
            )}
        </div>
    );
}
