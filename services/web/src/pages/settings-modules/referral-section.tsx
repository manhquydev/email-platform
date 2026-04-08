/**
 * Referral Section - Display referral code, stats, and claim rewards
 */
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { referralService, type ReferralCode, type ReferralStats } from '../../services/referralService';
import { getFriendlyErrorMessage } from '../../utils/errorMapping';

export function ReferralSection() {
    const [code, setCode] = useState<ReferralCode | null>(null);
    const [stats, setStats] = useState<ReferralStats | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isClaiming, setIsClaiming] = useState(false);
    const [copied, setCopied] = useState<'code' | 'link' | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setErrorMessage(null);
        try {
            const [codeData, statsData] = await Promise.all([
                referralService.getCode(),
                referralService.getStats(),
            ]);
            setCode(codeData);
            setStats(statsData);
        } catch (error) {
            setCode(null);
            setStats(null);
            setErrorMessage(getFriendlyErrorMessage((error as Error).message) || 'Không thể tải thông tin giới thiệu');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = async (type: 'code' | 'link') => {
        const text = type === 'code' ? code?.code : code?.shareUrl;
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setCopied(type);
            toast.success(type === 'code' ? 'Đã copy mã giới thiệu' : 'Đã copy link giới thiệu');
            setTimeout(() => setCopied(null), 3000);
        } catch {
            toast.error('Không thể copy');
        }
    };

    const handleClaim = async () => {
        if (!stats || stats.pendingRewards === 0) return;
        setIsClaiming(true);
        try {
            const result = await referralService.claimRewards();
            if (result.success) {
                toast.success(`Đã nhận +${result.aliasesAwarded} bí danh!`);
                setStats(prev => prev ? {
                    ...prev,
                    pendingRewards: 0,
                    claimedRewards: prev.claimedRewards + (result.claimedRewards ?? prev.pendingRewards),
                    bonusAliases: result.newTotal,
                } : null);
            }
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setIsClaiming(false);
        }
    };

    if (isLoading) {
        return <LoadingState />;
    }

    if (errorMessage) {
        return <ErrorState message={errorMessage} onRetry={loadData} />;
    }

    if (!code) {
        return <div className="text-center py-8 text-[var(--nebula-text-secondary)]">Không thể tải thông tin giới thiệu</div>;
    }

    const socialLinks = referralService.generateSocialLinks(code.code, code.shareUrl);

    return (
        <div className="space-y-6">
            {/* Referral Code Card */}
            <div className="neo-glass rounded-xl p-6 text-center">
                <h2 className="text-lg font-semibold text-white mb-2">Mã giới thiệu của bạn</h2>
                <p className="text-sm text-[var(--nebula-text-secondary)] mb-4">
                    Chia sẻ mã này để nhận +10 bí danh cho cả hai bên
                </p>

                {/* Large Code Display */}
                <div className="inline-flex items-center gap-3 px-6 py-4 bg-[var(--nebula-violet)]/10 border-2 border-dashed border-[var(--nebula-violet)]/50 rounded-xl mb-4">
                    <span className="text-2xl font-mono font-bold text-[var(--nebula-violet)] tracking-wider">
                        {code.code}
                    </span>
                    <button
                        onClick={() => handleCopy('code')}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Copy mã"
                    >
                        <span className="material-symbols-outlined !text-[20px] text-[var(--nebula-violet)]">
                            {copied === 'code' ? 'check' : 'content_copy'}
                        </span>
                    </button>
                </div>

                {/* Share Link */}
                <div className="flex items-center gap-2 max-w-md mx-auto">
                    <input
                        type="text"
                        readOnly
                        value={code.shareUrl}
                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-[var(--nebula-text-secondary)] truncate"
                    />
                    <button
                        onClick={() => handleCopy('link')}
                        className="px-4 py-2 bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] text-white rounded-lg text-sm font-medium transition-all"
                    >
                        {copied === 'link' ? '✓ Copied' : 'Copy'}
                    </button>
                </div>

                {/* Social Share Buttons */}
                <div className="flex justify-center gap-3 mt-4">
                    <SocialButton href={socialLinks.twitter} icon="𝕏" label="Twitter" />
                    <SocialButton href={socialLinks.facebook} icon="f" label="Facebook" />
                    <SocialButton href={socialLinks.linkedin} icon="in" label="LinkedIn" />
                    <SocialButton href={socialLinks.email} icon="✉" label="Email" />
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard icon="people" label="Tổng giới thiệu" value={stats.totalReferrals} />
                    <StatCard icon="hourglass_top" label="Đang chờ" value={stats.pendingRewards} color="yellow" />
                    <StatCard icon="check_circle" label="Đã nhận" value={stats.claimedRewards} color="green" />
                    <StatCard icon="alternate_email" label="Bonus aliases" value={stats.bonusAliases} color="violet" />
                </div>
            )}

            {/* Claim Rewards Button */}
            {stats && stats.pendingRewards > 0 && (
                <div className="neo-glass rounded-xl p-6 text-center border-2 border-green-500/30 bg-green-500/5">
                    <span className="material-symbols-outlined text-[32px] text-green-400 mb-2">redeem</span>
                    <h3 className="font-semibold text-white mb-2">Bạn có {stats.pendingRewards} phần thưởng đang chờ!</h3>
                    <p className="text-sm text-[var(--nebula-text-secondary)] mb-4">
                        Nhấn để nhận +{stats.pendingRewards * 10} bí danh miễn phí
                    </p>
                    <button
                        onClick={handleClaim}
                        disabled={isClaiming}
                        className="px-6 py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg font-medium transition-all"
                    >
                        {isClaiming ? 'Đang xử lý...' : 'Nhận thưởng ngay'}
                    </button>
                </div>
            )}

            {/* Recent Referrals */}
            {stats?.recentReferrals && stats.recentReferrals.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Giới thiệu gần đây</h3>
                    <div className="neo-glass rounded-xl divide-y divide-white/10">
                        {stats.recentReferrals.map((ref) => (
                            <div key={ref.id} className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-full bg-[var(--nebula-violet)]/20 flex items-center justify-center">
                                        <span className="material-symbols-outlined !text-[16px] text-[var(--nebula-violet)]">person</span>
                                    </span>
                                    <span className="text-sm text-[var(--nebula-text-secondary)]">
                                        {new Date(ref.date).toLocaleDateString('vi-VN')}
                                    </span>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs ${
                                    ref.status === 'claimed'
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                    {ref.status === 'claimed' ? 'Đã nhận' : 'Đang chờ'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* How It Works */}
            <div className="neo-glass rounded-xl p-6">
                <h3 className="font-semibold text-white mb-4">Cách hoạt động</h3>
                <div className="grid md:grid-cols-3 gap-4">
                    <StepCard step={1} title="Chia sẻ mã" description="Copy mã giới thiệu và gửi cho bạn bè" />
                    <StepCard step={2} title="Bạn bè đăng ký" description="Họ dùng mã của bạn khi tạo tài khoản" />
                    <StepCard step={3} title="Cả hai nhận thưởng" description="+10 bí danh miễn phí cho mỗi bên" />
                </div>
            </div>
        </div>
    );
}

function SocialButton({ href, icon, label }: { href: string; icon: string; label: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            title={`Chia sẻ qua ${label}`}
        >
            <span className="text-sm font-bold text-[var(--nebula-text-secondary)]">{icon}</span>
        </a>
    );
}

function StatCard({ icon, label, value, color = 'blue' }: { icon: string; label: string; value: number; color?: string }) {
    const colors: Record<string, string> = {
        blue: 'bg-blue-500/10 text-blue-400',
        green: 'bg-green-500/10 text-green-400',
        yellow: 'bg-yellow-500/10 text-yellow-400',
        violet: 'bg-[var(--nebula-violet)]/10 text-[var(--nebula-violet)]',
    };
    return (
        <div className="neo-glass rounded-xl p-4 text-center">
            <div className={`w-10 h-10 mx-auto rounded-lg ${colors[color]} flex items-center justify-center mb-2`}>
                <span className="material-symbols-outlined !text-[20px]">{icon}</span>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-[var(--nebula-text-secondary)]">{label}</p>
        </div>
    );
}

function StepCard({ step, title, description }: { step: number; title: string; description: string }) {
    return (
        <div className="text-center">
            <div className="w-10 h-10 mx-auto rounded-full bg-[var(--nebula-violet)] flex items-center justify-center mb-3">
                <span className="text-white font-bold">{step}</span>
            </div>
            <h4 className="font-medium text-white mb-1">{title}</h4>
            <p className="text-xs text-[var(--nebula-text-secondary)]">{description}</p>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="space-y-6">
            <div className="neo-glass rounded-xl p-6 animate-pulse">
                <div className="h-6 bg-white/10 rounded w-1/3 mx-auto mb-4"></div>
                <div className="h-12 bg-white/10 rounded w-1/2 mx-auto mb-4"></div>
                <div className="h-10 bg-white/10 rounded w-2/3 mx-auto"></div>
            </div>
            <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="neo-glass rounded-xl p-4 animate-pulse">
                        <div className="w-10 h-10 bg-white/10 rounded-lg mx-auto mb-2"></div>
                        <div className="h-6 bg-white/10 rounded w-1/2 mx-auto mb-1"></div>
                        <div className="h-4 bg-white/10 rounded w-2/3 mx-auto"></div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <div className="neo-glass rounded-xl p-6 text-center space-y-3">
            <span className="material-symbols-outlined text-[32px] text-red-400">error</span>
            <div>
                <h3 className="font-semibold text-white">Không thể tải thông tin giới thiệu</h3>
                <p className="text-sm text-[var(--nebula-text-secondary)] mt-1">{message}</p>
            </div>
            <button
                onClick={onRetry}
                className="px-4 py-2 bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] text-white rounded-lg text-sm font-medium transition-all"
            >
                Thử lại
            </button>
        </div>
    );
}

export default ReferralSection;
