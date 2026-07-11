/**
 * Referral Section - Display referral code, stats, and claim rewards
 */
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { referralService, type ReferralCode, type ReferralStats } from '../../services/referralService';
import { getFriendlyErrorMessage } from '../../utils/errorMapping';
import { GlassCard } from '../../components/ui/GlassCard';
import { Badge } from '../../components/ui/Badge';

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
        return <div className="text-center py-8 text-semantic-text-secondary">Không thể tải thông tin giới thiệu</div>;
    }

    const socialLinks = referralService.generateSocialLinks(code.code, code.shareUrl);

    return (
        <div className="space-y-6">
            {/* Referral Code Card */}
            <GlassCard className="p-6 text-center">
                <h2 className="text-lg font-semibold text-semantic-text-main mb-2">Mã giới thiệu của bạn</h2>
                <p className="text-sm text-semantic-text-secondary mb-4">
                    Chia sẻ mã này để nhận +10 bí danh cho cả hai bên
                </p>

                {/* Large Code Display */}
                <div className="inline-flex items-center gap-3 px-6 py-4 bg-semantic-accent-subtle border-2 border-dashed border-semantic-accent/50 rounded-xl mb-4">
                    <span className="text-2xl font-mono font-bold text-semantic-accent-text tracking-wider">
                        {code.code}
                    </span>
                    <button
                        onClick={() => handleCopy('code')}
                        className="p-2 hover:bg-semantic-bg-hover rounded-lg transition-colors"
                        title="Copy mã"
                    >
                        <span className="material-symbols-outlined !text-[20px] text-semantic-accent">
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
                        className="flex-1 px-3 py-2 bg-semantic-bg-secondary border border-semantic-border rounded-lg text-sm text-semantic-text-secondary truncate"
                    />
                    <button
                        onClick={() => handleCopy('link')}
                        className="px-4 py-2 bg-semantic-accent hover:bg-semantic-accent-hover text-white rounded-lg text-sm font-medium transition-all"
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
            </GlassCard>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard icon="people" label="Tổng giới thiệu" value={stats.totalReferrals} color="info" />
                    <StatCard icon="hourglass_top" label="Đang chờ" value={stats.pendingRewards} color="warning" />
                    <StatCard icon="check_circle" label="Đã nhận" value={stats.claimedRewards} color="success" />
                    <StatCard icon="alternate_email" label="Bonus aliases" value={stats.bonusAliases} color="accent" />
                </div>
            )}

            {/* Claim Rewards Button */}
            {stats && stats.pendingRewards > 0 && (
                <GlassCard className="p-6 text-center border-2 border-semantic-success/30 bg-semantic-success-subtle">
                    <span className="material-symbols-outlined text-[32px] text-semantic-success mb-2">redeem</span>
                    <h3 className="font-semibold text-semantic-text-main mb-2">Bạn có {stats.pendingRewards} phần thưởng đang chờ!</h3>
                    <p className="text-sm text-semantic-text-secondary mb-4">
                        Nhấn để nhận +{stats.pendingRewards * 10} bí danh miễn phí
                    </p>
                    <button
                        onClick={handleClaim}
                        disabled={isClaiming}
                        className="px-6 py-3 bg-semantic-success hover:opacity-90 disabled:opacity-50 text-white rounded-lg font-medium transition-all"
                    >
                        {isClaiming ? 'Đang xử lý...' : 'Nhận thưởng ngay'}
                    </button>
                </GlassCard>
            )}

            {/* Recent Referrals */}
            {stats?.recentReferrals && stats.recentReferrals.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-semantic-text-main mb-4">Giới thiệu gần đây</h3>
                    <GlassCard className="p-0 divide-y divide-semantic-border">
                        {stats.recentReferrals.map((ref) => (
                            <div key={ref.id} className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-full bg-semantic-accent-subtle flex items-center justify-center">
                                        <span className="material-symbols-outlined !text-[16px] text-semantic-accent">person</span>
                                    </span>
                                    <span className="text-sm text-semantic-text-secondary">
                                        {new Date(ref.date).toLocaleDateString('vi-VN')}
                                    </span>
                                </div>
                                <Badge variant={ref.status === 'claimed' ? 'success' : 'warning'}>
                                    {ref.status === 'claimed' ? 'Đã nhận' : 'Đang chờ'}
                                </Badge>
                            </div>
                        ))}
                    </GlassCard>
                </div>
            )}

            {/* How It Works */}
            <GlassCard className="p-6">
                <h3 className="font-semibold text-semantic-text-main mb-4">Cách hoạt động</h3>
                <div className="grid md:grid-cols-3 gap-4">
                    <StepCard step={1} title="Chia sẻ mã" description="Copy mã giới thiệu và gửi cho bạn bè" />
                    <StepCard step={2} title="Bạn bè đăng ký" description="Họ dùng mã của bạn khi tạo tài khoản" />
                    <StepCard step={3} title="Cả hai nhận thưởng" description="+10 bí danh miễn phí cho mỗi bên" />
                </div>
            </GlassCard>
        </div>
    );
}

