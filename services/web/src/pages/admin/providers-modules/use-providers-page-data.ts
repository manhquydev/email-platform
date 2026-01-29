/**
 * Custom hook for ProvidersPage data management
 * Handles provider CRUD, pagination, search
 */
import { useState, useEffect, useCallback } from "react";
import { api } from "../../../utils/api";
import { getFriendlyErrorMessage } from "../../../utils/errorMapping";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import type { Provider, ProviderUsage, CreateProviderData } from "./types";
import { PAGE_SIZE } from "./types";

export interface UseProvidersPageDataReturn {
  // Data
  providers: Provider[];
  loading: boolean;
  total: number;
  page: number;
  search: string;
  updating: string | null;
  // Modals
  showCreateModal: boolean;
  selectedProvider: Provider | null;
  newApiKey: string | null;
  providerUsage: ProviderUsage | null;
  loadingUsage: boolean;
  // Setters
  setSearch: (v: string) => void;
  setPage: (v: number) => void;
  setShowCreateModal: (v: boolean) => void;
  setSelectedProvider: (v: Provider | null) => void;
  setNewApiKey: (v: string | null) => void;
  // Actions
  createProvider: (data: CreateProviderData) => Promise<boolean>;
  regenerateApiKey: (id: string) => Promise<void>;
  updateStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED') => Promise<void>;
  loadProviderUsage: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  // Pagination
  totalPages: number;
}

export function useProvidersPageData(): UseProvidersPageDataReturn {
  const { token } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [providerUsage, setProviderUsage] = useState<ProviderUsage | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  // Load providers with search and pagination
  const loadProviders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(page * PAGE_SIZE));

      const res = await api<{ data: Provider[]; meta: { total: number } }>(
        `/v1/admin/providers?${params}`,
        { token }
      );
      setProviders(res.data);
      setTotal(res.meta.total);
    } catch (err) {
      toast.error(getFriendlyErrorMessage((err as Error).message));
    } finally {
      setLoading(false);
    }
  }, [token, search, page]);

  useEffect(() => { loadProviders(); }, [loadProviders]);
  useEffect(() => { setPage(0); }, [search]);

  // Create provider
  const createProvider = async (data: CreateProviderData): Promise<boolean> => {
    try {
      const res = await api<{ provider: Provider; apiKey: string }>(
        "/v1/admin/providers",
        { method: "POST", token, body: data }
      );
      toast.success("Provider đã được tạo thành công");
      setNewApiKey(res.apiKey);
      setShowCreateModal(false);
      await loadProviders();
      return true;
    } catch (err) {
      toast.error(getFriendlyErrorMessage((err as Error).message));
      return false;
    }
  };

  // Regenerate API key
  const regenerateApiKey = async (id: string) => {
    setUpdating(id);
    try {
      const res = await api<{ apiKey: string }>(
        `/v1/admin/providers/${id}/regenerate-key`,
        { method: "POST", token }
      );
      toast.success("API key mới đã được tạo");
      setNewApiKey(res.apiKey);
    } catch (err) {
      toast.error(getFriendlyErrorMessage((err as Error).message));
    } finally {
      setUpdating(null);
    }
  };

  // Update status (suspend/activate)
  const updateStatus = async (id: string, status: 'ACTIVE' | 'SUSPENDED') => {
    setUpdating(id);
    try {
      await api<{ provider: Provider }>(
        `/v1/admin/providers/${id}/status`,
        { method: "PATCH", token, body: { status } }
      );
      toast.success(status === 'ACTIVE' ? "Đã kích hoạt provider" : "Đã tạm ngưng provider");
      await loadProviders();
    } catch (err) {
      toast.error(getFriendlyErrorMessage((err as Error).message));
    } finally {
      setUpdating(null);
    }
  };

  // Load provider usage stats
  const loadProviderUsage = async (id: string) => {
    setLoadingUsage(true);
    try {
      const res = await api<{ usage: ProviderUsage }>(
        `/v1/admin/providers/${id}/usage`,
        { token }
      );
      setProviderUsage(res.usage);
    } catch (err) {
      toast.error(getFriendlyErrorMessage((err as Error).message));
    } finally {
      setLoadingUsage(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return {
    providers,
    loading,
    total,
    page,
    search,
    updating,
    showCreateModal,
    selectedProvider,
    newApiKey,
    providerUsage,
    loadingUsage,
    setSearch,
    setPage,
    setShowCreateModal,
    setSelectedProvider,
    setNewApiKey,
    createProvider,
    regenerateApiKey,
    updateStatus,
    loadProviderUsage,
    refresh: loadProviders,
    totalPages,
  };
}
