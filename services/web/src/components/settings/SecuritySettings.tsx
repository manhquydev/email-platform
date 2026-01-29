/**
 * SecuritySettings - Security settings with password change and 2FA
 * Modules extracted to security-settings-modules/
 */
import { useRef, useCallback } from "react";
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

/** Scroll to element and highlight it briefly */
function scrollAndHighlight(element: HTMLElement | null) {
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    element.classList.add("ring-2", "ring-nebula-violet", "ring-offset-2", "ring-offset-nebula-bg");
    setTimeout(() => {
        element.classList.remove("ring-2", "ring-nebula-violet", "ring-offset-2", "ring-offset-nebula-bg");
    }, 1500);
}

export function SecuritySettings({ profile, loadProfile }: SecuritySettingsProps) {
    const passwordFormRef = useRef<HTMLDivElement>(null);
    const twoFASectionRef = useRef<HTMLDivElement>(null);
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

    const handleUpdatePassword = useCallback(() => {
        scrollAndHighlight(passwordFormRef.current);
    }, []);

    const handleSetup2FA = useCallback(() => {
        setup2FA();
        setTimeout(() => scrollAndHighlight(twoFASectionRef.current), 100);
    }, [setup2FA]);

    const handleManage2FA = useCallback(() => {
        setShowDisable2FAConfirm(true);
        setTimeout(() => scrollAndHighlight(twoFASectionRef.current), 100);
    }, [setShowDisable2FAConfirm]);

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div>
                <h2 className="text-3xl font-bold text-nebula-text mb-2 tracking-tight">Bảo mật</h2>
                <p className="text-nebula-text-muted font-body">Bảo vệ tài khoản của bạn với các tiêu chuẩn bảo mật hiện đại.</p>
            </div>

            <SecurityStatusCard
                profile={profile}
                onSetup2FA={handleSetup2FA}
                onManage2FA={handleManage2FA}
                onUpdatePassword={handleUpdatePassword}
            />

            <div ref={passwordFormRef} className="transition-all duration-300 rounded-xl">
                <PasswordChangeForm
                password={password}
                setPassword={setPassword}
                passwordMsg={passwordMsg}
                passwordErr={passwordErr}
                passwordBusy={passwordBusy}
                onSubmit={handlePasswordChange}
            />
            </div>

            <div ref={twoFASectionRef} className="space-y-6 transition-all duration-300 rounded-xl">
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
            </div>

            <PasskeyManager />
            <TelegramSection />
        </div>
    );
}
