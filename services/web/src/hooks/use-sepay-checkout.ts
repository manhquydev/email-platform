/**
 * SePay Checkout Hook
 * Handles VietQR payment flow with status polling
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { api } from "../lib/api";

export interface SepayCheckoutResult {
  orderCode: string;
  qrUrl: string;
  amount: number;
  expiresAt: string;
}

export interface UseSepayCheckoutReturn {
  isLoading: boolean;
  error: string | null;
  checkout: SepayCheckoutResult | null;
  status: "idle" | "pending" | "completed" | "expired" | "error";
  createCheckout: (packageId: string) => Promise<void>;
  checkStatus: () => Promise<void>;
  reset: () => void;
}

export function useSepayCheckout(): UseSepayCheckoutReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<SepayCheckoutResult | null>(null);
  const [status, setStatus] = useState<"idle" | "pending" | "completed" | "expired" | "error">("idle");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const createCheckout = useCallback(async (packageId: string) => {
    setIsLoading(true);
    setError(null);
    setStatus("idle");

    try {
      const response = await api.post("/billing/sepay/checkout", { packageId });
      const data = response.data as SepayCheckoutResult;
      setCheckout(data);
      setStatus("pending");

      // Start polling for status
      stopPolling();
      pollingRef.current = setInterval(async () => {
        try {
          const statusRes = await api.get(`/billing/sepay/status/${data.orderCode}`);
          const statusData = statusRes.data as { status: string };

          if (statusData.status === "COMPLETED") {
            setStatus("completed");
            stopPolling();
          } else if (statusData.status === "EXPIRED") {
            setStatus("expired");
            stopPolling();
          }
        } catch (err) {
          console.error("Status check failed:", err);
        }
      }, 5000); // Poll every 5 seconds
    } catch (err: any) {
      setError(err.response?.data?.error || "Không thể tạo thanh toán");
      setStatus("error");
    } finally {
      setIsLoading(false);
    }
  }, [stopPolling]);

  const checkStatus = useCallback(async () => {
    if (!checkout) return;

    try {
      const response = await api.get(`/billing/sepay/status/${checkout.orderCode}`);
      const data = response.data as { status: string };

      if (data.status === "COMPLETED") {
        setStatus("completed");
        stopPolling();
      } else if (data.status === "EXPIRED") {
        setStatus("expired");
        stopPolling();
      }
    } catch (err: any) {
      console.error("Status check failed:", err);
    }
  }, [checkout, stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setCheckout(null);
    setStatus("idle");
    setError(null);
    setIsLoading(false);
  }, [stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return {
    isLoading,
    error,
    checkout,
    status,
    createCheckout,
    checkStatus,
    reset,
  };
}
