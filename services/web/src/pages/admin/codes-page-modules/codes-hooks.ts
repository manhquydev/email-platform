/**
 * Custom hook for CodesPage data management
 */
import { useState, useEffect, useCallback } from "react";
import { api } from "../../../utils/api";
import { getFriendlyErrorMessage } from "../../../utils/errorMapping";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import type { RedemptionCode, ServicePackage, CodeFormData } from "./codes-types";
import { DEFAULT_FORM_DATA } from "./codes-types";

export function useCodesData() {
    const { token } = useAuth();
    const [codes, setCodes] = useState<RedemptionCode[]>([]);
    const [packages, setPackages] = useState<ServicePackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState<RedemptionCode | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [codesRes, packagesRes] = await Promise.all([
                api<{ data: RedemptionCode[] }>("/admin/codes", { token }),
                api<{ packages: ServicePackage[] }>("/admin/packages", { token })
            ]);
            setCodes(codesRes.data);
            setPackages(packagesRes.packages);
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoading(false);
        }
    }, [token]);

    const handleDelete = useCallback(async (id: string) => {
        setLoading(true);
        try {
            await api(`/admin/codes/${id}`, { method: "DELETE", token });
            toast.success("Đã xóa mã đổi thưởng");
            setDeleteTarget(null);
            await loadData();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoading(false);
        }
    }, [token, loadData]);

    useEffect(() => { loadData(); }, [loadData]);

    return {
        codes, packages, loading, deleteTarget,
        setDeleteTarget, loadData, handleDelete
    };
}

export function useCodeGeneration(loadData: () => Promise<void>) {
    const { token } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState<CodeFormData>(DEFAULT_FORM_DATA);

    const handleGenerate = useCallback(async () => {
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
            setFormData(DEFAULT_FORM_DATA);
            loadData();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        }
    }, [formData, token, loadData]);

    const updateFormField = useCallback(<K extends keyof CodeFormData>(field: K, value: CodeFormData[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    return {
        showModal, setShowModal,
        formData, updateFormField,
        handleGenerate
    };
}

export function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Đã copy mã: " + text);
}
