/**
 * OTPHighlight Component
 * Displays extracted OTP code with copy functionality
 */

import { Button } from "../ui/Button";

interface OTPHighlightProps {
    otp: string;
    onCopy: (otp: string) => void;
}

export function OTPHighlight({ otp, onCopy }: OTPHighlightProps) {
    return (
        <div className="mb-8 p-6 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white text-2xl shadow-lg shadow-primary/20">
                    🔢
                </div>
                <div>
                    <div className="text-sm text-primary font-bold uppercase tracking-wider mb-1">Mã xác thực</div>
                    <div className="text-3xl font-bold text-nebula-text font-mono tracking-widest">{otp}</div>
                </div>
            </div>
            <Button
                variant="primary"
                onClick={() => onCopy(otp)}
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
            >
                Sao chép
            </Button>
        </div>
    );
}
