import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { authenticator } from "otplib";
import { useAuth } from "../context/AuthContext";
import { API_BASE } from "../utils/api";

interface AuthenticatorAccount {
    id: string;
    serviceName: string;
    accountName?: string;
    secret: string; // Decrypted by API
    issuer?: string;
}


export function Authenticator() {
    const { token } = useAuth();
    const [accounts, setAccounts] = useState<AuthenticatorAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState(30);
    const [codes, setCodes] = useState<Record<string, string>>({});

    // Add Modal State
    const [isAdding, setIsAdding] = useState(false);
    const [newService, setNewService] = useState("");
    const [newAccount, setNewAccount] = useState("");
    const [newSecret, setNewSecret] = useState("");

    const fetchAccounts = async () => {
        try {
            const res = await fetch(`${API_BASE}/auth/authenticator/accounts`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setAccounts(data.accounts);
            } else {
                toast.error("Failed to load accounts");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error loading accounts");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, [token]);

    // Timer and Code Generation
    useEffect(() => {
        const timer = setInterval(() => {
            const epoch = Math.floor(Date.now() / 1000);
            const remaining = 30 - (epoch % 30);
            setTimeLeft(remaining);

            // Regenerate codes if almost expired or not set
            if (remaining === 30 || Object.keys(codes).length === 0) {
                const newCodes: Record<string, string> = {};
                accounts.forEach(acc => {
                    try {
                        if (acc.secret) {
                            newCodes[acc.id] = authenticator.generate(acc.secret);
                        }
                    } catch (e) {
                        console.error("Error generating code for", acc.serviceName, e);
                    }
                });
                setCodes(newCodes);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [accounts]); // Re-run when accounts change to generate immediately

    // Generate codes immediately when accounts load
    useEffect(() => {
        if (accounts.length > 0) {
            const newCodes: Record<string, string> = {};
            accounts.forEach(acc => {
                try {
                    if (acc.secret) {
                        newCodes[acc.id] = authenticator.generate(acc.secret);
                    }
                } catch (e) { }
            });
            setCodes(newCodes);
        }
    }, [accounts]);

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
                    secret: newSecret.replace(/\s/g, "") // Remove spaces
                })
            });

            if (res.ok) {
                toast.success("Account added!");
                setIsAdding(false);
                setNewService("");
                setNewAccount("");
                setNewSecret("");
                fetchAccounts();
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to add account");
            }
        } catch (err) {
            toast.error("Error adding account");
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete ${name}?`)) return;
        try {
            const res = await fetch(`${API_BASE}/auth/authenticator/accounts/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success("Deleted");
                setAccounts(prev => prev.filter(a => a.id !== id));
            } else {
                toast.error("Failed to delete");
            }
        } catch (err) {
            toast.error("Error deleting");
        }
    };

    return (
        <div className="h-full flex flex-col bg-bg">
            <header className="p-4 border-b border-border bg-surface flex justify-between items-center">
                <div>
                    <h1 className="text-lg font-bold">2FA Authenticator</h1>
                    <p className="text-xs text-muted">Secure OTP Vault</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="btn-primary text-sm px-3 py-1.5"
                >
                    + Add Account
                </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="text-center text-muted mt-10">Loading vault...</div>
                ) : accounts.length === 0 ? (
                    <div className="text-center text-muted mt-10 flex flex-col items-center">
                        <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        <p>No accounts yet.</p>
                        <button onClick={() => setIsAdding(true)} className="text-primary mt-2 hover:underline">Add your first 2FA account</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {accounts.map(acc => {
                            const code = codes[acc.id] || "--- ---";
                            return (
                                <div key={acc.id} className="bg-surface border border-border rounded-lg p-4 shadow-sm relative group overflow-hidden">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-bold text-lg truncate" title={acc.serviceName}>{acc.serviceName}</h3>
                                            <p className="text-xs text-muted truncate">{acc.accountName}</p>
                                        </div>
                                        <div className="w-6 h-6 rounded-full bg-bg border border-border flex items-center justify-center text-[10px] font-mono text-muted">
                                            {timeLeft}s
                                        </div>
                                    </div>

                                    <div className="my-4 flex justify-between items-center group/code cursor-pointer"
                                        onClick={() => {
                                            navigator.clipboard.writeText(code.replace(" ", ""));
                                            toast.success("Copied!");
                                        }}
                                        title="Click to copy"
                                    >
                                        <div className="text-3xl font-mono font-bold tracking-widest text-primary group-hover/code:scale-105 transition-transform">
                                            {code.slice(0, 3)} {code.slice(3)}
                                        </div>
                                        <svg className="w-5 h-5 text-muted opacity-0 group-hover/code:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="absolute bottom-0 left-0 h-1 bg-primary transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / 30) * 100}%` }} />

                                    <button
                                        onClick={() => handleDelete(acc.id, acc.serviceName)}
                                        className="absolute top-2 right-2 p-1.5 text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Delete"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Manual Add Modal */}
            {isAdding && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-surface p-6 rounded-lg shadow-xl w-full max-w-sm border border-border">
                        <h2 className="text-lg font-bold mb-4">Add Account Manually</h2>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-muted uppercase block mb-1">Service Name</label>
                                <input
                                    className="w-full input p-2 text-sm border rounded bg-bg text-text-main"
                                    placeholder="e.g. Google"
                                    required
                                    value={newService}
                                    onChange={e => setNewService(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-muted uppercase block mb-1">Account Name (Optional)</label>
                                <input
                                    className="w-full input p-2 text-sm border rounded bg-bg text-text-main"
                                    placeholder="e.g. user@example.com"
                                    value={newAccount}
                                    onChange={e => setNewAccount(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-muted uppercase block mb-1">Secret Key</label>
                                <input
                                    className="w-full input p-2 text-sm border rounded bg-bg text-text-main font-mono"
                                    placeholder="Base32 Key"
                                    required
                                    value={newSecret}
                                    onChange={e => setNewSecret(e.target.value.toUpperCase())}
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-1.5 text-sm hover:underline">Cancel</button>
                                <button type="submit" className="btn-primary px-3 py-1.5 text-sm">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
