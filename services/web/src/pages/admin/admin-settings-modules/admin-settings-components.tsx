/**
 * UI components for AdminSettingsPage
 * Profile card, System info card, 2FA section, Email verification, Password form
 */
import type { AdminProfile, SystemInfo, TwoFAStep } from "./types";

// --- Profile Card ---
export interface ProfileCardProps {
    profile: AdminProfile | null;
}

export function ProfileCard({ profile }: ProfileCardProps) {
    return (
        <div className="bg-surface border border-border rounded-lg p-5">
            <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                Thông tin tài khoản
            </h3>
            {profile ? (
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted">Email</span>
                        <span className="font-medium">{profile.email}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted">Vai trò</span>
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-purple-50 text-purple-600">
                            {profile.role}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted">Tạo tài khoản</span>
                        <span>{new Date(profile.createdAt).toLocaleDateString("vi-VN")}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted">Domains sở hữu</span>
                        <span>{profile._count.domains}</span>
                    </div>
                </div>
            ) : (
                <div className="text-sm text-muted">Đang tải...</div>
            )}
        </div>
    );
}

// --- System Info Card ---
export interface SystemInfoCardProps {
    systemInfo: SystemInfo | null;
}

export function SystemInfoCard({ systemInfo }: SystemInfoCardProps) {
    return (
        <div className="bg-surface border border-border rounded-lg p-5">
            <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
                </svg>
                Thông tin hệ thống
            </h3>
            {systemInfo ? (
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted">Tổng người dùng</span>
                        <span className="font-medium">{systemInfo.userCount}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted">Tổng domains</span>
                        <span>{systemInfo.domainCount}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted">Tổng email</span>
                        <span>{systemInfo.messageCount}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted">Đăng nhập 24h</span>
                        <span className="text-green-600">{systemInfo.recentLogins24h}</span>
                    </div>
                </div>
            ) : (
                <div className="text-sm text-muted">Đang tải...</div>
            )}
        </div>
    );
}

// --- Email Verification Toggle ---
export interface EmailVerificationSectionProps {
    required: boolean;
    loading: boolean;
    onToggle: () => void;
}

