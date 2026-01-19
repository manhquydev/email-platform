/**
 * AdminSettingsPage - Admin account and system settings
 * Manages profile, 2FA, password, and system configuration
 */
import {
    useAdminSettingsData,
    ProfileCard,
    SystemInfoCard,
    EmailVerificationSection,
    PasswordForm,
    TwoFASection
} from "./admin-settings-modules";

export function AdminSettingsPage() {
    const {
        profile,
        systemInfo,
        password,
        setPassword,
        passwordMsg,
        passwordErr,
        passwordBusy,
        submitPassword,
        twoFAStep,
        qrCode,
        totpSecret,
        verifyCode,
        setVerifyCode,
        backupCodes,
        twoFABusy,
        twoFAError,
        setup2FA,
        enable2FA,
        disable2FA,
        setTwoFAStep,
        emailVerificationRequired,
        emailVerificationLoading,
        toggleEmailVerification,
    } = useAdminSettingsData();

    return (
        <div className="p-4 md:p-6 max-w-2xl">
            <div className="mb-6">
                <h1 className="text-xl font-semibold">Cài đặt</h1>
                <p className="text-sm text-muted mt-1">Quản lý tài khoản và hệ thống</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ProfileCard profile={profile} />
                <SystemInfoCard systemInfo={systemInfo} />
            </div>

            <EmailVerificationSection
                required={emailVerificationRequired}
                loading={emailVerificationLoading}
                onToggle={toggleEmailVerification}
            />

            <PasswordForm
                password={password}
                setPassword={setPassword}
                msg={passwordMsg}
                err={passwordErr}
                busy={passwordBusy}
                onSubmit={submitPassword}
            />

            <TwoFASection
                profile={profile}
                step={twoFAStep}
                qrCode={qrCode}
                totpSecret={totpSecret}
                verifyCode={verifyCode}
                setVerifyCode={setVerifyCode}
                backupCodes={backupCodes}
                busy={twoFABusy}
                error={twoFAError}
                onSetup={setup2FA}
                onEnable={enable2FA}
                onDisable={disable2FA}
                onFinish={() => setTwoFAStep("idle")}
            />
        </div>
    );
}
