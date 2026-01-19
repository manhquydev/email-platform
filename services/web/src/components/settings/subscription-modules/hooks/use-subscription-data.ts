/**
 * Hook for loading subscription-related data
 * Loads payments, payment method, and packages
 */
import { useState, useEffect, useCallback } from "react";
import { api } from "../../../../utils/api";
import { useAuth } from "../../../../context/AuthContext";
import type { Payment, ServicePackage } from "../../../../types";

export interface PaymentMethod {
    id: string;
    brand: string;
    last4: string;
    expMonth?: number;
    expYear?: number;
    billingEmail?: string | null;
}

export interface UseSubscriptionDataReturn {
    payments: Payment[];
    paymentMethod: PaymentMethod | null;
    packages: ServicePackage[];
    loadingPayments: boolean;
    loadingPaymentMethod: boolean;
    loadingPackages: boolean;
    loadPayments: () => Promise<void>;
}

export function useSubscriptionData(): UseSubscriptionDataReturn {
    const { token } = useAuth();

    const [payments, setPayments] = useState<Payment[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
    const [packages, setPackages] = useState<ServicePackage[]>([]);

    const [loadingPayments, setLoadingPayments] = useState(false);
    const [loadingPaymentMethod, setLoadingPaymentMethod] = useState(false);
    const [loadingPackages, setLoadingPackages] = useState(false);

    const loadPayments = useCallback(async () => {
        setLoadingPayments(true);
        try {
            const data = await api<{ payments: Payment[] }>("/billing/payments", { token });
            setPayments(data?.payments || []);
        } catch (error) {
            console.error('[Subscription] Load payments failed:', error);
        } finally {
            setLoadingPayments(false);
        }
    }, [token]);

    const loadPaymentMethod = useCallback(async () => {
        setLoadingPaymentMethod(true);
        try {
            const data = await api<{ paymentMethod: PaymentMethod | null }>("/billing/payment-method", { token });
            setPaymentMethod(data?.paymentMethod || null);
        } catch (error) {
            console.error('[Subscription] Load payment method failed:', error);
        } finally {
            setLoadingPaymentMethod(false);
        }
    }, [token]);

    const loadPackages = useCallback(async () => {
        setLoadingPackages(true);
        try {
            const data = await api<{ packages: ServicePackage[] }>("/billing/packages");
            setPackages(data?.packages || []);
        } catch (error) {
            console.error('[Subscription] Load packages failed:', error);
        } finally {
            setLoadingPackages(false);
        }
    }, []);

    useEffect(() => {
        if (token) {
            loadPayments();
            loadPaymentMethod();
            loadPackages();
        }
    }, [token, loadPayments, loadPaymentMethod, loadPackages]);

    return {
        payments,
        paymentMethod,
        packages,
        loadingPayments,
        loadingPaymentMethod,
        loadingPackages,
        loadPayments
    };
}
