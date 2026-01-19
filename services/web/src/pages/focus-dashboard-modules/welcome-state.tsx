/**
 * Welcome State component for FocusDashboard
 * Shown when no inbox is selected
 */
import { QuickGenerateCard } from '../../components/QuickGenerateCard';
import type { Domain } from '../../types';

interface WelcomeStateProps {
    domains: Domain[];
    token: string | null;
    onInboxCreated: (id: string, email: string) => void;
}

export function WelcomeState({ domains, token, onInboxCreated }: WelcomeStateProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 animate-fade-in-up">
            <div className="p-6 bg-surface-elevated rounded-full mb-6 ring-4 ring-primary/10 shadow-lg shadow-black/20">
                <svg className="w-16 h-16 text-primary" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Chào mừng bạn trở lại!</h3>
            <p className="text-text-secondary mb-8 max-w-md">
                Chọn hộp thư từ menu trên cùng để xem email hoặc tạo một địa chỉ mới ngay lập tức bên dưới.
            </p>
            <div className="w-full max-w-md">
                <QuickGenerateCard
                    domains={domains}
                    token={token}
                    onInboxCreated={onInboxCreated}
                />
            </div>
        </div>
    );
}
