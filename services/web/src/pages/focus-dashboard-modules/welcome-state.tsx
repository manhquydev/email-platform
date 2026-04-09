/**
 * Welcome State component for FocusDashboard
 * Shown when no inbox is selected
 */
import { Link } from 'react-router-dom';
import { QuickGenerateCard } from '../../components/QuickGenerateCard';
import type { Domain } from '../../types';

interface WelcomeStateProps {
    domains: Domain[];
    token: string | null;
    onInboxCreated: (id: string, email: string) => void;
}

export function WelcomeState({ domains, token, onInboxCreated }: WelcomeStateProps) {
    const verifiedDomains = domains.filter(domain => domain.status === "VERIFIED").length;

    return (
        <div className="min-h-[70vh] p-4 md:p-8 animate-fade-in-up">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-nebula-violet/20 via-nebula-cyan/10 to-nebula-pink/10 p-6 md:p-8 text-left">
                    <p className="text-xs uppercase tracking-[0.2em] text-text-secondary mb-2">Dashboard</p>
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">Sẵn sàng tạo inbox mới trong 1 lần bấm</h3>
                    <p className="text-text-secondary max-w-2xl">
                        Bạn đang có <strong className="text-white">{verifiedDomains}</strong> domain đã xác thực.
                        Thiết lập một lần, sau đó chỉ cần bấm tạo để mở inbox mới liên tục.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Link
                        to="/app/inbox"
                        className="rounded-xl border border-white/10 bg-surface-glass hover:bg-white/5 transition-colors p-4 text-left"
                    >
                        <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Đọc thư</p>
                        <p className="text-white font-semibold">Mở hộp thư ngay</p>
                    </Link>
                    <Link
                        to="/app/manager"
                        className="rounded-xl border border-white/10 bg-surface-glass hover:bg-white/5 transition-colors p-4 text-left"
                    >
                        <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Quản lý</p>
                        <p className="text-white font-semibold">Quản lý inbox & chia sẻ</p>
                    </Link>
                    <Link
                        to="/my-domains"
                        className="rounded-xl border border-white/10 bg-surface-glass hover:bg-white/5 transition-colors p-4 text-left"
                    >
                        <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Domain</p>
                        <p className="text-white font-semibold">Thêm hoặc xác thực domain</p>
                    </Link>
                </div>

                <div className="text-center pt-2">
                    <p className="text-text-secondary mb-4">
                        Tạo nhanh địa chỉ mới bên dưới. Hệ thống tự copy ngay sau khi tạo.
                    </p>
                </div>

                <div className="w-full max-w-md mx-auto">
                    <QuickGenerateCard
                        domains={domains}
                        token={token}
                        onInboxCreated={onInboxCreated}
                    />
                </div>
            </div>
        </div>
    );
}
