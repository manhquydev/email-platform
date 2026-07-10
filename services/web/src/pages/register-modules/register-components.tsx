/**
 * UI components for Register page
 */
import { Link } from "react-router-dom";
import type { UseFormRegister, FieldErrors } from "react-hook-form";
import { GlassCard } from "../../components/ui/GlassCard";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import type { RegisterForm, PasswordStrength } from "./register-hooks";

/** Brand logo SVG */
export function BrandLogo() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-primary">
            <path d="M12 12 C12 6, 3 6, 3 12 C3 18, 12 18, 12 12" strokeLinecap="round" />
            <path d="M12 12 C12 6, 21 6, 21 12" strokeLinecap="round" opacity="0.6" />
            <circle cx="21" cy="12" r="1" fill="currentColor" opacity="0.4" />
        </svg>
    );
}

/** Password strength indicator bar */
interface PasswordStrengthIndicatorProps {
    strength: PasswordStrength;
    visible: boolean;
}

export function PasswordStrengthIndicator({ strength, visible }: PasswordStrengthIndicatorProps) {
    if (!visible) return null;

    return (
        <div className="flex items-center gap-2 mt-2 px-1">
            <span className="text-xs text-nebula-text-muted">Độ mạnh:</span>
            <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden flex gap-1">
                <div
                    className="h-full rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(37,244,100,0.5)]"
                    style={{
                        width: `${(strength.score / 3) * 100}%`,
                        backgroundColor: strength.color
                    }}
                />
            </div>
            <span className="text-xs font-medium" style={{ color: strength.color }}>{strength.label}</span>
        </div>
    );
}

/** Terms and conditions checkbox */
export function TermsCheckbox() {
    return (
        <div className="flex items-start gap-3 mt-1 px-1">
            <input
                id="terms"
                type="checkbox"
                required
                className="mt-1 h-4 w-4 rounded border-border bg-surface-elevated text-primary focus:ring-primary focus:ring-offset-0 focus:ring-offset-transparent cursor-pointer"
            />
            <label htmlFor="terms" className="text-xs text-nebula-text-muted cursor-pointer selection:bg-none">
                Tôi đồng ý với <Link to="/terms" className="text-primary hover:text-white underline transition-colors">Điều khoản Dịch vụ</Link> và <Link to="/privacy" className="text-primary hover:text-white underline transition-colors">Chính sách Bảo mật</Link>.
            </label>
        </div>
    );
}

/** Telegram hint banner */
export function TelegramHint() {
    const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;
    if (!botUsername) return null;

    return (
        <div className="mt-4 p-3 rounded-lg bg-nebula-violet/10 border border-nebula-violet/20 text-sm text-nebula-violet-light">
            <div className="flex items-start gap-2">
                <span className="text-lg">💡</span>
                <p>
                    Muốn nhận thông báo qua Telegram? Sau khi đăng ký, vào{" "}
                    <strong>Cài đặt → Thông báo</strong> để liên kết với bot{" "}
                    <a
                        href={`https://t.me/${botUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                    >
                        @{botUsername}
                    </a>
                </p>
            </div>
        </div>
    );
}

/** Registration form inputs */
interface RegisterFormInputsProps {
    register: UseFormRegister<RegisterForm>;
    errors: FieldErrors<RegisterForm>;
    busy: boolean;
    passwordValue: string;
    onPasswordChange: (value: string) => void;
    strength: PasswordStrength;
}

export function RegisterFormInputs({
    register,
    errors,
    busy,
    passwordValue,
    onPasswordChange,
    strength
}: RegisterFormInputsProps) {
    return (
        <>
            <Input
                label="Địa chỉ Email"
                {...register("email")}
                type="email"
                placeholder="you@manhquy.id.vn"
                disabled={busy}
                error={errors.email?.message}
                className="bg-surface-elevated border-border focus:border-primary focus:ring-primary"
                icon={<span className="material-symbols-outlined text-[20px]">alternate_email</span>}
            />

            <div className="space-y-2">
                <Input
                    label="Mật khẩu"
                    {...register("password")}
                    type="password"
                    placeholder="••••••••"
                    disabled={busy}
                    error={errors.password?.message}
                    onChange={(e) => {
                        register("password").onChange(e);
                        onPasswordChange(e.target.value);
                    }}
                    className="bg-surface-elevated border-border focus:border-primary focus:ring-primary"
                    icon={<span className="material-symbols-outlined text-[20px]">lock</span>}
                />
                <PasswordStrengthIndicator strength={strength} visible={!!passwordValue} />
            </div>

            <Input
                label="Xác nhận mật khẩu"
                {...register("confirmPassword")}
                type="password"
                placeholder="••••••••"
                disabled={busy}
                error={errors.confirmPassword?.message}
                className="bg-surface-elevated border-border focus:border-primary focus:ring-primary"
                icon={<span className="material-symbols-outlined text-[20px]">lock_reset</span>}
            />
        </>
    );
}

/** Submit button */
interface SubmitButtonProps {
    busy: boolean;
}

export function SubmitButton({ busy }: SubmitButtonProps) {
    return (
        <Button
            type="submit"
            className="w-full h-12 text-base font-bold shadow-glow hover:shadow-nebula-glow hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 group bg-primary hover:bg-nebula-violet-dark"
            isLoading={busy}
        >
            <span>Tạo tài khoản</span>
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Button>
    );
}

/** Hero section for desktop */
export function HeroSection() {
    return (
        <div className="hidden md:flex flex-col justify-center text-white p-8 relative">
            {/* Decorative blur */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full pointing-events-none -z-10" />

            <div className="mb-12">
                <h2 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                    Tham gia <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">miễn phí</span>
                </h2>
                <p className="text-lg text-white/70 max-w-md">
                    Tạo tài khoản để trải nghiệm nền tảng email tạm thời chuyên nghiệp. Không cần thẻ tín dụng.
                </p>
            </div>

            <div className="grid gap-6">
                <FeatureCard
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>}
                    iconColor="text-green-400"
                    title="Không giới hạn inbox"
                    description="Tạo bao nhiêu tùy thích"
                />
                <FeatureCard
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>}
                    iconColor="text-blue-400"
                    title="Sử dụng domain riêng"
                    description="Chuyên nghiệp hóa email"
                />
            </div>
        </div>
    );
}

/** Feature card for hero section */
interface FeatureCardProps {
    icon: React.ReactNode;
    iconColor: string;
    title: string;
    description: string;
}

function FeatureCard({ icon, iconColor, title, description }: FeatureCardProps) {
    return (
        <GlassCard className="p-4 flex items-center gap-4 bg-surface/30 border-white/5">
            <div className={`p-2 rounded-lg bg-surface/50 ${iconColor}`}>
                {icon}
            </div>
            <div>
                <h3 className="font-bold">{title}</h3>
                <p className="text-sm text-white/60">{description}</p>
            </div>
        </GlassCard>
    );
}

/** Floating security badge */
export function SecurityBadge() {
    return (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2 rounded-full bg-surface/80 dark:bg-black/40 backdrop-blur-md border border-border text-xs text-text-secondary hover:text-text-main transition-colors cursor-help hidden md:flex z-50">
            <span className="material-symbols-outlined text-sm">encrypted</span>
            <span>Mã hóa đầu cuối</span>
        </div>
    );
}

/** Login link footer */
export function LoginLink() {
    return (
        <div className="mt-6 text-center text-sm border-t border-border pt-4">
            <p className="text-text-secondary">
                Đã có tài khoản? <Link to="/login" className="text-primary hover:text-white font-medium transition-colors ml-1">Đăng nhập ngay</Link>
            </p>
        </div>
    );
}
