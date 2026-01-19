/**
 * SecuritySettings - Security settings with password change and 2FA
 * Modules extracted to security-settings-modules/
 */
import { PasskeyManager } from "../Auth/PasskeyManager";
import { TelegramSection } from "./TelegramSection";
import {
    type SecuritySettingsProps,
    usePasswordChange,
    useTwoFactorAuth,
    SecurityStatusCard,
    PasswordChangeForm,
    TwoFASetupCard,
    Disable2FACard
} from "./security-settings-modules";

export function SecuritySettings({ profile, loadProfile }: SecuritySettingsProps) {
    const {
        password, setPassword,
        passwordMsg, passwordErr, passwordBusy,
        handlePasswordChange
    } = usePasswordChange();

    const {
        twoFAStep, setTwoFAStep,
        qrCode, totpSecret,
        verifyCode, setVerifyCode,
        backupCodes,
        twoFABusy, twoFAError,
        showDisable2FAConfirm, setShowDisable2FAConfirm,
        twoFAPassword, setTwoFAPassword,
        setup2FA, enable2FA, confirmDisable2FA
    } = useTwoFactorAuth(loadProfile);

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div>
                <h2 className="text-3xl font-bold text-nebula-text mb-2 tracking-tight">Bảo mật</h2>
                <p className="text-nebula-text-muted font-body">Bảo vệ tài khoản của bạn với các tiêu chuẩn bảo mật hiện đại.</p>
            </div>

            <SecurityStatusCard
                profile={profile}
                onSetup2FA={setup2FA}
                onManage2FA={() => setShowDisable2FAConfirm(true)}
            />

            <PasswordChangeForm
                password={password}
                setPassword={setPassword}
                passwordMsg={passwordMsg}
                passwordErr={passwordErr}
                passwordBusy={passwordBusy}
                onSubmit={handlePasswordChange}
            />

            <TwoFASetupCard
                step={twoFAStep}
                qrCode={qrCode}
                totpSecret={totpSecret}
                verifyCode={verifyCode}
                setVerifyCode={setVerifyCode}
                backupCodes={backupCodes}
                busy={twoFABusy}
                error={twoFAError}
                onEnable={enable2FA}
                onCancel={() => setTwoFAStep("idle")}
                onDone={() => setTwoFAStep("idle")}
            />

            <Disable2FACard
                show={showDisable2FAConfirm}
                password={twoFAPassword}
                setPassword={setTwoFAPassword}
                busy={twoFABusy}
                onConfirm={confirmDisable2FA}
                onCancel={() => setShowDisable2FAConfirm(false)}
            />

            <PasskeyManager />
            <TelegramSection />
        </div>
    );
}
