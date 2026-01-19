/**
 * Hook for loading packages data
 */
import { useState, useEffect, useCallback } from "react";
import { api } from "../../../utils/api";
import { getFriendlyErrorMessage } from "../../../utils/errorMapping";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import type { ServicePackage } from "./types";

export interface UsePackagesDataReturn {
    packages: ServicePackage[];
    loading: boolean;
    loadPackages: () => Promise<void>;
    setPackages: React.Dispatch<React.SetStateAction<ServicePackage[]>>;
}

export function usePackagesData(): UsePackagesDataReturn {
    const { token } = useAuth();
    const [packages, setPackages] = useState<ServicePackage[]>([]);
    const [loading, setLoading] = useState(true);

    const loadPackages = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api<{ packages: ServicePackage[] }>("/admin/packages", { token });
            setPackages(res.packages);
        } catch (err) {
            console.error('[PackagesPage] Load packages failed:', err);
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { loadPackages(); }, [loadPackages]);

    return {
        packages,
        loading,
        loadPackages,
        setPackages
    };
}
