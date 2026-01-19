/**
 * Types and hooks for AdminEmails
 */
import { useState, useEffect, useCallback } from "react";
import { api } from "../../../utils/api";
import { getFriendlyErrorMessage } from "../../../utils/errorMapping";
import toast from "react-hot-toast";

export interface Email {
    id: string;
    subject: string;
    fromAddress: string;
    toAddress: string;
    receivedAt: string;
    isRead: boolean;
    inbox: {
        localPart: string;
        domain: { name: string };
    };
}

export interface EmailDetail extends Email {
    htmlBody?: string;
    textBody?: string;
}

export const PAGE_SIZE = 20;

/** Hook to manage admin emails data and actions */
export function useAdminEmails(token: string) {
    const [emails, setEmails] = useState<Email[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadEmails = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (startDate) params.set("startDate", startDate);
            if (endDate) params.set("endDate", endDate);
            params.set("limit", String(PAGE_SIZE));
            params.set("offset", String(page * PAGE_SIZE));

            const res = await api<{ data: Email[]; meta: { total: number } }>(`/admin/emails?${params}`, { token });
            setEmails(res.data);
            setTotal(res.meta.total);
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoading(false);
        }
    }, [token, search, startDate, endDate, page]);

    useEffect(() => { loadEmails(); }, [loadEmails]);

    const handleViewEmail = async (emailId: string) => {
        setLoadingDetail(true);
        try {
            const res = await api<{ email: EmailDetail }>(`/admin/emails/${emailId}`, { token });
            setSelectedEmail(res.email);
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleDeleteEmail = (emailId: string) => {
        setDeleteTarget(emailId);
    };

    const confirmDeleteEmail = async (emailId: string) => {
        setIsDeleting(true);
        try {
            await api(`/admin/emails/${emailId}`, { method: "DELETE", token });
            toast.success("Đã xóa email");
            setDeleteTarget(null);
            setSelectedEmail(null);
            loadEmails();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setIsDeleting(false);
        }
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return {
        emails,
        loading,
        search, setSearch,
        startDate, setStartDate,
        endDate, setEndDate,
        page, setPage,
        total,
        totalPages,
        selectedEmail, setSelectedEmail,
        loadingDetail,
        deleteTarget, setDeleteTarget,
        isDeleting,
        handleViewEmail,
        handleDeleteEmail,
        confirmDeleteEmail
    };
}
