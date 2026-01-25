/**
 * Anonymous Login Page - Login with Passkey or Account Code
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GlassCard } from "../components/ui/GlassCard";
import { SEOHead } from "../components/seo/SEOHead";
import { Fingerprint, KeyRound, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { loginWithPasskey } from "../services/anonymous-auth.service";
import { useLocalStorage } from "../hooks/useLocalStorage";

export function AnonymousLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [accountCode, setAccountCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [, setToken] = useLocalStorage("token", "");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountCode.trim()) {
      toast.error("Vui lòng nhập mã tài khoản");
      return;
    }

    setBusy(true);
    try {
      const result = await loginWithPasskey(accountCode.trim());
      setToken(result.accessToken);
      toast.success("Đăng nhập thành công!");
      navigate("/app");
    } catch (error) {
      const msg = (error as Error).message;
      if (msg.includes("not found")) {
        toast.error("Không tìm thấy tài khoản hoặc chưa thiết lập Passkey");
      } else {
        toast.error("Xác thực thất bại. Vui lòng thử lại.");
      }
    } finally {
      setBusy(false);
    }
  };

  // Format account code as user types (xxxx-xxxx-xxxx-xxxx)
  const handleCodeChange = (value: string) => {
    const cleaned = value.replace(/[^a-fA-F0-9-]/g, "").toLowerCase();
    const parts = cleaned.replace(/-/g, "").match(/.{1,4}/g) || [];
    setAccountCode(parts.slice(0, 4).join("-"));
  };

  return (
    <div className="flex-1 w-full flex flex-col p-4 py-12">
      <SEOHead
        title={t("seo.anonymousLogin.title", "Đăng Nhập Ẩn Danh")}
        description={t(
          "seo.anonymousLogin.description",
          "Đăng nhập vào tài khoản ẩn danh bằng Passkey hoặc mã tài khoản."
        )}
        path="/anonymous/login"
      />

      <div className="w-full max-w-lg mx-auto">
        <GlassCard className="p-8 md:p-12 rounded-3xl relative animate-fade-in-up">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          {/* Back Link */}
          <Link
            to="/anonymous"
            className="inline-flex items-center gap-2 mb-6 text-text-secondary hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Quay lại</span>
          </Link>

          {/* Logo */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity"
          >
            <div className="p-2 rounded-xl bg-primary/10 shadow-glow">
              <Fingerprint className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              Ephemera
            </span>
          </Link>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2 tracking-tight">
                Đăng Nhập Ẩn Danh
              </h1>
              <p className="text-text-secondary">
                Nhập mã tài khoản và xác thực bằng Passkey
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Mã Tài Khoản
                </label>
                <input
                  type="text"
                  value={accountCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder="xxxx-xxxx-xxxx-xxxx"
                  className="w-full px-4 py-3 bg-surface-dark border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono text-center text-lg tracking-wider"
                  maxLength={19}
                  disabled={busy}
                />
                <p className="mt-2 text-xs text-text-secondary">
                  Nhập mã 16 ký tự bạn đã lưu khi tạo tài khoản
                </p>
              </div>

              <button
                type="submit"
                disabled={busy || accountCode.length < 19}
                className="w-full py-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2"
              >
                {busy ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang xác thực...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-5 h-5" />
                    Đăng Nhập bằng Passkey
                  </>
                )}
              </button>
            </form>

            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <p className="text-sm text-blue-200">
                💡 <strong>Lưu ý:</strong> Bạn cần thiết bị đã đăng ký Passkey để
                đăng nhập. Nếu chưa thiết lập Passkey, hãy tạo tài khoản mới.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-border space-y-3">
            <p className="text-xs text-center text-text-secondary">
              Chưa có tài khoản?{" "}
              <Link to="/anonymous" className="text-primary hover:underline">
                Tạo tài khoản ẩn danh
              </Link>
            </p>
            <p className="text-xs text-center text-text-secondary">
              Hoặc{" "}
              <Link to="/login" className="text-primary hover:underline">
                đăng nhập với email
              </Link>
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
