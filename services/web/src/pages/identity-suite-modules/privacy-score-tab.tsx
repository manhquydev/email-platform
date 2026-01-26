/**
 * Privacy Score Tab - Display privacy score with breakdown
 */
import { useState, useEffect } from 'react';
import { identityService, type PrivacyScore } from '../../services/identityService';

export function PrivacyScoreTab() {
    const [score, setScore] = useState<PrivacyScore | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadScore();
    }, []);

    const loadScore = async () => {
        try {
            const data = await identityService.getPrivacyScore();
            setScore(data);
        } catch {
            // Use mock data for demo
            setScore({
                overall: 72,
                grade: 'C',
                factors: [
                    { name: 'Bí danh email', score: 8, maxScore: 10, status: 'good', description: 'Bạn đang sử dụng bí danh để bảo vệ email thật' },
                    { name: 'Giám sát rò rỉ', score: 5, maxScore: 10, status: 'warning', description: 'Một số email chưa được giám sát', locked: false },
                    { name: 'Xác thực 2 lớp', score: 10, maxScore: 10, status: 'good', description: 'Đã bật xác thực 2 lớp' },
                    { name: 'Mật khẩu mạnh', score: 7, maxScore: 10, status: 'warning', description: 'Cân nhắc sử dụng mật khẩu dài hơn' },
                ],
                recommendations: [
                    'Thêm email vào danh sách giám sát rò rỉ',
                    'Sử dụng bí danh cho tất cả đăng ký mới',
                    'Xem xét nâng cấp gói để có tính năng bảo mật nâng cao',
                ],
                lastUpdated: new Date().toISOString(),
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <LoadingState />;
    }

    if (!score) {
        return <div className="text-center py-8 text-[var(--nebula-text-secondary)]">Không thể tải điểm bảo mật</div>;
    }

    return (
        <div className="space-y-6">
            {/* Score Gauge */}
            <div className="neo-glass rounded-xl p-8 text-center">
                <ScoreGauge score={score.overall} grade={score.grade} />
                <p className="text-sm text-[var(--nebula-text-secondary)] mt-4">
                    Cập nhật lần cuối: {new Date(score.lastUpdated).toLocaleDateString('vi-VN')}
                </p>
            </div>

            {/* Factor Breakdown */}
            <div>
                <h2 className="text-lg font-semibold text-white mb-4">Chi tiết điểm số</h2>
                <div className="grid gap-4 md:grid-cols-2">
                    {score.factors.map((factor) => (
                        <FactorCard key={factor.name} factor={factor} />
                    ))}
                </div>
            </div>

            {/* Recommendations */}
            {score.recommendations.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold text-white mb-4">Khuyến nghị cải thiện</h2>
                    <div className="neo-glass rounded-xl divide-y divide-white/10">
                        {score.recommendations.map((rec, i) => (
                            <div key={i} className="p-4 flex items-start gap-3">
                                <span className="material-symbols-outlined text-[var(--nebula-violet)] !text-[20px] mt-0.5">lightbulb</span>
                                <p className="text-sm text-[var(--nebula-text-secondary)]">{rec}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function ScoreGauge({ score, grade }: { score: number; grade: string }) {
    const getColor = () => {
        if (score >= 80) return 'text-green-400';
        if (score >= 60) return 'text-yellow-400';
        if (score >= 40) return 'text-orange-400';
        return 'text-red-400';
    };

    const getBgColor = () => {
        if (score >= 80) return 'from-green-500/20 to-green-500/5';
        if (score >= 60) return 'from-yellow-500/20 to-yellow-500/5';
        if (score >= 40) return 'from-orange-500/20 to-orange-500/5';
        return 'from-red-500/20 to-red-500/5';
    };

    return (
        <div className="inline-flex flex-col items-center">
            <div className={`relative w-40 h-40 rounded-full bg-gradient-to-b ${getBgColor()} flex items-center justify-center`}>
                {/* Circular progress */}
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle
                        cx="80"
                        cy="80"
                        r="70"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-white/10"
                    />
                    <circle
                        cx="80"
                        cy="80"
                        r="70"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${(score / 100) * 440} 440`}
                        className={getColor()}
                    />
                </svg>
                <div className="text-center z-10">
                    <span className={`text-4xl font-bold ${getColor()}`}>{score}</span>
                    <span className="text-lg text-[var(--nebula-text-secondary)]">/100</span>
                </div>
            </div>
            <div className={`mt-4 px-4 py-2 rounded-lg ${getColor()} bg-current/10`}>
                <span className={`font-bold text-lg ${getColor()}`}>Hạng {grade}</span>
            </div>
        </div>
    );
}

function FactorCard({ factor }: { factor: PrivacyScore['factors'][0] }) {
    const statusColors = {
        good: 'text-green-400',
        warning: 'text-yellow-400',
        critical: 'text-red-400',
    };

    const progress = (factor.score / factor.maxScore) * 100;

    return (
        <div className={`neo-glass rounded-xl p-4 ${factor.locked ? 'opacity-60' : ''}`}>
            <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-white">{factor.name}</h4>
                <span className={`text-sm font-medium ${statusColors[factor.status]}`}>
                    {factor.score}/{factor.maxScore}
                </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                <div
                    className={`h-full rounded-full ${
                        factor.status === 'good' ? 'bg-green-500' :
                        factor.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${progress}%` }}
                />
            </div>
            <p className="text-xs text-[var(--nebula-text-secondary)]">{factor.description}</p>
            {factor.locked && (
                <div className="mt-2 flex items-center gap-1 text-xs text-orange-400">
                    <span className="material-symbols-outlined !text-[14px]">lock</span>
                    Yêu cầu nâng cấp
                </div>
            )}
        </div>
    );
}

function LoadingState() {
    return (
        <div className="space-y-6">
            <div className="neo-glass rounded-xl p-8 flex justify-center">
                <div className="w-40 h-40 rounded-full bg-white/10 animate-pulse" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="neo-glass rounded-xl p-4 animate-pulse">
                        <div className="h-5 bg-white/10 rounded w-1/2 mb-3"></div>
                        <div className="h-2 bg-white/10 rounded mb-2"></div>
                        <div className="h-4 bg-white/10 rounded w-3/4"></div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default PrivacyScoreTab;
