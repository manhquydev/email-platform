import { Link } from 'react-router-dom';

interface TrustBadgeProps {
    variant?: 'compact' | 'full';
    className?: string;
}

export function TrustBadge({ variant = 'compact', className = '' }: TrustBadgeProps) {
    if (variant === 'full') {
        return (
            <Link
                to="/privacy"
                className={`group inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/30 hover:bg-green-500/15 hover:border-green-500/50 transition-all ${className}`}
            >
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-green-400 !text-[24px]">verified_user</span>
                </div>
                <div className="text-left">
                    <p className="text-green-400 font-bold text-sm tracking-wide">ZERO-LOG</p>
                    <p className="text-green-300/60 text-xs">Không IP · Không Tracking · Bảo mật cao</p>
                </div>
                <span className="material-symbols-outlined text-green-400/50 !text-[18px] group-hover:translate-x-1 transition-transform">
                    arrow_forward
                </span>
            </Link>
        );
    }

    return (
        <Link
            to="/privacy"
            className={`group inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30 hover:bg-green-500/15 hover:border-green-500/50 transition-all ${className}`}
            title="Zero-Log Privacy - Xem chính sách bảo mật"
        >
            <span className="material-symbols-outlined text-green-400 !text-[16px]">verified_user</span>
            <span className="text-green-400 font-medium text-xs tracking-wide">ZERO-LOG</span>
        </Link>
    );
}
