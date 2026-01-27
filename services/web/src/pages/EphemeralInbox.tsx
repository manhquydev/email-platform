/**
 * Ephemeral Inbox Page - Public zero-friction temporary inbox
 * Refactored to use useEphemeralInbox hook for shared logic with homepage widget
 */
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { SEOHead } from '../components/seo/SEOHead';
import { Loading } from '../components/Loading';
import { useEphemeralInbox } from '../hooks/useEphemeralInbox';
import { EphemeralHeader, EphemeralMessageList } from './ephemeral-inbox-modules';

export function EphemeralInbox() {
    const { token: urlToken } = useParams<{ token?: string }>();
    const navigate = useNavigate();

    const {
        inbox,
        messages,
        token,
        isLoading,
        isCreating,
        isExtending,
        error,
        lastRefresh,
        createInbox,
        extendInbox,
    } = useEphemeralInbox({
        initialToken: urlToken,
        autoCreate: !urlToken,
        enablePolling: true,
        onCreated: (newInbox) => {
            navigate(`/e/${newInbox.token}`, { replace: true });
        },
    });

    // Sync URL only when NEW inbox is created (not from localStorage conflict)
    useEffect(() => {
        // Only navigate if we created a new inbox and URL has no token
        if (token && !urlToken) {
            navigate(`/e/${token}`, { replace: true });
        }
    }, [token, urlToken, navigate]);

    // Handle extend with toast feedback
    const handleExtend = async () => {
        const success = await extendInbox();
        if (success) {
            toast.success('Đã gia hạn thêm 1 giờ!');
        } else {
            toast.error('Không thể gia hạn');
        }
    };

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
                        onClick={() => createInbox()}
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
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <span className="material-symbols-outlined !text-[32px] text-[var(--nebula-violet)]">mail</span>
                        Email Tạm Thời
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
                            onClick={() => createInbox()}
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