function SocialButton({ href, icon, label }: { href: string; icon: string; label: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 flex items-center justify-center bg-semantic-bg-secondary hover:bg-semantic-bg-hover rounded-lg transition-colors"
            title={`Chia sẻ qua ${label}`}
        >
            <span className="text-sm font-bold text-semantic-text-secondary">{icon}</span>
        </a>
    );
}

function StatCard({ icon, label, value, color = 'info' }: { icon: string; label: string; value: number; color?: 'info' | 'success' | 'warning' | 'accent' }) {
    const colors: Record<string, string> = {
        info: 'bg-semantic-info-subtle text-semantic-info',
        success: 'bg-semantic-success-subtle text-semantic-success',
        warning: 'bg-semantic-warning-subtle text-semantic-warning',
        accent: 'bg-semantic-accent-subtle text-semantic-accent-text',
    };
    return (
        <GlassCard className="p-4 text-center">
            <div className={`w-10 h-10 mx-auto rounded-lg ${colors[color]} flex items-center justify-center mb-2`}>
                <span className="material-symbols-outlined !text-[20px]">{icon}</span>
            </div>
            <p className="text-2xl font-bold text-semantic-text-main">{value}</p>
            <p className="text-xs text-semantic-text-secondary">{label}</p>
        </GlassCard>
    );
}

function StepCard({ step, title, description }: { step: number; title: string; description: string }) {
    return (
        <div className="text-center">
            <div className="w-10 h-10 mx-auto rounded-full bg-semantic-accent flex items-center justify-center mb-3">
                <span className="text-white font-bold">{step}</span>
            </div>
            <h4 className="font-medium text-semantic-text-main mb-1">{title}</h4>
            <p className="text-xs text-semantic-text-secondary">{description}</p>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="space-y-6">
            <GlassCard className="p-6 animate-pulse">
                <div className="h-6 bg-semantic-bg-secondary rounded w-1/3 mx-auto mb-4"></div>
                <div className="h-12 bg-semantic-bg-secondary rounded w-1/2 mx-auto mb-4"></div>
                <div className="h-10 bg-semantic-bg-secondary rounded w-2/3 mx-auto"></div>
            </GlassCard>
            <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <GlassCard key={i} className="p-4 animate-pulse">
                        <div className="w-10 h-10 bg-semantic-bg-secondary rounded-lg mx-auto mb-2"></div>
                        <div className="h-6 bg-semantic-bg-secondary rounded w-1/2 mx-auto mb-1"></div>
                        <div className="h-4 bg-semantic-bg-secondary rounded w-2/3 mx-auto"></div>
                    </GlassCard>
                ))}
            </div>
        </div>
    );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <GlassCard className="p-6 text-center space-y-3">
            <span className="material-symbols-outlined text-[32px] text-semantic-danger">error</span>
            <div>
                <h3 className="font-semibold text-semantic-text-main">Không thể tải thông tin giới thiệu</h3>
                <p className="text-sm text-semantic-text-secondary mt-1">{message}</p>
            </div>
            <button
                onClick={onRetry}
                className="px-4 py-2 bg-semantic-accent hover:bg-semantic-accent-hover text-white rounded-lg text-sm font-medium transition-all"
            >
                Thử lại
            </button>
        </GlassCard>
    );
}

export default ReferralSection;
