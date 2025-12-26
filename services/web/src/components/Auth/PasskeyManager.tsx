import React, { useState, useEffect } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { api } from '../../utils/api';
import toast from 'react-hot-toast';
import { getFriendlyErrorMessage } from '../../utils/errorMapping';
import { useAuth } from '../../context/AuthContext';
import { ConfirmationModal } from '../ConfirmationModal';

interface Passkey {
    id: string;
    credentialID: string;
    createdAt: string;
    lastUsedAt?: string;
    transports?: string[];
}

export const PasskeyManager: React.FC = () => {
    const { token } = useAuth();
    const [passkeys, setPasskeys] = useState<Passkey[]>([]);
    const [loading, setLoading] = useState(false);
    const [registering, setRegistering] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Load passkeys on mount
    useEffect(() => {
        loadPasskeys();
    }, []);

    const loadPasskeys = async () => {
        setLoading(true);
        try {
            const data = await api<Passkey[]>('/auth/webauthn/credentials', { token });
            setPasskeys(data);
        } catch (error) {
            // Error silently handled as loading state is reset, but we could toast if critical
        } finally {
            setLoading(false);
        }
    };

    const confirmDeletePasskey = (id: string) => {
        setDeleteId(id);
    };

    const handleDeletePasskey = async () => {
        if (!deleteId) return;
        try {
            await api(`/auth/webauthn/credentials/${deleteId}`, { method: 'DELETE', token });
            toast.success("Passkey removed");
            loadPasskeys();
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setDeleteId(null);
        }
    };

    const handleRegisterPasskey = async () => {
        setRegistering(true);
        try {
            // 1. Get options
            const options = await api<any>('/auth/webauthn/register/options', { method: 'POST', body: {}, token });

            // 2. Create credential
            let attResp;
            try {
                // Fix: Pass as named object { optionsJSON } for v13+
                attResp = await startRegistration({ optionsJSON: options });
            } catch (error) {
                if ((error as any).name === 'NotAllowedError') {
                    toast.error("User cancelled or timed out.");
                } else {
                    toast.error("Failed to prompt for passkey.");
                }
                setRegistering(false);
                return;
            }

            // 3. Verify
            await api<any>('/auth/webauthn/register/verify', {
                method: 'POST',
                body: attResp,
                token
            });

            toast.success("Passkey added successfully!");
            loadPasskeys();
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setRegistering(false);
        }
    };

    return (
        <div className="glass-card">
            <div className="glass-card-header">
                <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--nebula-text)' }}>
                    <svg className="w-5 h-5" style={{ color: 'var(--nebula-text-muted)' }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                    </svg>
                    Passkeys (Đăng nhập không mật khẩu)
                </h3>
            </div>
            <div className="glass-card-body">
                <div className="space-y-4">
                    <p style={{ color: 'var(--nebula-text-muted)' }}>
                        Passkeys cho phép bạn đăng nhập an toàn bằng vân tay, khuôn mặt hoặc khóa bảo mật màn hình mà không cần mật khẩu.
                    </p>

                    {/* List of Passkeys */}
                    <div className="space-y-2">
                        {loading && passkeys.length === 0 ? (
                            <div className="text-center py-4 text-sm opacity-60">Loading...</div>
                        ) : passkeys.length > 0 ? (
                            passkeys.map(pk => (
                                <div key={pk.id} className="flex items-center justify-between p-3 rounded-lg border border-[var(--nebula-border)] bg-[var(--nebula-bg-secondary)]">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-sm" style={{ color: 'var(--nebula-text)' }}>Passkey added on {new Date(pk.createdAt).toLocaleDateString()}</span>
                                        <div className="text-sm text-gray-500">
                                            Tạo lúc: {new Date(pk.createdAt).toLocaleDateString('vi-VN')}
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            confirmDeletePasskey(pk.id);
                                        }}
                                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                        title="Xóa Passkey"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-4 text-sm opacity-60 border border-dashed border-[var(--nebula-border)] rounded-lg" style={{ color: 'var(--nebula-text-muted)' }}>
                                Chưa có passkey nào. Thêm mới để đăng nhập nhanh hơn.
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleRegisterPasskey}
                        disabled={registering}
                        className="btn-nebula btn-nebula-primary flex items-center gap-2 w-full justify-center"
                    >
                        {registering ? 'Đang thêm...' : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Thêm Passkey mới
                            </>
                        )}
                    </button>
                </div>
            </div>

            <ConfirmationModal
                isOpen={!!deleteId}
                title="Xóa Passkey"
                message="Bạn có chắc chắn muốn xóa passkey này không? Hành động này không thể hoàn tác."
                confirmLabel="Xóa"
                cancelLabel="Hủy"
                isDestructive={true}
                isLoading={false}
                onConfirm={handleDeletePasskey}
                onCancel={() => setDeleteId(null)}
            />
        </div>
    );
};
