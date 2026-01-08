// Telegram Account Linking Section for Settings
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../utils/api";
import { TelegramLoginButton, TelegramUser } from "../TelegramLoginButton";
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
  const queryClient = useQueryClient();
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: ["telegram-auth-status"],
    queryFn: async () => {
      const res = await api<TelegramStatus>("/auth/telegram/status", { token });
      return res;
    },
    enabled: !!token,
  });

  const linkMutation = useMutation({
    mutationFn: async (userData: TelegramUser) => {
      return api("/auth/telegram/link", {
        method: "POST",
        token,
        body: userData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telegram-auth-status"] });
      toast.success("Telegram đã được liên kết thành công!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Không thể liên kết Telegram");
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async () => {
      return api("/auth/telegram/unlink", {
        method: "DELETE",
        token,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telegram-auth-status"] });
      setShowUnlinkConfirm(false);
      toast.success("Đã hủy liên kết Telegram");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Không thể hủy liên kết Telegram");
    },
  });

  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;

  if (!botUsername) {
    return null; // Hide section if Telegram not configured
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-slate-700" />
          <div className="flex-1">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-700" />
            <div className="mt-2 h-3 w-48 animate-pulse rounded bg-slate-700" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0088cc]/20">
          <svg className="h-5 w-5 text-[#0088cc]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-white">Telegram</h3>
          <p className="text-sm text-slate-400">
            {status?.linked ? "Đã liên kết" : "Đăng nhập nhanh với Telegram"}
          </p>
        </div>
      </div>

      {status?.linked ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-slate-700/50 p-4">
            {status.telegramPhotoUrl ? (
              <img
                src={status.telegramPhotoUrl}
                alt="Telegram"
                className="h-12 w-12 rounded-full"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0088cc]/30 text-[#0088cc]">
                <span className="text-lg font-bold">
                  {status.telegramFirstName?.[0] || "T"}
                </span>
              </div>
            )}
            <div className="flex-1">
              <p className="font-medium text-white">
                {status.telegramFirstName || "Telegram User"}
              </p>
              {status.telegramUsername && (
                <p className="text-sm text-slate-400">@{status.telegramUsername}</p>
              )}
              {status.linkedAt && (
                <p className="text-xs text-slate-500">
                  Liên kết từ {new Date(status.linkedAt).toLocaleDateString("vi-VN")}
                </p>
              )}
            </div>
          </div>

          {showUnlinkConfirm ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <p className="mb-3 text-sm text-red-400">
                Bạn có chắc muốn hủy liên kết Telegram? Bạn có thể liên kết lại bất cứ lúc nào.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowUnlinkConfirm(false)}
                  className="flex-1 rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
                >
                  Hủy
                </button>
                <button
                  onClick={() => unlinkMutation.mutate()}
                  disabled={unlinkMutation.isPending}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {unlinkMutation.isPending ? "Đang xử lý..." : "Xác nhận hủy liên kết"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowUnlinkConfirm(true)}
              className="w-full rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
            >
              Hủy liên kết Telegram
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Liên kết tài khoản Telegram để đăng nhập nhanh hơn mà không cần nhập mật khẩu.
          </p>

          <div className="flex justify-center">
            {linkMutation.isPending ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span className="animate-spin">⏳</span>
                <span>Đang liên kết...</span>
              </div>
            ) : (
              <TelegramLoginButton
                botName={botUsername}
                onAuth={(user) => linkMutation.mutate(user)}
                buttonSize="large"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
