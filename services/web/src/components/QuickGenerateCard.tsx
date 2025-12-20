import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import type { Domain } from '../types';
import { api } from '../utils/api';
import { useCopyEmail } from '../hooks/useCopyToClipboard';

interface QuickGenerateCardProps {
    domains: Domain[];
    token: string | null;
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

export function QuickGenerateCard({ domains, token, onInboxCreated }: QuickGenerateCardProps) {
    const [loading, setLoading] = useState(false);
    const [generatedEmail, setGeneratedEmail] = useState<string | null>(null);
    const [selectedDomainId, setSelectedDomainId] = useState<string>('');
    const { copy, copied } = useCopyEmail();

    // Get verified domains only
    const verifiedDomains = domains.filter(d => d.status === 'VERIFIED');

    // Auto-select first verified domain if none selected
    const activeDomainId = selectedDomainId || (verifiedDomains.length > 0 ? verifiedDomains[0].id : '');
    const activeDomain = domains.find(d => d.id === activeDomainId);

    const handleGenerate = useCallback(async () => {
        if (!token || !activeDomain) {
            toast.error('Vui lòng chọn domain');
            return;
        }

        setLoading(true);
        try {
            const localPart = generateRandomName();
            const response = await api<{ id: string }>('/inboxes', {
                method: 'POST',
                token,
                body: {
                    domainId: activeDomain.id,
                    localPart,
                    expiresAt: null, // Permanent by default
                },
            });

            const email = `${localPart}@${activeDomain.name}`;
            setGeneratedEmail(email);

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
    }, [token, activeDomain, copy, onInboxCreated]);

    const handleCopy = useCallback(() => {
        if (generatedEmail) {
            copy(generatedEmail);
        }
    }, [generatedEmail, copy]);

    if (verifiedDomains.length === 0) {
        return (
            <div className="quick-generate-card empty">
                <div className="quick-generate-icon">📧</div>
                <p className="text-muted text-sm">
                    Chưa có domain nào được xác thực.
                    <br />
                    Hãy thêm và xác thực domain để bắt đầu.
                </p>
            </div>
        );
    }

    return (
        <div className="quick-generate-card">
            <div className="quick-generate-header">
                <span className="quick-generate-icon">⚡</span>
                <span className="quick-generate-title">Tạo Email Nhanh</span>
            </div>

            {generatedEmail ? (
                <div className="quick-generate-result">
                    <div className="generated-email-display">
                        <span className="generated-email">{generatedEmail}</span>
                        <button
                            onClick={handleCopy}
                            className={`copy-btn ${copied ? 'copied' : ''}`}
                            title="Copy địa chỉ email"
                        >
                            {copied ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            )}
                        </button>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="regenerate-btn"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        Tạo email khác
                    </button>
                </div>
            ) : (
                <div className="quick-generate-form">
                    <div className="domain-selector">
                        <label className="text-xs text-muted">Domain:</label>
                        <select
                            value={activeDomainId}
                            onChange={(e) => setSelectedDomainId(e.target.value)}
                            className="domain-select"
                        >
                            {verifiedDomains.map(d => (
                                <option key={d.id} value={d.id}>
                                    {d.name} {d.isPublic ? '(Shared)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={loading || !activeDomain}
                        className="generate-btn"
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
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Tạo Email Ngay
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
