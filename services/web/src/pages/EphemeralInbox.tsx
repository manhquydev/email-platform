/**
 * Ephemeral Inbox Page - Public zero-friction temporary inbox
 * No authentication required - token-based access
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { SEOHead } from '../components/seo/SEOHead';
import { Loading } from '../components/Loading';
import { ephemeralService, type EphemeralInbox as EphemeralInboxType, type EphemeralMessage } from '../services/ephemeralService';
import { EphemeralHeader, EphemeralMessageList } from './ephemeral-inbox-modules';

const POLL_INTERVAL = 10000; // 10 seconds

export function EphemeralInbox() {
    const { token } = useParams<{ token?: string }>();
    const navigate = useNavigate();

    const [inbox, setInbox] = useState<EphemeralInboxType | null>(null);
    const [messages, setMessages] = useState<EphemeralMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isExtending, setIsExtending] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Create new inbox
    const createInbox = useCallback(async () => {
        setIsCreating(true);
        setError(null);

        try {
            const newInbox = await ephemeralService.create();
            navigate(`/e/${newInbox.token}`, { replace: true });
        } catch (err: any) {
            if (err?.status === 429) {
                setError('Bạn đã tạo quá nhiều inbox. Vui lòng thử lại sau 1 giờ.');
                toast.error('Giới hạn tạo inbox đã đạt');
            } else {
                setError('Không thể tạo inbox. Vui lòng thử lại.');
                toast.error('Lỗi tạo inbox');
            }
        } finally {
            setIsCreating(false);
        }
    }, [navigate]);

    // Fetch inbox data
    const fetchInbox = useCallback(async (inboxToken: string) => {
        try {
            const data = await ephemeralService.get(inboxToken);
            if (!data) {
                setError('Inbox không tồn tại hoặc đã hết hạn.');
                setInbox(null);
                return false;
            }
            setInbox(data);
            setError(null);
            return true;
        } catch {
            setError('Không thể tải inbox.');
            return false;
        }
    }, []);

    // Fetch messages
    const fetchMessages = useCallback(async (inboxToken: string) => {
        try {
            const response = await ephemeralService.getMessages(inboxToken);
            setMessages(response.data);
            setLastRefresh(new Date());
        } catch {
            // Silent fail for message polling
        }
    }, []);

    // Extend inbox
    const handleExtend = async () => {
        if (!token) return;

        setIsExtending(true);
        try {
            const extended = await ephemeralService.extend(token);
            if (extended) {
                setInbox(extended);
                toast.success('Đã gia hạn thêm 1 giờ!');
            } else {
                toast.error('Inbox đã hết hạn');
            }
        } catch (err: any) {
            if (err?.status === 429) {
                toast.error('Đã đạt giới hạn gia hạn. Thử lại sau.');
            } else {
                toast.error('Không thể gia hạn');
            }
        } finally {
            setIsExtending(false);
        }
    };

    // Initial load
    useEffect(() => {
        if (!token) {
            // No token - create new inbox
            createInbox();
            return;
        }

        // Load existing inbox
        setIsLoading(true);
        Promise.all([fetchInbox(token), fetchMessages(token)]).finally(() => {
            setIsLoading(false);
        });
    }, [token, createInbox, fetchInbox, fetchMessages]);

    // Polling for messages
    useEffect(() => {
        if (!token || !inbox) return;

        const interval = setInterval(() => {
            fetchMessages(token);
        }, POLL_INTERVAL);

        // Pause polling when tab is hidden
        const handleVisibility = () => {
            if (document.hidden) {
                clearInterval(interval);
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [token, inbox, fetchMessages]);

    // Loading state
    if (isLoading || isCreating) {
        return (
            <div className="min-h-screen neo-mesh-bg flex items-center justify-center">
                <SEOHead
                    title="Email Tạm Thời - Ephemera"
                    description="Tạo email tạm thời miễn phí, không cần đăng ký. Nhận email ngay lập tức."
                    path="/e"
                />
                <div className="text-center">
                    <Loading />
                    <p className="mt-4 text-[var(--nebula-text-secondary)]">
                        {isCreating ? 'Đang tạo inbox mới...' : 'Đang tải...'}
                    </p>
                </div>
            </div>
        );
    }

    // Error state
    if (error && !inbox) {
        return (
            <div className="min-h-screen neo-mesh-bg flex items-center justify-center p-4">
                <SEOHead
                    title="Email Tạm Thời - Ephemera"
                    description="Tạo email tạm thời miễn phí, không cần đăng ký."
                    path="/e"
                />
                <div className="neo-glass rounded-xl p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-red-400 !text-[32px]">error</span>
                    </div>
                    <h1 className="text-xl font-bold text-white mb-2">Không thể truy cập</h1>
                    <p className="text-[var(--nebula-text-secondary)] mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/e')}
                        className="px-6 py-3 bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] text-white rounded-lg font-medium transition-all"
                    >
                        Tạo inbox mới
                    </button>
                </div>
            </div>
        );
    }

    // Main view
    return (
        <div className="min-h-screen neo-mesh-bg">
            <SEOHead
                title={inbox ? `${inbox.address} - Email Tạm Thời` : 'Email Tạm Thời - Ephemera'}
                description="Email tạm thời miễn phí, tự hủy. Bảo vệ quyền riêng tư của bạn."
                path={`/e/${token}`}
            />

            <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
                {/* Back to home */}
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-[var(--nebula-text-secondary)] hover:text-white mb-6 transition-colors"
                >
                    <span className="material-symbols-outlined !text-[18px]">arrow_back</span>
                    Về trang chủ
                </button>

                {/* Page title */}
                <div className="mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                        📬 Email Tạm Thời
                    </h1>
                    <p className="text-[var(--nebula-text-secondary)]">
                        Email này sẽ tự hủy sau thời gian hết hạn. Không cần đăng ký.
                    </p>
                </div>

                {/* Inbox header with address and timer */}
                {inbox && (
                    <EphemeralHeader
                        inbox={inbox}
                        onExtend={handleExtend}
                        isExtending={isExtending}
                    />
                )}

                {/* Messages list */}
                <EphemeralMessageList
                    messages={messages}
                    isLoading={isLoading}
                    lastRefresh={lastRefresh}
                />

                {/* Create new button (when expired) */}
                {inbox && new Date(inbox.expiresAt) < new Date() && (
                    <div className="mt-6 text-center">
                        <button
                            onClick={() => navigate('/e')}
                            className="px-6 py-3 bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] text-white rounded-lg font-medium transition-all"
                        >
                            Tạo inbox mới
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default EphemeralInbox;
