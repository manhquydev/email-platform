/**
 * Anonymous Register Page - Mullvad-style zero-PII registration
 * Creates account with passkey only, no email required
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GlassCard } from "../components/ui/GlassCard";
import { SEOHead } from "../components/seo/SEOHead";
import toast from "react-hot-toast";
import {
  createAnonymousAccount,
  registerPasskey,
  type AnonymousAccount,
} from "../services/anonymous-auth.service";
import { useLocalStorage } from "../hooks/useLocalStorage";

type Step = "intro" | "creating" | "success" | "passkey";

export function AnonymousRegister() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("intro");
  const [account, setAccount] = useState<AnonymousAccount | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [, setToken] = useLocalStorage("token", "");
  const [, setVisitorToken] = useLocalStorage("visitorToken", "");

  const handleCreateAccount = async () => {
    setBusy(true);
    setStep("creating");
    try {
      const result = await createAnonymousAccount();
      setAccount(result);
      // Store tokens for session persistence
      setToken(result.accessToken);
      setVisitorToken(result.visitorToken);
      setStep("success");
      toast.success("Tài khoản ẩn danh đã được tạo!");
    } catch {
      toast.error("Không thể tạo tài khoản. Vui lòng thử lại.");
      setStep("intro");
    } finally {
      setBusy(false);
    }
  };

  const handleCopyCode = async () => {
    if (!account) return;
    await navigator.clipboard.writeText(account.accountCode);
    setCopied(true);
    toast.success("Đã sao chép mã tài khoản!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSetupPasskey = async () => {
    if (!account) return;
    setBusy(true);
    setStep("passkey");
    try {
      await registerPasskey(account.accessToken);
      toast.success("Passkey đã được thiết lập!");
      navigate("/app");
    } catch {
      toast.error("Không thể thiết lập Passkey. Vui lòng thử lại.");
      setStep("success");
    } finally {
      setBusy(false);
    }
  };

  const handleSkipPasskey = () => {
    navigate("/app");
  };

  return (
    <div className="flex-1 w-full flex flex-col p-4 py-12 relative">
      <SEOHead
        title={t("seo.anonymousRegister.title", "Tạo Tài Khoản Ẩn Danh")}
        description={t(
          "seo.anonymousRegister.description",
          "Tạo tài khoản email tạm thời hoàn toàn ẩn danh - không cần email, không cần mật khẩu."
        )}
        path="/anonymous"
      />

      {/* Security Badge */}
      <div className="absolute top-4 right-4 flex items-center gap-2 text-xs text-text-secondary">
        <span className="material-symbols-outlined !text-[16px] text-green-500">shield</span>
        <span>Zero PII Collection</span>
      </div>

      <div className="w-full max-w-lg mx-auto">
        <GlassCard className="p-8 md:p-12 rounded-3xl relative animate-fade-in-up">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          {/* Logo */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity"
          >
            <div className="p-2 rounded-xl bg-primary/10 shadow-glow">
              <span className="material-symbols-outlined !text-[24px] text-primary">fingerprint</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              Ephemera
            </span>
          </Link>

          {/* Step: Intro */}
          {step === "intro" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold mb-2 tracking-tight">
                  Tài Khoản Ẩn Danh
                </h1>
                <p className="text-text-secondary">
                  Không email. Không mật khẩu. Chỉ có sự riêng tư.
                </p>
              </div>

              <div className="space-y-4 py-4">
                <FeatureItem
                  icon={<span className="material-symbols-outlined !text-[20px] text-green-500">shield</span>}
                  title="Zero PII"
                  description="Không thu thập thông tin cá nhân nào"
                />
                <FeatureItem
                  icon={<span className="material-symbols-outlined !text-[20px] text-blue-500">key</span>}
                  title="Passkey Security"
                  description="Bảo mật bằng sinh trắc học thiết bị"
                />
                <FeatureItem
                  icon={<span className="material-symbols-outlined !text-[20px] text-purple-500">fingerprint</span>}
                  title="Mã Tài Khoản"
                  description="Mã 16 ký tự để khôi phục tài khoản"
                />
              </div>

              <button
                onClick={handleCreateAccount}
                disabled={busy}
                className="w-full py-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 shadow-glow"
              >
                <span className="material-symbols-outlined !text-[20px]">fingerprint</span>
                Tạo Tài Khoản Ẩn Danh
              </button>

              <p className="text-xs text-center text-text-secondary">
                Bạn đã có tài khoản?{" "}
                <Link to="/anonymous/login" className="text-primary hover:underline">
                  Đăng nhập bằng Passkey
                </Link>
              </p>
            </div>
          )}

          {/* Step: Creating */}
          {step === "creating" && (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                <span className="material-symbols-outlined !text-[32px] text-primary">fingerprint</span>
              </div>
              <p className="text-text-secondary">Đang tạo tài khoản ẩn danh...</p>
            </div>
          )}

          {/* Step: Success - Show Account Code */}
          {step === "success" && account && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <span className="material-symbols-outlined !text-[32px] text-green-500">check</span>
                </div>
                <h2 className="text-2xl font-bold mb-2">Tài Khoản Đã Tạo!</h2>
                <p className="text-text-secondary text-sm">
                  Lưu mã này để khôi phục tài khoản
                </p>
              </div>

              {/* Account Code Display */}
              <div className="relative">
                <div className="p-4 bg-surface-dark rounded-xl border border-border text-center">
                  <p className="text-xs text-text-secondary mb-2">Mã Tài Khoản</p>
                  <p className="text-2xl font-mono font-bold tracking-wider text-primary">
                    {account.accountCode}
                  </p>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="absolute top-2 right-2 p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Sao chép mã"
                >
                  {copied ? (
                    <span className="material-symbols-outlined !text-[16px] text-green-500">check</span>
                  ) : (
                    <span className="material-symbols-outlined !text-[16px] text-text-secondary">content_copy</span>
                  )}
                </button>
              </div>

              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <p className="text-sm text-yellow-200">
                  ⚠️ <strong>Quan trọng:</strong> Lưu mã này ở nơi an toàn. Đây là
                  cách duy nhất để khôi phục tài khoản nếu bạn chưa thiết lập
                  Passkey.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleSetupPasskey}
                  disabled={busy}
                  className="w-full py-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined !text-[20px]">key</span>
                  Thiết Lập Passkey (Khuyến nghị)
                </button>
                <button
                  onClick={handleSkipPasskey}
                  className="w-full py-3 bg-transparent border border-border hover:bg-white/5 rounded-xl text-text-secondary transition-colors flex items-center justify-center gap-2"
                >
                  Bỏ qua, tiếp tục
                  <span className="material-symbols-outlined !text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* Step: Passkey Setup */}
          {step === "passkey" && (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse">
                <span className="material-symbols-outlined !text-[32px] text-blue-500">key</span>
              </div>
              <p className="text-text-secondary">
                Đang thiết lập Passkey...
                <br />
                <span className="text-xs">
                  Vui lòng xác thực trên thiết bị của bạn
                </span>
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs text-center text-text-secondary">
              Hoặc{" "}
              <Link to="/register" className="text-primary hover:underline">
                đăng ký với email
              </Link>{" "}
              để có thêm tính năng
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-lg bg-surface-dark">{icon}</div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-text-secondary">{description}</p>
      </div>
    </div>
  );
}
