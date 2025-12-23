import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import type { Domain } from '../types';
import { api } from '../utils/api';
import { useCopyEmail } from '../hooks/useCopyToClipboard';

interface CreateInboxModalProps {
    domains: Domain[];
    token: string | null;
    onClose: () => void;
    onInboxCreated?: (inboxId: string, email: string) => void;
}

// Generate random string for email
const generateRandomName = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

export function CreateInboxModal({ domains, token, onClose, onInboxCreated }: CreateInboxModalProps) {
    const [loading, setLoading] = useState(false);
    const [localPart, setLocalPart] = useState(generateRandomName());
    const [selectedDomainId, setSelectedDomainId] = useState<string>('');
    const { copy } = useCopyEmail();

    // Get verified domains only
    const verifiedDomains = domains.filter(d => d.status === 'VERIFIED');

    // Auto-select first verified domain if none selected
    const activeDomainId = selectedDomainId || (verifiedDomains.length > 0 ? verifiedDomains[0].id : '');
    const activeDomain = domains.find(d => d.id === activeDomainId);

    const handleRandomize = () => {
        setLocalPart(generateRandomName());
    };

    const handleCreate = useCallback(async () => {
        if (!token || !activeDomain) {
            toast.error('Vui lòng chọn domain');
            return;
        }

        if (!localPart.trim()) {
            toast.error('Vui lòng nhập địa chỉ email');
            return;
        }

        // Validate local part
        const localPartRegex = /^[a-zA-Z0-9._-]+$/;
        if (!localPartRegex.test(localPart)) {
            toast.error('Địa chỉ email chỉ được chứa chữ cái, số, dấu chấm, gạch ngang và gạch dưới');
            return;
        }

        setLoading(true);
        try {
            const response = await api<{ id: string }>('/inboxes', {
                method: 'POST',
                token,
                body: {
                    domainId: activeDomain.id,
                    localPart: localPart.trim().toLowerCase(),
                    expiresAt: null, // Permanent by default
                },
            });

            const email = `${localPart.trim().toLowerCase()}@${activeDomain.name}`;

            // Auto-copy to clipboard
            await copy(email, `Đã tạo và copy: ${email}`);

            // Callback to parent
            if (onInboxCreated) {
                onInboxCreated(response.id, email);
            }
        } catch (error) {
            console.error('Failed to create inbox:', error);
            toast.error('Không thể tạo email: ' + (error as Error).message);
        } finally {
            setLoading(false);
        }
    }, [token, activeDomain, localPart, copy, onInboxCreated]);

    const previewEmail = activeDomain ? `${localPart.toLowerCase()}@${activeDomain.name}` : '';

    return (
        <>
            <div className="modal-overlay" onClick={onClose} />
            <div className="create-inbox-modal">
                <div className="create-inbox-header">
                    <h2>Tạo địa chỉ email mới</h2>
                    <button onClick={onClose} className="modal-close" title="Đóng">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="create-inbox-content">
                    {verifiedDomains.length === 0 ? (
                        <div className="create-inbox-empty">
                            <div className="empty-icon">📧</div>
                            <h4>Chưa có domain khả dụng</h4>
                            <p>Tài khoản của bạn chưa có domain nào được xác thực.</p>
                            <button onClick={() => window.location.href = '/app?tab=domains'} className="btn-primary">
                                + Quản lý Domain
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Email Preview */}
                            <div className="email-preview">
                                <span className="email-preview-label">Địa chỉ email:</span>
                                <span className="email-preview-value">{previewEmail || 'chọn domain...'}</span>
                            </div>

                            {/* Local Part Input */}
                            <div className="form-group">
                                <label htmlFor="localPart">Tên email</label>
                                <div className="input-with-button">
                                    <input
                                        id="localPart"
                                        type="text"
                                        value={localPart}
                                        onChange={(e) => setLocalPart(e.target.value.toLowerCase())}
                                        placeholder="vd: contact, info, hello"
                                        className="form-input"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={handleRandomize}
                                        className="btn-secondary btn-icon"
                                        title="Tạo ngẫu nhiên"
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 18, height: 18 }}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Domain Select */}
                            <div className="form-group">
                                <label htmlFor="domain">Domain</label>
                                <select
                                    id="domain"
                                    value={activeDomainId}
                                    onChange={(e) => setSelectedDomainId(e.target.value)}
                                    className="form-select"
                                >
                                    {verifiedDomains.map(d => (
                                        <option key={d.id} value={d.id}>
                                            @{d.name} {d.isPublic ? '(Shared)' : '(Private)'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}
                </div>

                {verifiedDomains.length > 0 && (
                    <div className="create-inbox-footer">
                        <button onClick={onClose} className="btn-secondary" disabled={loading}>
                            Hủy
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={loading || !activeDomain || !localPart.trim()}
                            className="btn-primary"
                        >
                            {loading ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Đang tạo...
                                </>
                            ) : (
                                <>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                    Tạo Email
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
