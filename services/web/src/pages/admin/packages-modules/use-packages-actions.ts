/**
 * Hook for package CRUD actions
 */
import { useState, useCallback } from "react";
import { api } from "../../../utils/api";
import { getFriendlyErrorMessage } from "../../../utils/errorMapping";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import type { ServicePackage, PackageFormData, PlanFeature } from "./types";
import { DEFAULT_FORM_DATA } from "./types";

export interface UsePackagesActionsProps {
    packages: ServicePackage[];
    setPackages: React.Dispatch<React.SetStateAction<ServicePackage[]>>;
    loadPackages: () => Promise<void>;
}

export interface UsePackagesActionsReturn {
    // Modal state
    showModal: boolean;
    setShowModal: (show: boolean) => void;
    editingId: string | null;
    deleteTarget: ServicePackage | null;
    setDeleteTarget: (pkg: ServicePackage | null) => void;

    // Form state
    formData: PackageFormData;
    setFormData: React.Dispatch<React.SetStateAction<PackageFormData>>;
    newFeatureText: string;
    setNewFeatureText: (text: string) => void;
    newFeatureIncluded: boolean;
    setNewFeatureIncluded: (included: boolean) => void;

    // Actions
    handleSubmit: () => Promise<void>;
    handleEdit: (pkg: ServicePackage) => void;
    handleDelete: (pkg: ServicePackage) => Promise<void>;
    handleToggleStatus: (pkg: ServicePackage, newStatus: boolean) => Promise<void>;
    resetForm: () => void;
    addFeature: () => void;
    removeFeature: (index: number) => void;
    openCreateModal: () => void;
}

export function usePackagesActions({
    packages,
    setPackages,
    loadPackages
}: UsePackagesActionsProps): UsePackagesActionsReturn {
    const { token } = useAuth();

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<ServicePackage | null>(null);

    // Form state
    const [formData, setFormData] = useState<PackageFormData>(DEFAULT_FORM_DATA);
    const [newFeatureText, setNewFeatureText] = useState("");
    const [newFeatureIncluded, setNewFeatureIncluded] = useState(true);

    const resetForm = useCallback(() => {
        setEditingId(null);
        setFormData(DEFAULT_FORM_DATA);
        setNewFeatureText("");
        setNewFeatureIncluded(true);
    }, []);

    const openCreateModal = useCallback(() => {
        resetForm();
        setShowModal(true);
    }, [resetForm]);

    const handleSubmit = useCallback(async () => {
        if (!formData.name) {
            toast.error("Vui lòng nhập tên gói");
            return;
        }

        try {
            const payload = {
                ...formData,
                durationDays: Number(formData.durationDays),
                price: Number(formData.price),
                creditAmount: Number(formData.creditAmount),
                displayOrder: Number(formData.displayOrder),
                features: formData.features.length > 0 ? formData.features : undefined,
                badge: formData.badge || undefined
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
            console.error('[PackagesPage] Submit failed:', err);
            toast.error(getFriendlyErrorMessage((err as Error).message));
        }
    }, [formData, editingId, token, resetForm, loadPackages]);

    const handleEdit = useCallback((pkg: ServicePackage) => {
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
            isActive: pkg.isActive,
            features: (pkg.features as PlanFeature[]) || [],
            displayOrder: pkg.displayOrder || 0,
            recommended: pkg.recommended || false,
            badge: pkg.badge || ""
        });
        setShowModal(true);
    }, []);

    const handleDelete = useCallback(async (pkg: ServicePackage) => {
        try {
            const res = await api<{ success: boolean, deactivated?: boolean, message?: string }>(
                `/admin/packages/${pkg.id}`,
                { method: "DELETE", token }
            );

            if (res.deactivated) {
                toast(res.message || "Gói đã được vô hiệu hóa", { icon: 'ℹ️', duration: 4000 });
            } else {
                toast.success(res.message || "Đã xóa gói dịch vụ");
            }

            loadPackages();
        } catch (err) {
            console.error('[PackagesPage] Delete failed:', err);
            toast.error(getFriendlyErrorMessage((err as Error).message));
        }
    }, [token, loadPackages]);

    const handleToggleStatus = useCallback(async (pkg: ServicePackage, newStatus: boolean) => {
        try {
            await api(`/admin/packages/${pkg.id}`, {
                method: "PATCH",
                token,
                body: { isActive: newStatus }
            });
            setPackages(packages.map(p => p.id === pkg.id ? { ...p, isActive: newStatus } : p));
            toast.success(newStatus ? "Đã kích hoạt gói" : "Đã vô hiệu hóa gói");
        } catch (err) {
            console.error('[PackagesPage] Toggle status failed:', err);
            toast.error(getFriendlyErrorMessage((err as Error).message));
        }
    }, [token, packages, setPackages]);

    const addFeature = useCallback(() => {
        if (!newFeatureText.trim()) return;
        setFormData(prev => ({
            ...prev,
            features: [...prev.features, { text: newFeatureText.trim(), included: newFeatureIncluded }]
        }));
        setNewFeatureText("");
        setNewFeatureIncluded(true);
    }, [newFeatureText, newFeatureIncluded]);

    const removeFeature = useCallback((index: number) => {
        setFormData(prev => ({
            ...prev,
            features: prev.features.filter((_, i) => i !== index)
        }));
    }, []);

    return {
        showModal,
        setShowModal,
        editingId,
        deleteTarget,
        setDeleteTarget,
        formData,
        setFormData,
        newFeatureText,
        setNewFeatureText,
        newFeatureIncluded,
        setNewFeatureIncluded,
        handleSubmit,
        handleEdit,
        handleDelete,
        handleToggleStatus,
        resetForm,
        addFeature,
        removeFeature,
        openCreateModal
    };
}
