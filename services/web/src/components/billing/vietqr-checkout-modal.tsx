/**
 * VietQR Checkout Modal
 * Displays QR code for SePay payment with real-time status polling
 */

import { useEffect, useState, useCallback } from "react";
import { api } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

interface SepayCheckoutData {
  orderCode: string;
  qrUrl: string;
  amount: number;
  expiresAt: string;
}

interface VietQRCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkoutData: SepayCheckoutData;
  packageName: string;
  onSuccess?: () => void;
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

function formatTimeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Hết hạn";
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function VietQRCheckoutModal({
  isOpen,
  onClose,
  checkoutData,
  packageName,
  onSuccess,
}: VietQRCheckoutModalProps) {
  const { token } = useAuth();
  const [status, setStatus] = useState<"pending" | "completed" | "expired">("pending");
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  // Check payment status
  const checkStatus = useCallback(async () => {
    if (!checkoutData?.orderCode) return;

    try {
      const res = await api<{ status: string }>(`/billing/sepay/status/${checkoutData.orderCode}`, { token });
      if (res.status === "COMPLETED") {
        setStatus("completed");
      } else if (res.status === "EXPIRED") {
        setStatus("expired");
      }
    } catch (err) {
      console.error("Status check failed:", err);
    }
  }, [checkoutData?.orderCode, token]);

  // Poll for status
  useEffect(() => {
    if (!isOpen || status !== "pending") return;

    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [isOpen, status, checkStatus]);

  // Update countdown timer
  useEffect(() => {
    if (!checkoutData?.expiresAt || status !== "pending") return;

    const interval = setInterval(() => {
      const remaining = formatTimeRemaining(checkoutData.expiresAt);
      setTimeRemaining(remaining);

      if (remaining === "Hết hạn") {
        setStatus("expired");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [checkoutData?.expiresAt, status]);

  // Handle success
  useEffect(() => {
    if (status === "completed") {
      onSuccess?.();
    }
  }, [status, onSuccess]);

  // Reset status when modal opens
  useEffect(() => {
    if (isOpen) {
      setStatus("pending");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-nebula-surface border border-nebula-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-nebula-border">
          <h2 className="text-lg font-bold text-nebula-text">Thanh toán qua VietQR</h2>
          <button
            onClick={onClose}
            className="text-nebula-text-muted hover:text-nebula-text transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {status === "pending" && checkoutData && (
            <div className="flex flex-col items-center">
              {/* QR Code */}
              <div className="bg-white p-4 rounded-xl">
                <img
                  src={checkoutData.qrUrl}
                  alt="VietQR Code"
                  className="w-56 h-56 object-contain"
                />
              </div>

              {/* Payment Info */}
              <div className="mt-6 text-center space-y-2">
                <p className="text-nebula-text-muted text-sm">
                  Gói: <span className="text-nebula-text font-medium">{packageName}</span>
                </p>
                <p className="text-nebula-text text-2xl font-bold">
                  {formatPrice(checkoutData.amount)}
                </p>
                <p className="text-nebula-text-muted text-sm">
                  Nội dung CK:{" "}
                  <code className="bg-nebula-elevated px-2 py-1 rounded text-nebula-violet font-mono">
                    {checkoutData.orderCode}
                  </code>
                </p>
              </div>

              {/* Timer */}
              <div className="mt-4 flex items-center gap-2 text-nebula-text-muted text-sm">
                <span className="material-symbols-outlined text-lg">schedule</span>
                <span>
                  Hết hạn sau: <span className="text-nebula-text font-medium">{timeRemaining}</span>
                </span>
              </div>

              {/* Status */}
              <div className="mt-6 flex items-center gap-2 text-nebula-violet">
                <div className="animate-pulse w-2 h-2 bg-nebula-violet rounded-full"></div>
                <span className="text-sm">Đang chờ thanh toán...</span>
              </div>

              {/* Instructions */}
              <div className="mt-6 p-4 bg-nebula-elevated rounded-lg text-sm text-nebula-text-muted">
                <p className="font-medium text-nebula-text mb-2">Hướng dẫn:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Mở ứng dụng ngân hàng trên điện thoại</li>
                  <li>Quét mã QR hoặc chọn "Chuyển tiền"</li>
                  <li>Nhập đúng nội dung chuyển khoản</li>
                  <li>Xác nhận và hoàn tất thanh toán</li>
                </ol>
              </div>
            </div>
          )}

          {status === "completed" && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-green-500">check_circle</span>
              </div>
              <h3 className="mt-4 text-xl font-bold text-nebula-text">Thanh toán thành công!</h3>
              <p className="mt-2 text-nebula-text-muted text-center">
                Gói của bạn đã được kích hoạt. Cảm ơn bạn đã sử dụng dịch vụ!
              </p>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-2 bg-nebula-violet text-white rounded-lg hover:bg-nebula-violet/90"
              >
                Đóng
              </button>
            </div>
          )}

          {status === "expired" && (
            <div className="flex flex-col items-center justify-center py-8">
              <span className="material-symbols-outlined text-4xl text-amber-500">timer_off</span>
              <h3 className="mt-4 text-xl font-bold text-nebula-text">Đã hết thời gian</h3>
              <p className="mt-2 text-nebula-text-muted text-center">
                Phiên thanh toán đã hết hạn. Vui lòng thử lại.
              </p>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-2 bg-nebula-violet text-white rounded-lg hover:bg-nebula-violet/90"
              >
                Đóng
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
