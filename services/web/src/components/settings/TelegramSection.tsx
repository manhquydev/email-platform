// Telegram Account Linking Section for Settings
import { useState, useEffect, useCallback } from "react";
import { api } from "../../utils/api";
import { TelegramLoginButton, type TelegramUser } from "../TelegramLoginButton";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

interface TelegramStatus {
  linked: boolean;
  telegramId?: string;
  telegramUsername?: string;
  telegramFirstName?: string;
  telegramPhotoUrl?: string;
  linkedAt?: string;
}

export function TelegramSection() {
  const { token } = useAuth();
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await api<TelegramStatus>("/auth/telegram/status", { token });
      setStatus(res);
    } catch {
      // Silent fail - status will be null
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleLink = async (userData: TelegramUser) => {
    setIsLinking(true);
    try {
      await api("/auth/telegram/link", {
        method: "POST",
        token,
        body: userData,
      });
      toast.success("Telegram đã được liên kết thành công!");
      fetchStatus();
    } catch (err) {
      toast.error((err as Error).message || "Không thể liên kết Telegram");
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlink = async () => {
    setIsUnlinking(true);
    try {
      await api("/auth/telegram/unlink", {
        method: "DELETE",
        token,
      });
      setShowUnlinkConfirm(false);
      toast.success("Đã hủy liên kết Telegram");
      fetchStatus();
    } catch (err) {
      toast.error((err as Error).message || "Không thể hủy liên kết Telegram");
    } finally {
      setIsUnlinking(false);
    }
  };

  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;

  if (!botUsername) {
    return null; // Hide section if Telegram not configured
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-semantic-border bg-semantic-bg-elevated p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-semantic-bg-secondary" />
          <div className="flex-1">
            <div className="h-4 w-32 animate-pulse rounded bg-semantic-bg-secondary" />
            <div className="mt-2 h-3 w-48 animate-pulse rounded bg-semantic-bg-secondary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-semantic-border bg-semantic-bg-elevated p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-semantic-info-subtle">
          <svg className="h-5 w-5 text-semantic-info" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-semantic-text-main">Telegram</h3>
          <p className="text-sm text-semantic-text-muted">
            {status?.linked ? "Đã liên kết" : "Đăng nhập nhanh với Telegram"}
          </p>
        </div>
      </div>

      {status?.linked ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-semantic-bg-secondary p-4">
            {status.telegramPhotoUrl ? (
              <img
                src={status.telegramPhotoUrl}
                alt="Telegram"
                className="h-12 w-12 rounded-full"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-semantic-info-subtle text-semantic-info">
                <span className="text-lg font-bold">
                  {status.telegramFirstName?.[0] || "T"}
                </span>
              </div>
            )}
            <div className="flex-1">
              <p className="font-medium text-semantic-text-main">
                {status.telegramFirstName || "Telegram User"}
              </p>
              {status.telegramUsername && (
                <p className="text-sm text-semantic-text-muted">@{status.telegramUsername}</p>
              )}
              {status.linkedAt && (
                <p className="text-xs text-semantic-text-muted">
                  Liên kết từ {new Date(status.linkedAt).toLocaleDateString("vi-VN")}
                </p>
              )}
            </div>
          </div>

          {showUnlinkConfirm ? (
            <div className="rounded-lg border border-semantic-danger/30 bg-semantic-danger-subtle p-4">
              <p className="mb-3 text-sm text-semantic-danger">
                Bạn có chắc muốn hủy liên kết Telegram? Bạn có thể liên kết lại bất cứ lúc nào.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowUnlinkConfirm(false)}
                  className="flex-1 rounded-lg border border-semantic-border px-4 py-2 text-sm text-semantic-text-secondary hover:bg-semantic-bg-hover"
                >
                  Hủy
                </button>
                <button
                  onClick={handleUnlink}
                  disabled={isUnlinking}
                  className="flex-1 rounded-lg bg-semantic-danger px-4 py-2 text-sm font-medium text-white hover:bg-semantic-danger-hover disabled:opacity-50"
                >
                  {isUnlinking ? "Đang xử lý..." : "Xác nhận hủy liên kết"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowUnlinkConfirm(true)}
              className="w-full rounded-lg border border-semantic-danger/30 px-4 py-2 text-sm text-semantic-danger hover:bg-semantic-danger-subtle"
            >
              Hủy liên kết Telegram
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-semantic-text-muted">
            Liên kết tài khoản Telegram để đăng nhập nhanh hơn mà không cần nhập mật khẩu.
          </p>

          <div className="flex justify-center">
            {isLinking ? (
              <div className="flex items-center gap-2 text-sm text-semantic-text-muted">
                <span className="animate-spin">⏳</span>
                <span>Đang liên kết...</span>
              </div>
            ) : (
              <TelegramLoginButton
                botName={botUsername}
                onAuth={handleLink}
                buttonSize="large"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
