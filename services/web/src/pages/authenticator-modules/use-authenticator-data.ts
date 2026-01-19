/**
 * Custom hook for Authenticator data management
 * Handles account CRUD, TOTP code generation, and timer
 */
import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { authenticator } from "otplib";
import { useAuth } from "../../context/AuthContext";
import { API_BASE } from "../../utils/api";
import type { AuthenticatorAccount } from "./types";

export interface UseAuthenticatorDataReturn {
    // State
    accounts: AuthenticatorAccount[];
    loading: boolean;
    timeLeft: number;
    codes: Record<string, string>;
    copiedId: string | null;
    isAdding: boolean;
    newService: string;
    newAccount: string;
    newSecret: string;
    accountToDelete: AuthenticatorAccount | null;
    isDeleting: boolean;
    // Setters
    setIsAdding: (v: boolean) => void;
    setNewService: (v: string) => void;
    setNewAccount: (v: string) => void;
    setNewSecret: (v: string) => void;
    setAccountToDelete: (v: AuthenticatorAccount | null) => void;
    // Actions
    handleAdd: (e: React.FormEvent) => Promise<void>;
    handleDelete: (account: AuthenticatorAccount) => void;
    confirmDelete: () => Promise<void>;
    copyCode: (id: string, code: string) => void;
}

export function useAuthenticatorData(): UseAuthenticatorDataReturn {
    const { token } = useAuth();
    const [accounts, setAccounts] = useState<AuthenticatorAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState(30);
    const [codes, setCodes] = useState<Record<string, string>>({});
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Add Modal State
    const [isAdding, setIsAdding] = useState(false);
    const [newService, setNewService] = useState("");
    const [newAccount, setNewAccount] = useState("");
    const [newSecret, setNewSecret] = useState("");

    const [accountToDelete, setAccountToDelete] = useState<AuthenticatorAccount | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch accounts from API
    const fetchAccounts = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/auth/authenticator/accounts`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setAccounts(data.accounts);
            } else {
                toast.error("Không thể tải tài khoản");
            }
        } catch {
            toast.error("Lỗi khi tải tài khoản");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    // Timer and Code Generation
    useEffect(() => {
        const timer = setInterval(() => {
            const epoch = Math.floor(Date.now() / 1000);
            const remaining = 30 - (epoch % 30);
            setTimeLeft(remaining);

            if (remaining === 30 || Object.keys(codes).length === 0) {
                const newCodes: Record<string, string> = {};
                accounts.forEach(acc => {
                    try {
                        if (acc.secret) {
                            newCodes[acc.id] = authenticator.generate(acc.secret);
                        }
                    } catch {
                        // Silently fail for individual accounts
                    }
                });
                setCodes(newCodes);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [accounts, codes]);

    // Generate codes when accounts change
    useEffect(() => {
        if (accounts.length > 0) {
            const newCodes: Record<string, string> = {};
            accounts.forEach(acc => {
                try {
                    if (acc.secret) {
                        newCodes[acc.id] = authenticator.generate(acc.secret);
                    }
                } catch {
                    // TOTP generation failed - skip
                }
            });
            setCodes(newCodes);
        }
    }, [accounts]);

    // Add new account
    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE}/auth/authenticator/accounts`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    serviceName: newService,
                    accountName: newAccount,
                    secret: newSecret.replace(/\s/g, "")
                })
            });

            if (res.ok) {
                toast.success("Đã thêm tài khoản!");
                setIsAdding(false);
                setNewService("");
                setNewAccount("");
                setNewSecret("");
                fetchAccounts();
            } else {
                const data = await res.json();
                toast.error(data.error || "Không thể thêm tài khoản");
            }
        } catch {
            toast.error("Lỗi khi thêm tài khoản");
        }
    };

    // Set account to delete (opens confirmation)
    const handleDelete = (account: AuthenticatorAccount) => {
        setAccountToDelete(account);
    };

    // Confirm deletion
    const confirmDelete = async () => {
        if (!accountToDelete) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`${API_BASE}/auth/authenticator/accounts/${accountToDelete.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success("Đã xóa");
                setAccounts(prev => prev.filter(a => a.id !== accountToDelete.id));
                setAccountToDelete(null);
            } else {
                toast.error("Không thể xóa");
            }
        } catch {
            toast.error("Lỗi khi xóa");
        } finally {
            setIsDeleting(false);
        }
    };

    // Copy code to clipboard
    const copyCode = (id: string, code: string) => {
        navigator.clipboard.writeText(code.replace(" ", ""));
        setCopiedId(id);
        toast.success("Đã sao chép!");
        setTimeout(() => setCopiedId(null), 2000);
    };

    return {
        accounts,
        loading,
        timeLeft,
        codes,
        copiedId,
        isAdding,
        newService,
        newAccount,
        newSecret,
        accountToDelete,
        isDeleting,
        setIsAdding,
        setNewService,
        setNewAccount,
        setNewSecret,
        setAccountToDelete,
        handleAdd,
        handleDelete,
        confirmDelete,
        copyCode,
    };
}