export function EmailVerificationSection({ required, loading, onToggle }: EmailVerificationSectionProps) {
    return (
        <div className="bg-surface border border-border rounded-lg p-5 mt-6">
            <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                Xác minh Email khi đăng ký
            </h3>
            <div className="space-y-3">
                <p className="text-sm text-muted">
                    Khi bật, người dùng mới đăng ký phải xác minh email trước khi đăng nhập.
                    Khi tắt, tài khoản được kích hoạt ngay sau khi đăng ký.
                </p>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className={`text-sm font-medium ${required ? "text-green-600" : "text-amber-600"}`}>
                            {required ? "Đang yêu cầu xác minh" : "Không yêu cầu xác minh"}
                        </span>
                    </div>
                    <button
                        onClick={onToggle}
                        disabled={loading}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                            required ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600"
                        } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                required ? "translate-x-6" : "translate-x-1"
                            }`}
                        />
                    </button>
                </div>
                <p className="text-xs text-muted border-t border-border pt-3 mt-3">
                    Lưu ý: Thay đổi này chỉ áp dụng cho người dùng mới. Để xác minh thủ công user đã đăng ký,
                    vào <a href="/admin/users" className="text-primary hover:underline">Quản lý người dùng</a> và click vào "Chưa xác thực".
                </p>
            </div>
        </div>
    );
}

// --- Password Change Form ---
export interface PasswordFormProps {
    password: string;
    setPassword: (v: string) => void;
    msg: string;
    err: string;
    busy: boolean;
    onSubmit: (e: React.FormEvent) => void;
}

export function PasswordForm({ password, setPassword, msg, err, busy, onSubmit }: PasswordFormProps) {
    return (
        <div className="bg-surface border border-border rounded-lg p-5 mt-6">
            <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Đổi mật khẩu
            </h3>
            <form onSubmit={onSubmit} className="space-y-4">
                <input type="text" autoComplete="username" className="hidden" aria-hidden="true" tabIndex={-1} />
                <div>
                    <label className="block text-xs text-muted mb-1.5">Mật khẩu mới</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Tối thiểu 6 ký tự"
                        className="text-sm input-nebula w-full max-w-xs"
                        minLength={6}
                        required
                        autoComplete="new-password"
                    />
                </div>
                <button type="submit" disabled={busy} className="btn-primary h-10 px-6">
                    {busy ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                </button>
                {msg && <div className="text-sm text-green-600">{msg}</div>}
                {err && <div className="text-sm text-danger">{err}</div>}
            </form>
        </div>
    );
}

// --- Two-Factor Authentication Section ---
export interface TwoFASectionProps {
    profile: AdminProfile | null;
    step: TwoFAStep;
    qrCode: string;
    totpSecret: string;
    verifyCode: string;
    setVerifyCode: (v: string) => void;
    backupCodes: string[];
    busy: boolean;
    error: string;
    onSetup: () => void;
    onEnable: () => void;
    onDisable: () => void;
    onFinish: () => void;
}

export function TwoFASection({
    profile, step, qrCode, totpSecret, verifyCode, setVerifyCode,
    backupCodes, busy, error, onSetup, onEnable, onDisable, onFinish
}: TwoFASectionProps) {
    return (
        <div className="bg-surface border border-border rounded-lg p-5 mt-6">
            <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                Xác thực hai yếu tố (2FA)
            </h3>

            {error && <div className="text-sm text-danger mb-3">{error}</div>}

            {/* Status: Not enabled */}
            {!profile?.twoFactorEnabled && step === "idle" && (
                <div className="space-y-3">
                    <p className="text-sm text-muted">
                        Bảo vệ tài khoản của bạn bằng xác thực hai yếu tố sử dụng ứng dụng như Google Authenticator.
                    </p>
                    <button onClick={onSetup} disabled={busy} className="btn-primary h-10 px-6">
                        {busy ? "Đang thiết lập..." : "Kích hoạt 2FA"}
                    </button>
                </div>
            )}

            {/* Step: Show QR code */}
            {step === "setup" && (
                <div className="space-y-4">
                    <p className="text-sm text-muted">Quét mã QR bằng ứng dụng xác thực:</p>
                    <div className="bg-white p-4 rounded-lg inline-block border border-border">
                        <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                    </div>
                    <p className="text-xs text-muted">Hoặc nhập thủ công: <code className="bg-bg px-2 py-1 rounded text-xs">{totpSecret}</code></p>
                    <div className="pt-2">
                        <label className="block text-xs text-muted mb-1.5">Nhập mã 6 chữ số từ ứng dụng:</label>
                        <div className="flex gap-2 items-center">
                            <input
                                type="text"
                                value={verifyCode}
                                onChange={(e) => setVerifyCode(e.target.value)}
                                className="text-sm w-32 tracking-widest text-center input-nebula"
                                placeholder="000000"
                                maxLength={6}
                            />
                            <button onClick={onEnable} disabled={busy} className="btn-primary h-10">
                                Xác nhận
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step: Backup codes */}
            {step === "backup" && (
                <div className="space-y-4">
                    <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm border border-green-200">
                        <strong>Đã kích hoạt thành công!</strong> Đây là các mã dự phòng của bạn. Hãy lưu chúng vào nơi an toàn.
                    </div>
                    <div className="grid grid-cols-2 gap-2 bg-bg p-4 rounded-lg border border-border">
                        {backupCodes.map((code) => (
                            <div key={code} className="font-mono text-xs text-center">{code}</div>
                        ))}
                    </div>
                    <button onClick={onFinish} className="btn-secondary h-10 w-full">
                        Đã lưu mã dự phòng
                    </button>
                </div>
            )}

            {/* Status: Enabled */}
            {profile?.twoFactorEnabled && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg border border-green-200 text-sm">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Đang bật bảo vệ 2FA
                    </div>
                    <button onClick={onDisable} disabled={busy} className="text-sm text-danger hover:underline">
                        Tắt 2FA
                    </button>
                </div>
            )}
        </div>
    );
}
