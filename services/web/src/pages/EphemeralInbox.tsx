/**
 * Ephemeral Inbox Page - Professional full-width email client layout
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
        inbox, messages, token, isLoading, isCreating, isExtending,
        error, lastRefresh, createInbox, extendInbox,
    } = useEphemeralInbox({
        initialToken: urlToken,
        autoCreate: !urlToken,
        enablePolling: true,
        onCreated: (newInbox) => navigate(`/e/${newInbox.token}`, { replace: true }),
    });

    useEffect(() => {
        if (token && !urlToken) navigate(`/e/${token}`, { replace: true });
    }, [token, urlToken, navigate]);

    const handleExtend = async () => {
        const success = await extendInbox();
        toast[success ? 'success' : 'error'](success ? 'Đã gia hạn thêm 1 giờ!' : 'Không thể gia hạn');
    };

    if (isLoading || isCreating) {
        return (
            <div className="min-h-screen neo-mesh-bg flex items-center justify-center">
                <SEOHead title="Email Tạm Thời - Ephemera" description="Tạo email tạm thời miễn phí." path="/e" />
                <div className="text-center">
                    <Loading />
                    <p className="mt-4 text-[var(--nebula-text-secondary)]">
                        {isCreating ? 'Đang tạo inbox mới...' : 'Đang tải...'}
                    </p>
                </div>
            </div>
        );
    }

    if (error && !inbox) {
        return (
            <div className="min-h-screen neo-mesh-bg flex items-center justify-center p-4">
                <SEOHead title="Email Tạm Thời - Ephemera" description="Tạo email tạm thời miễn phí." path="/e" />
                <div className="neo-glass rounded-2xl p-10 max-w-md w-full text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-red-400 !text-[40px]">error</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-3">Không thể truy cập</h1>
                    <p className="text-[var(--nebula-text-secondary)] mb-8">{error}</p>
                    <button onClick={() => createInbox()}
                        className="px-8 py-3 bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] text-white rounded-xl font-medium transition-all">
                        Tạo inbox mới
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen neo-mesh-bg flex flex-col">
            <SEOHead
                title={inbox ? `${inbox.address} - Email Tạm Thời` : 'Email Tạm Thời - Ephemera'}
                description="Email tạm thời miễn phí, tự hủy. Bảo vệ quyền riêng tư của bạn."
                path={`/e/${token}`}
            />

            {/* Top Navigation Bar */}
            <header className="flex-shrink-0 border-b border-white/10 bg-[var(--nebula-surface)]/80 backdrop-blur-xl">
                <div className="w-full px-4 sm:px-6 lg:px-8 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate('/')}
                                className="flex items-center gap-2 text-[var(--nebula-text-secondary)] hover:text-white transition-colors">
                                <span className="material-symbols-outlined !text-[20px]">arrow_back</span>
                                <span className="hidden sm:inline">Về trang chủ</span>
                            </button>
                            <div className="hidden sm:block h-6 w-px bg-white/10"></div>
                            <h1 className="text-lg font-semibold text-white flex items-center gap-2">
                                <span className="material-symbols-outlined !text-[24px] text-[var(--nebula-violet)]">mail</span>
                                <span className="hidden md:inline">Email Tạm Thời</span>
                            </h1>
                        </div>
                        <button onClick={() => createInbox()}
                            className="flex items-center gap-2 px-4 py-2 bg-[var(--nebula-violet)]/20 hover:bg-[var(--nebula-violet)]/30 text-[var(--nebula-violet)] rounded-lg font-medium transition-all text-sm">
                            <span className="material-symbols-outlined !text-[18px]">add</span>
                            <span className="hidden sm:inline">Tạo mới</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content - Full Width */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {inbox && (
                    <div className="flex-shrink-0 border-b border-white/10">
                        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
                            <EphemeralHeader inbox={inbox} onExtend={handleExtend} isExtending={isExtending} />
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-hidden">
                    <div className="h-full w-full px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
                        <EphemeralMessageList messages={messages} isLoading={isLoading} lastRefresh={lastRefresh} />
                    </div>
                </div>

                {inbox && new Date(inbox.expiresAt) < new Date() && (
                    <div className="flex-shrink-0 border-t border-white/10 p-4 text-center bg-[var(--nebula-surface)]/50">
                        <p className="text-[var(--nebula-text-secondary)] mb-3">Inbox đã hết hạn</p>
                        <button onClick={() => createInbox()}
                            className="px-6 py-3 bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] text-white rounded-xl font-medium transition-all">
                            Tạo inbox mới
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}

export default EphemeralInbox;
