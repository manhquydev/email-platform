/**
 * Hook for MyDomains data and actions
 * Handles domain CRUD operations, verification, and visibility toggling
 */
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../utils/api";
import { getFriendlyErrorMessage } from "../../utils/errorMapping";
import toast from "react-hot-toast";
import type { Domain } from "../../types";

export interface UseMyDomainsDataReturn {
    // Data
    domains: Domain[];
    loading: boolean;
    // Form state
    newDomainName: string;
    setNewDomainName: (name: string) => void;
    showAddForm: boolean;
    setShowAddForm: (show: boolean) => void;
    addedDomain: Domain | null;
    setAddedDomain: (domain: Domain | null) => void;
    // Loading states
    busy: boolean;
    verifyingId: string | null;
    togglingId: string | null;
    deletingId: string | null;
    // Delete modal
    deleteTarget: Domain | null;
    setDeleteTarget: (domain: Domain | null) => void;
    // Actions
    handleAddDomain: () => Promise<void>;
    handleVerify: (domainId: string, tokenVal: string) => Promise<void>;
    handleTogglePublic: (domainId: string, currentPublic: boolean) => Promise<void>;
    handleDelete: (domain: Domain) => void;
    confirmDelete: () => Promise<void>;
    copyToClipboard: (text: string) => void;
}

export function useMyDomainsData(): UseMyDomainsDataReturn {
    const { token, user } = useAuth();
    const [domains, setDomains] = useState<Domain[]>([]);
    const [loading, setLoading] = useState(true);
    const [newDomainName, setNewDomainName] = useState("");
    const [showAddForm, setShowAddForm] = useState(false);
    const [addedDomain, setAddedDomain] = useState<Domain | null>(null);
    const [busy, setBusy] = useState(false);
    const [verifyingId, setVerifyingId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Domain | null>(null);

    const loadDomains = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await api<{ data: Domain[] }>("/domains?limit=100", { token });
            const ownedDomains = res.data.filter(d => d.ownerId === user?.id);
            setDomains(ownedDomains);
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setLoading(false);
        }
    }, [token, user?.id]);

    useEffect(() => {
        loadDomains();
    }, [loadDomains]);

    const handleAddDomain = useCallback(async () => {
        if (!newDomainName.trim()) {
            toast.error("Vui lòng nhập tên miền");
            return;
        }
        setBusy(true);
        try {
            const res = await api<{ domain: Domain }>("/domains", { method: "POST", token, body: { name: newDomainName.trim() } });
            setAddedDomain(res.domain);
            toast.success("Đã thêm tên miền!");
            setNewDomainName("");
            await loadDomains();
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setBusy(false);
        }
    }, [newDomainName, token, loadDomains]);

    const handleVerify = useCallback(async (domainId: string, tokenVal: string) => {
        setVerifyingId(domainId);
        try {
            await api(`/domains/${domainId}/verify`, { method: "POST", token, body: { token: tokenVal } });
            toast.success("Đã xác thực tên miền!");
            await loadDomains();
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setVerifyingId(null);
        }
    }, [token, loadDomains]);

    const handleTogglePublic = useCallback(async (domainId: string, currentPublic: boolean) => {
        setTogglingId(domainId);
        try {
            await api(`/domains/${domainId}`, {
                method: "PATCH",
                token,
                body: { isPublic: !currentPublic }
            });
            toast.success(currentPublic ? "Đã chuyển sang riêng tư" : "Đã chia sẻ công khai");
            await loadDomains();
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setTogglingId(null);
        }
    }, [token, loadDomains]);

    const handleDelete = useCallback((domain: Domain) => {
        setDeleteTarget(domain);
    }, []);

    const confirmDelete = useCallback(async () => {
        if (!deleteTarget) return;
        setDeletingId(deleteTarget.id);
        try {
            await api(`/domains/${deleteTarget.id}`, { method: "DELETE", token });
            toast.success("Đã xóa tên miền");
            setDeleteTarget(null);
            await loadDomains();
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setDeletingId(null);
        }
    }, [deleteTarget, token, loadDomains]);

    const copyToClipboard = useCallback((text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Đã sao chép!");
    }, []);

    return {
        domains,
        loading,
        newDomainName,
        setNewDomainName,
        showAddForm,
        setShowAddForm,
        addedDomain,
        setAddedDomain,
        busy,
        verifyingId,
        togglingId,
        deletingId,
        deleteTarget,
        setDeleteTarget,
        handleAddDomain,
        handleVerify,
        handleTogglePublic,
        handleDelete,
        confirmDelete,
        copyToClipboard,
    };
}
