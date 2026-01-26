/**
 * Developer Portal - API keys, usage stats, webhooks, documentation
 * Requires authentication
 */
import { Suspense, lazy } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SEOHead } from '../components/seo/SEOHead';
import { Loading } from '../components/Loading';

// Lazy load tabs for performance
const OverviewTab = lazy(() => import('./developer-portal-modules/overview-tab').then(m => ({ default: m.OverviewTab })));
const APIKeysTab = lazy(() => import('./developer-portal-modules/api-keys-tab').then(m => ({ default: m.APIKeysTab })));
const WebhooksTab = lazy(() => import('./developer-portal-modules/webhooks-tab').then(m => ({ default: m.WebhooksTab })));

type TabId = 'overview' | 'keys' | 'webhooks';

const TABS: Array<{ id: TabId; label: string; icon: string }> = [
    { id: 'overview', label: 'Tổng quan', icon: 'dashboard' },
    { id: 'keys', label: 'API Keys', icon: 'key' },
    { id: 'webhooks', label: 'Webhooks', icon: 'webhook' },
];

export function DeveloperPortal() {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    // Validate tab param against TABS array
    const tabParam = searchParams.get('tab');
    const activeTab: TabId = TABS.find(t => t.id === tabParam)?.id || 'overview';

    const handleTabChange = (tab: TabId) => {
        setSearchParams({ tab });
    };

    if (!user) {
        return (
            <div className="min-h-screen neo-mesh-bg flex items-center justify-center p-4">
                <div className="neo-glass rounded-xl p-8 text-center max-w-md">
                    <span className="material-symbols-outlined text-[48px] text-[var(--nebula-violet)] mb-4">lock</span>
                    <h1 className="text-xl font-bold text-white mb-2">Yêu cầu đăng nhập</h1>
                    <p className="text-[var(--nebula-text-secondary)] mb-4">
                        Vui lòng đăng nhập để truy cập Developer Portal.
                    </p>
                    <Link to="/login" className="inline-block px-6 py-3 bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] text-white rounded-lg font-medium transition-all">
                        Đăng nhập
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--nebula-bg)]">
            <SEOHead
                title="Developer Portal - Ephemera"
                description="Quản lý API keys, theo dõi sử dụng và cấu hình webhooks."
                path="/app/developer"
            />

            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                        🔧 Developer Portal
                    </h1>
                    <p className="text-[var(--nebula-text-secondary)]">
                        Quản lý API keys, webhooks và theo dõi sử dụng API
                    </p>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6 overflow-x-auto">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                                activeTab === tab.id
                                    ? 'bg-[var(--nebula-violet)] text-white shadow-lg'
                                    : 'text-[var(--nebula-text-secondary)] hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <span className="material-symbols-outlined !text-[18px]">{tab.icon}</span>
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <Suspense fallback={<Loading />}>
                    {activeTab === 'overview' && <OverviewTab />}
                    {activeTab === 'keys' && <APIKeysTab />}
                    {activeTab === 'webhooks' && <WebhooksTab />}
                </Suspense>
            </div>
        </div>
    );
}

export default DeveloperPortal;
