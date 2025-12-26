import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../utils/api";
import { getFriendlyErrorMessage } from "../../utils/errorMapping";
import toast from "react-hot-toast";
import {
    GlassCard, SectionHeader, PremiumTable, TableHeader, TableHeaderCell,
    TableBody, TableRow, TableCell, StatusBadge, PremiumButton, PremiumInput,
    EmptyState, LoadingSpinner, Pagination, ConfirmModal
} from "./AdminUIComponents";

interface Inbox {
    id: string;
    localPart: string;
    domain: { name: string };
    owner: { email: string };
    ownerId: string;
    createdAt: string;
    expiresAt: string | null;
    _count: { messages: number };
}

const PAGE_SIZE = 20;

export function AdminInboxes({ token }: { token: string }) {
    const [inboxes, setInboxes] = useState<Inbox[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const [updating, setUpdating] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Inbox | null>(null);
    const [transferTarget, setTransferTarget] = useState<Inbox | null>(null);
    const [loadingAction, setLoadingAction] = useState(false);
    const { user } = useAuth();

    const loadInboxes = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            params.set("limit", String(PAGE_SIZE));
            params.set("offset", String(page * PAGE_SIZE));

            const res = await api<{ data: Inbox[]; meta: { total: number } }>(`/inboxes?${params}`, { token });
            setInboxes(res.data);
            setTotal(res.meta.total);
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoading(false);
        }
    }, [token, search, page]);

    useEffect(() => { loadInboxes(); }, [loadInboxes]);
    useEffect(() => { setPage(0); }, [search]);

    const handleDelete = async (id: string, email: string) => {
        const inbox = inboxes.find(i => i.id === id);
        if (inbox) setDeleteTarget(inbox);
    };

    const confirmDelete = async (inbox: Inbox) => {
        const email = `${inbox.localPart}@${inbox.domain.name}`;
        setLoadingAction(true);
        setUpdating(inbox.id);
        try {
            await api(`/inboxes/${inbox.id}`, { method: "DELETE", token });
            toast.success(`Đã xóa ${email}`);
            setDeleteTarget(null);
            await loadInboxes();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoadingAction(false);
            setUpdating(null);
        }
    };

    const handleTransfer = async (inbox: Inbox) => {
        setTransferTarget(inbox);
    };

    const confirmTransfer = async (inbox: Inbox) => {
        const defaultEmail = user?.email || "admin@example.com";
        const email = prompt(`Chuyển quyền sở hữu hộp thư ${inbox.localPart}@${inbox.domain.name}?\nNhập email chủ sở hữu mới:`, defaultEmail);
        if (email === null) return;

        setLoadingAction(true);
        setUpdating(inbox.id);
        try {
            const payload: any = {};
            if (email) payload.ownerEmail = email;
            else {
                toast.error("Vui lòng nhập email");
                setLoadingAction(false);
                setUpdating(null);
                return;
            }

            await api(`/inboxes/${inbox.id}`, {
                method: "PATCH",
                token,
                body: payload
            });

            toast.success(`Đã chuyển sang cho ${payload.ownerEmail}`);
            setTransferTarget(null);
            await loadInboxes();
        } catch (e) {
            toast.error(getFriendlyErrorMessage((e as Error).message));
        } finally {
            setUpdating(null);
            setLoadingAction(false);
        }
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <SectionHeader
                title="Quản lý Hộp thư"
                subtitle={`Xem và quản lý tất cả hộp thư trong hệ thống${total > 0 ? ` (${total} tổng)` : ""}`}
                action={
                    <PremiumInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Tìm kiếm địa chỉ..."
                        className="w-64"
                        icon={
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                            </svg>
                        }
                    />
                }
            />

            {loading ? (
                <LoadingSpinner />
            ) : (
                <GlassCard padding="p-0" hover={false}>
                    <PremiumTable>
                        <TableHeader>
                            <tr>
                                <TableHeaderCell>Địa chỉ Email</TableHeaderCell>
                                <TableHeaderCell>Người sở hữu</TableHeaderCell>
                                <TableHeaderCell>Tin nhắn</TableHeaderCell>
                                <TableHeaderCell>Ngày tạo</TableHeaderCell>
                                <TableHeaderCell>Hết hạn</TableHeaderCell>
                                <TableHeaderCell className="text-right">Hành động</TableHeaderCell>
                            </tr>
                        </TableHeader>
                        <TableBody>
                            {inboxes.map((inbox) => (
                                <TableRow key={inbox.id}>
                                    <TableCell>
                                        <div className="font-medium text-slate-900 dark:text-white">
                                            {inbox.localPart}@{inbox.domain.name}
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-mono">{inbox.id}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs">{inbox.owner.email}</div>
                                        <div className="text-[10px] text-slate-500 font-mono">{inbox.ownerId}</div>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge
                                            status={`${inbox._count.messages} tin`}
                                            variant={inbox._count.messages > 0 ? "info" : "default"}
                                        />
                                    </TableCell>
                                    <TableCell>{new Date(inbox.createdAt).toLocaleDateString("vi-VN")}</TableCell>
                                    <TableCell>
                                        {inbox.expiresAt ? (
                                            <span className={new Date(inbox.expiresAt) < new Date() ? "text-red-500" : ""}>
                                                {new Date(inbox.expiresAt).toLocaleDateString("vi-VN")}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 italic">Vĩnh viễn</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <PremiumButton
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleTransfer(inbox)}
                                                disabled={!!updating}
                                                className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                title="Chuyển quyền sở hữu"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                                                </svg>
                                            </PremiumButton>
                                            <PremiumButton
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(inbox.id, `${inbox.localPart}@${inbox.domain.name}`)}
                                                disabled={updating === inbox.id}
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                title="Xóa hộp thư"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                </svg>
                                            </PremiumButton>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </PremiumTable>

                    {inboxes.length === 0 && (
                        <EmptyState
                            title="Không tìm thấy hộp thư"
                            description="Chưa có hộp thư nào được tạo hoặc không khớp với tìm kiếm"
                        />
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

            <ConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={() => deleteTarget && confirmDelete(deleteTarget)}
                title="Xóa hộp thư"
                message={`Bạn có chắc muốn xóa hộp thư ${deleteTarget?.localPart}@${deleteTarget?.domain.name}? Hành động này không thể hoàn tác.`}
                variant="danger"
                isLoading={loadingAction && !!deleteTarget}
            />

            <ConfirmModal
                isOpen={!!transferTarget}
                onClose={() => setTransferTarget(null)}
                onConfirm={() => transferTarget && confirmTransfer(transferTarget)}
                title="Chuyển quyền sở hữu"
                message={`Bạn có chắc muốn chuyển quyền sở hữu hộp thư ${transferTarget?.localPart}@${transferTarget?.domain.name}?`}
                confirmText="Tiếp tục"
                isLoading={loadingAction && !!transferTarget}
            />
        </div>
    );
}
